/*
 * admin.js — Admin window (admins only): create roles and pick their features, assign roles to users,
 * see how much each user uses the journal.
 */
const admMsg = m => {
  const e = $("#admStat");
  if (e) e.textContent = m || "";
};
function dayAgo(v) {
  if (!v) return "Never";
  const t = new Date(),
    d = new Date(v + "T12:00:00"),
    n = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12) - d) / 864e5);
  return n <= 0
    ? "Today"
    : n === 1
      ? "Yesterday"
      : n < 7
        ? n + " days ago"
        : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function admRender() {
  $("#openAdmin").hidden = !APPADMIN;
  if (!APPADMIN) {
    $("#admSheet").hidden = true;
    return;
  }
  const ub = document.querySelector('[data-admtab="users"]');
  if (ub) ub.hidden = !TJF.members;
  document.querySelectorAll("[data-admtab]").forEach(b => b.setAttribute("aria-selected", b.dataset.admtab === admTab));
  document.querySelectorAll("[data-admpane]").forEach(p => (p.hidden = p.dataset.admpane !== admTab));
  const L = ROLES || [];
  if (!L.some(r => r.key === admRole)) admRole = (L[0] || {}).key;
  const cnt = k => (USERS ? USERS.filter(u => u.role === k).length : null);
  $("#roleList").innerHTML =
    L.map(r => {
      const n = cnt(r.key);
      return `<button type="button" data-role="${esc(r.key)}" aria-selected="${r.key === admRole}"><span>${esc(r.name)}</span>${n == null ? "" : `<small>${n}</small>`}</button>`;
    }).join("") + `<button type="button" class="rnew" data-act="rolenew">+ New role</button>`;
  const r = L.find(x => x.key === admRole),
    fixed = r && (r.key === "admin" || r.key === "user");
  $("#roleEdit").innerHTML = r
    ? `<label class="f"><span>Name</span><input type="text" id="roleName" value="${esc(r.name)}" maxlength="40"></label>
    <p class="hint" style="margin:0">${r.key === "admin" ? "Admins also get this Admin menu." : r.key === "user" ? "Everyone who signs up starts as User." : "Features people with this role get."}</p>
    <div class="rfeats">${FEATS.map(f => `<label class="rfeat"><span><b>${f[1]}</b><small>${f[2]}</small></span><input type="checkbox" data-rfeat="${f[0]}" ${r.features && r.features[f[0]] ? "checked" : ""}></label>`).join("")}</div>
    ${fixed ? "" : `<div class="rolefoot">${roleDel ? `<span class="hint">Delete ${esc(r.name)}?${cnt(r.key) ? ` Its ${cnt(r.key)} ${cnt(r.key) === 1 ? "person goes" : "people go"} back to User.` : ""}</span><button type="button" class="btn small dangerb" data-act="roledel2">Delete</button><button type="button" class="btn small ghost" data-act="roledelno">Cancel</button>` : `<button type="button" class="btn small ghost danger" data-act="roledel">Delete role</button>`}</div>`}`
    : "";
  usersRender();
}
function usersRender() {
  const box = $("#userList");
  if (!box) return;
  if (!USERS) {
    box.innerHTML = '<p class="hint">Loading…</p>';
    return;
  }
  const L = ROLES || [],
    list = [...USERS].sort(
      (a, b) => (b.last_day || "").localeCompare(a.last_day || "") || (b.days30 || 0) - (a.days30 || 0)
    );
  box.innerHTML = `<table class="utab"><thead><tr><th>User</th><th>Last active</th><th>Active days<small> · 30d</small></th><th>Trades</th><th>Role</th></tr></thead><tbody>${list
    .map(u => {
      const me = u.id === ME;
      return `<tr><td>${esc(u.email || "(no email)")}${me ? ' <span class="hint">· you</span>' : ""}<small class="hint ujoin">Joined ${new Date(u.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</small></td><td class="seen">${dayAgo(u.last_day)}</td><td class="num">${u.days30 || 0}</td><td class="num">${u.trades || 0}</td>
    <td><select data-urole="${esc(u.id)}" ${me ? "disabled" : ""} aria-label="Role for ${esc(u.email || "")}">${L.map(r => `<option value="${esc(r.key)}" ${u.role === r.key ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></td></tr>`;
    })
    .join("")}</tbody></table>`;
}
async function usersLoad() {
  if (!APPADMIN || !TJF.members) {
    USERS = null;
    return;
  }
  try {
    USERS = await TJF.members();
  } catch (e) {
    console.warn("users", e);
    USERS = [];
  }
  admRender();
}
async function roleSave(r, msg) {
  admMsg("Saving…");
  try {
    await TJF.saveRole({ key: r.key, name: r.name, features: r.features || {}, sort: r.sort ?? 100 });
    admMsg(msg || "Saved");
  } catch (e) {
    admMsg("Couldn't save: " + (e.message || e));
  }
  const me = (ROLES || []).find(x => x.key === MYROLE);
  if (me) {
    MYF = me.features || {};
    try {
      localStorage.setItem("tj-myfeat", JSON.stringify(MYF));
    } catch {}
    useMarketDefs();
    applySettings();
    render();
  }
}
document.addEventListener("click", async e => {
  const b = e.target.closest && e.target.closest("#admSheet [data-role],#admSheet [data-act],#admSheet [data-admtab]");
  if (!b) return;
  if (b.dataset.admtab) {
    admTab = b.dataset.admtab;
    admMsg("");
    admRender();
    return;
  }
  if (b.dataset.role) {
    admRole = b.dataset.role;
    roleDel = false;
    admMsg("");
    admRender();
    return;
  }
  const a = b.dataset.act;
  if (a === "rolenew") {
    let n = 1;
    while ((ROLES || []).some(r => r.name === "New role" + (n > 1 ? " " + n : ""))) n++;
    const r = { key: "r" + Date.now().toString(36), name: "New role" + (n > 1 ? " " + n : ""), features: {}, sort: 60 };
    ROLES = roleSort([...(ROLES || []), r]);
    admRole = r.key;
    roleDel = false;
    admRender();
    await roleSave(r, "Role added");
    const i = $("#roleName");
    if (i) {
      i.focus();
      i.select();
    }
  } else if (a === "roledel") {
    roleDel = true;
    admRender();
  } else if (a === "roledelno") {
    roleDel = false;
    admRender();
  } else if (a === "roledel2") {
    const k = admRole;
    admMsg("Deleting…");
    try {
      await TJF.delRole(k);
      ROLES = ROLES.filter(r => r.key !== k);
      (USERS || []).forEach(u => {
        if (u.role === k) u.role = "user";
      });
      roleDel = false;
      admMsg("Role deleted");
    } catch (er) {
      admMsg("Couldn't delete: " + (er.message || er));
    }
    admRender();
  }
});
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.matches && t.matches("#admSheet [data-rfeat]")) {
    const r = (ROLES || []).find(x => x.key === admRole);
    if (!r) return;
    r.features = { ...(r.features || {}), [t.dataset.rfeat]: t.checked };
    await roleSave(r);
  } else if (t.matches && t.matches("#roleName")) {
    const r = (ROLES || []).find(x => x.key === admRole),
      v = t.value.trim();
    if (!r || !v || v === r.name) {
      if (r) t.value = r.name;
      return;
    }
    r.name = v.slice(0, 40);
    roleSort(ROLES);
    admRender();
    await roleSave(r);
  } else if (t.matches && t.matches("#admSheet [data-urole]")) {
    const u = (USERS || []).find(x => x.id === t.dataset.urole);
    if (!u) return;
    admMsg("Saving…");
    try {
      await TJF.setRole(u.id, t.value);
      u.role = t.value;
      admMsg("Saved");
    } catch (er) {
      admMsg("Couldn't save: " + (er.message || er));
    }
    admRender();
  }
});
