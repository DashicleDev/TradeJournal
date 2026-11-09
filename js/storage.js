/*
 * storage.js — Data layer. Every trade, account, project, review and setting is one JSON "doc" in the Supabase
 * `docs` table (one row per doc, private per user via row-level security), mirrored to localStorage
 * so the app opens instantly and works offline. Also: sign-in, and the TJF bridge used for roles/admin.
 */
/* ---------- storage: Supabase (one row per doc, private per user) + local cache ---------- */
let docs = [];
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
    localStorage.setItem(LS, JSON.stringify(docs));
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
docs = lsLoad();
function setSync(t) {
  $("#sync").textContent = t;
}
const row = t => ({ user_id: ME, id: t.id, data: t, updated_at: new Date().toISOString() });
const PK = "trade-journal-pending-v1";
const pending = new Set(
  (() => {
    try {
      return JSON.parse(localStorage.getItem(PK) || "[]");
    } catch {
      return [];
    }
  })()
);
const savePending = () => {
  try {
    localStorage.setItem(PK, JSON.stringify([...pending]));
  } catch {}
};
const markPending = (ids, on) => {
  ids.forEach(id => (on ? pending.add(id) : pending.delete(id)));
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
async function dbDel(id) {
  lsSave();
  if (!ME) return;
  const { error } = await SB.from("docs").delete().eq("user_id", ME).eq("id", id);
  if (error) console.warn(error);
}
async function saveDoc(t) {
  const i = docs.findIndex(x => x.id === t.id);
  if (i >= 0) docs[i] = t;
  else docs.push(t);
  render();
  await dbPut(t);
}
async function deleteDoc(id) {
  docs = docs.filter(t => t.id !== id);
  render();
  await dbDel(id);
}
async function loadAll() {
  let all = [],
    from = 0;
  for (;;) {
    const { data, error } = await SB.from("docs")
      .select("id,data")
      .range(from, from + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all.map(r => ({ ...r.data, id: r.id }));
}
window.TJF = {
  admin: async () => {
    if (!SB || !ME) return false;
    const { data, error } = await SB.rpc("is_app_admin");
    return !error && data === true;
  },
  me: async () => {
    if (!SB || !ME) return "user";
    const { data, error } = await SB.from("app_members").select("role").eq("user_id", ME).maybeSingle();
    if (error) throw error;
    return (data && data.role) || "user";
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
  const i = docs.findIndex(d => d.id === t.id);
  if (i >= 0) docs[i] = t;
  else docs.push(t);
}
async function startSession(user) {
  if (ME === user.id) return;
  ME = user.id;
  $("#auth").hidden = true;
  $("#signOut").hidden = false;
  $("#signOut").title = user.email || "";
  setSync("Connecting…");
  try {
    const server = await loadAll(),
      local = docs.slice();
    const keep = local.filter(l => pending.has(l.id));
    docs = server.filter(s => !keep.some(k => k.id === s.id)).concat(keep);
    docsReady = true;
    lsSave();
    if (keep.length) await dbPutMany(keep);
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
      }
    )
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "docs" }, p => {
      if (p.old && p.old.id && (!p.old.user_id || p.old.user_id === ME)) {
        docs = docs.filter(d => d.id !== p.old.id);
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
      : "Create the account for your journal. Use a password of at least 8 characters.";
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
  try {
    localStorage.removeItem(LS);
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
    showAuth();
  }
  SB.auth.onAuthStateChange((ev, sess) => {
    if (ev === "SIGNED_IN" && sess) startSession(sess.user);
  });
})();
