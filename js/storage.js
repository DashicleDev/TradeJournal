/*
 * storage.js — Data layer. Every trade, account, project, review and setting is one JSON "doc" in the Supabase
 * `docs` table (one row per doc, private per user via row-level security), mirrored to localStorage
 * so the app opens instantly and works offline. Also: sign-in, and the TJF bridge used for roles/admin.
 */
/* ---------- storage: Supabase (one row per doc, private per user) + local cache ---------- */
let docs = [];
// deleted trades wait in the bin (deletedAt) for BIN_DAYS before they are removed for good. They are kept out of docs, so nothing else ever sees them.
let bin = [];
const BIN_DAYS = 7;
const binSplit = list => ((bin = list.filter(d => d.deletedAt)), list.filter(d => !d.deletedAt));
let editingId = null;
let docsReady = false;
const ACTYPE = { challenge: "Challenge", funded: "Funded", demo: "Demo", personal: "Personal" };
const ACSTAT = { active: "Active", passed: "Passed", failed: "Failed", closed: "Closed" };
const acStat = a => a.status || (a.archived ? "closed" : "active");
let tab = "live",
  activeProject = null,
  btOpen = false,
  editingProj = null,
  confirmId = null;
let market = (() => {
  try {
    return localStorage.getItem("tj-market") || "fx";
  } catch {
    return "fx";
  }
})();
const mktOf = d => d.market || "fx";
const trades = () => docs.filter(d => !d.kind && mktOf(d) === market);
const projects = () =>
  docs.filter(d => d.kind === "project" && mktOf(d) === market).sort((a, b) => (b.created || 0) - (a.created || 0));
const projName = id => (docs.find(d => d.id === id && d.kind === "project") || {}).name;
const LS = "trade-journal-cache-v1";
function lsLoad() {
  try {
    return JSON.parse(localStorage.getItem(LS) || "[]");
  } catch {
    return [];
  }
}
function lsSave() {
  try {
    localStorage.setItem(LS, JSON.stringify(docs.concat(bin)));
  } catch {}
}
const CFG = window.TJ_CONFIG || {};
const SB =
  window.supabase && CFG.url && CFG.anonKey
    ? window.supabase.createClient(CFG.url, CFG.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
let ME = null;
docs = binSplit(lsLoad());
function setSync(t) {
  $("#sync").textContent = t;
}
const row = t => ({ user_id: ME, id: t.id, data: t, updated_at: new Date().toISOString() });
const PK = "trade-journal-pending-v1",
  PKD = "trade-journal-pending-del-v1";
const lsJSON = (k, def) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? def;
  } catch {
    return def;
  }
};
// unsent changes: id -> when it was changed here (ms). Older versions stored a plain list of ids.
const pending = new Map(
  (v => (Array.isArray(v) ? v.map(id => [id, Date.now()]) : Object.entries(v)))(lsJSON(PK, []))
);
// unsent deletes, so a trade deleted offline doesn't come back from the server
const pendingDel = new Set(lsJSON(PKD, []));
const savePending = () => {
  try {
    localStorage.setItem(PK, JSON.stringify(Object.fromEntries(pending)));
    localStorage.setItem(PKD, JSON.stringify([...pendingDel]));
  } catch {}
};
const markPending = (ids, on) => {
  ids.forEach(id => (on ? pending.set(id, Date.now()) : pending.delete(id)));
  savePending();
};
async function dbPut(t) {
  markPending([t.id], true);
  lsSave();
  if (!ME) return;
  const { error } = await SB.from("docs").upsert(row(t));
  if (!error) markPending([t.id], false);
  setSync(error ? "Save failed: " + (error.message || error.code || "error") : "Synced");
  if (error) console.warn(error);
}
async function dbPutMany(list) {
  markPending(
    list.map(t => t.id),
    true
  );
  lsSave();
  if (!ME) return;
  for (let i = 0; i < list.length; i += 200) {
    const part = list.slice(i, i + 200);
    const { error } = await SB.from("docs").upsert(part.map(row));
    if (!error)
      markPending(
        part.map(t => t.id),
        false
      );
    if (error) {
      setSync("Save failed: " + (error.message || error.code || "error"));
      console.warn(error);
      return;
    }
  }
  setSync("Synced");
}
async function dbDelMany(ids) {
  ids.forEach(id => pendingDel.add(id));
  markPending(ids, false); // an unsent edit must not bring it back
  lsSave();
  if (!ME) return;
  for (let i = 0; i < ids.length; i += 200) {
    const part = ids.slice(i, i + 200);
    const { error } = await SB.from("docs").delete().eq("user_id", ME).in("id", part);
    if (error) {
      setSync("Delete failed: " + (error.message || error.code || "error"));
      console.warn(error);
      return;
    }
    part.forEach(id => pendingDel.delete(id));
    savePending();
  }
}
// send what was changed or deleted while offline
async function flushPending() {
  if (!ME) return;
  if (pendingDel.size) await dbDelMany([...pendingDel]);
  const list = docs.concat(bin).filter(d => pending.has(d.id));
  if (list.length) await dbPutMany(list);
}
addEventListener("online", () => flushPending());
async function saveDoc(t) {
  upsertLocal(t);
  render();
  await dbPut(t);
}
const deleteDoc = id => deleteDocs([id]);
async function deleteDocs(ids) {
  const del = new Set(ids),
    gone = docs.concat(bin).filter(t => del.has(t.id));
  docs = docs.filter(t => !del.has(t.id));
  bin = bin.filter(t => !del.has(t.id));
  render();
  await dbDelMany([...del]);
  // their screenshots too, unless another doc still shows them (a duplicated trade shares the files)
  const left = new Set(shotIds(docs.concat(bin))),
    files = shotIds(gone).filter(f => !left.has(f));
  // shortcut: a failed removal (offline) is not retried and leaves the file behind; queue it like deletes if that matters
  for (let i = 0; i < files.length && ME; i += 200) {
    const { error } = await SB.storage.from("shots").remove(files.slice(i, i + 200).map(shotKey));
    if (error) console.warn(error);
  }
}
async function loadAll() {
  let all = [],
    from = 0;
  for (;;) {
    const { data, error } = await SB.from("docs")
      .select("id,data,updated_at")
      .range(from, from + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}
window.TJF = {
  // news events admins marked as heavy ("CUR|Title"); empty when offline or not set up
  newsMarks: async () => {
    if (!SB) return [];
    const { data, error } = await SB.from("news_heavy").select("key");
    return error ? [] : data.map(r => r.key);
  },
  newsMark: async (key, on) => {
    const { error } = on
      ? await SB.from("news_heavy").insert({ key })
      : await SB.from("news_heavy").delete().eq("key", key);
    if (error) throw error;
  },
  admin: async () => {
    if (!SB || !ME) return false;
    const { data, error } = await SB.rpc("is_app_admin");
    return !error && data === true;
  },
  me: async () => {
    if (!SB || !ME) return "user";
    const { data, error } = await SB.from("app_members").select("role").eq("user_id", ME).maybeSingle();
    if (error) throw error;
    return (data && data.role) || "pending"; // an account nobody has approved has no member row
  },
  roles: async () => {
    const { data, error } = await SB.from("app_roles").select("key,name,features,sort");
    if (error) throw error;
    return data || [];
  },
  saveRole: async r => {
    const { error } = await SB.from("app_roles").upsert(r);
    if (error) throw error;
  },
  delRole: async k => {
    const { error } = await SB.from("app_roles").delete().eq("key", k);
    if (error) throw error;
  },
  members: async () => {
    const { data, error } = await SB.rpc("admin_usage");
    if (error) throw error;
    return data || [];
  },
  setRole: async (id, role) => {
    const { error } = await SB.rpc("admin_set_role", { uid: id, new_role: role });
    if (error) throw error;
  },
  seen: async () => {
    if (SB && ME) await SB.rpc("touch_seen");
  },
};
function upsertLocal(t) {
  const i = docs.findIndex(d => d.id === t.id),
    j = bin.findIndex(d => d.id === t.id);
  if (t.deletedAt) {
    if (i >= 0) docs.splice(i, 1);
    if (j >= 0) bin[j] = t;
    else bin.push(t);
  } else {
    if (j >= 0) bin.splice(j, 1);
    if (i >= 0) docs[i] = t;
    else docs.push(t);
  }
}
// trades: delete moves them to the bin, restore brings them back, purgeBin removes the old ones for good
function binTrades(ids) {
  const s = new Set(ids),
    now = Date.now(),
    gone = docs.filter(d => s.has(d.id)).map(d => ({ ...d, deletedAt: now }));
  docs = docs.filter(d => !s.has(d.id));
  bin = bin.concat(gone);
  render();
  return dbPutMany(gone);
}
async function restoreTrade(id) {
  const t = bin.find(d => d.id === id);
  if (!t) return;
  const { deletedAt, ...rest } = t;
  bin = bin.filter(d => d.id !== id);
  docs.push(rest);
  render();
  await dbPut(rest);
  await ensureShotUrls([rest]);
  render();
}
const purgeBin = all => {
  const old = bin.filter(t => all || Date.now() - t.deletedAt > BIN_DAYS * 864e5).map(t => t.id);
  return old.length ? deleteDocs(old) : null;
};
async function startSession(user) {
  if (ME === user.id) return;
  ME = user.id;
  $("#auth").hidden = true;
  $("#signOut").hidden = false;
  $("#signOut").title = user.email || "";
  setSync("Connecting…");
  try {
    const rows = await loadAll(),
      local = docs.concat(bin);
    const at = new Map(rows.map(r => [r.id, Date.parse(r.updated_at) || 0]));
    // an unsent change here wins only when it's newer than the server copy (another device may have edited it since)
    const keep = local.filter(l => pending.has(l.id) && (!at.has(l.id) || pending.get(l.id) > at.get(l.id)));
    markPending(
      [...pending.keys()].filter(id => !keep.some(k => k.id === id)),
      false
    );
    docs = binSplit(
      rows
        .map(r => ({ ...r.data, id: r.id }))
        .filter(s => !pendingDel.has(s.id) && !keep.some(k => k.id === s.id))
        .concat(keep)
    );
    docsReady = true;
    lsSave();
    await flushPending();
    await purgeBin();
    await refreshShotUrls();
    if (!keep.length) setSync("Synced");
  } catch (e) {
    console.warn(e);
    setSync("Can't reach database: " + ((e && (e.message || e.code)) || "unknown error"));
    $("#sync").title = JSON.stringify(e);
  }
  render();
  SB.channel("docs-" + ME)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "docs", filter: "user_id=eq." + ME },
      async p => {
        const t = { ...p.new.data, id: p.new.id };
        upsertLocal(t);
        await ensureShotUrls([t]);
        lsSave();
        render();
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "docs", filter: "user_id=eq." + ME },
      async p => {
        const t = { ...p.new.data, id: p.new.id };
        upsertLocal(t);
        await ensureShotUrls([t]);
        lsSave();
        render();
        f2Remote(t);
      }
    )
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "docs" }, p => {
      if (p.old && p.old.id && (!p.old.user_id || p.old.user_id === ME)) {
        docs = docs.filter(d => d.id !== p.old.id);
        bin = bin.filter(d => d.id !== p.old.id);
        lsSave();
        render();
      }
    })
    .subscribe();
  if (typeof flagsLoad === "function") flagsLoad();
}
function showAuth(msg) {
  $("#auth").hidden = false;
  $("#signOut").hidden = true;
  if (msg) $("#authMsg").textContent = msg;
  setTimeout(() => $("#aEmail").focus(), 30);
}
let authMode = "in";
$("#aMode").onclick = () => {
  authMode = authMode === "in" ? "up" : "in";
  $("#aGo").textContent = authMode === "in" ? "Sign in" : "Create account";
  $("#aMode").textContent =
    authMode === "in" ? "First time here? Create your account" : "Already have an account? Sign in";
  $("#aPass").autocomplete = authMode === "in" ? "current-password" : "new-password";
  $("#authMsg").textContent =
    authMode === "in"
      ? "Sign in to your journal."
      : "Create your account. Use a password of at least 8 characters. It needs approval before you can use it.";
};
$("#authForm").onsubmit = async e => {
  e.preventDefault();
  const email = $("#aEmail").value.trim(),
    password = $("#aPass").value,
    go = $("#aGo");
  go.disabled = true;
  $("#authMsg").textContent = authMode === "in" ? "Signing in…" : "Creating your account…";
  try {
    if (authMode === "in") {
      const { data, error } = await SB.auth.signInWithPassword({ email, password });
      if (error) throw error;
      $("#aPass").value = "";
      await startSession(data.user);
    } else {
      const { data, error } = await SB.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: location.origin + location.pathname },
      });
      if (error) throw error;
      $("#aPass").value = "";
      if (data.session) await startSession(data.user);
      else $("#authMsg").textContent = "Account created. Open the confirmation email, then come back and sign in.";
    }
  } catch (err) {
    $("#authMsg").textContent = (err && err.message) || "Something went wrong. Try again.";
  }
  go.disabled = false;
};
$("#signOut").onclick = async () => {
  await SB.auth.signOut();
  ME = null;
  docs = [];
  bin = [];
  try {
    [LS, PK, PKD].forEach(k => localStorage.removeItem(k));
  } catch {}
  location.reload();
};
(async () => {
  if (!SB) {
    setSync("Not connected to a database yet");
    return;
  }
  const { data } = await SB.auth.getSession();
  if (data && data.session) startSession(data.session.user);
  else {
    docs = [];
    bin = [];
    showAuth();
  }
  SB.auth.onAuthStateChange((ev, sess) => {
    if (ev === "SIGNED_IN" && sess) startSession(sess.user);
  });
})();
