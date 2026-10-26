// Shared helpers
const store = {
  get token() { return localStorage.getItem("token"); },
  get role() { return localStorage.getItem("role"); },
  get name() { return localStorage.getItem("name"); },
  save(d) { localStorage.setItem("token", d.token); localStorage.setItem("role", d.role); localStorage.setItem("name", d.name); },
  clear() { localStorage.clear(); }
};

async function api(url, method = "GET", body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + store.token },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (res.status === 401) { store.clear(); location.href = "/"; }
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function requireRole(role) {
  if (!store.token || store.role !== role) location.href = "/";
  document.getElementById("who").textContent = store.name;
}

function logout() { store.clear(); location.href = "/"; }

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
function safeLink(l) { return /^https?:\/\//i.test(l || "") ? l : ""; }

// ---------- Login page ----------
function initLogin() {
  if (store.token) location.href = store.role === "teacher" ? "/teacher.html" : "/student.html";
  let mode = "login";
  const f = (id) => document.getElementById(id);
  const msg = f("msg");

  f("toggle").onclick = () => {
    mode = mode === "login" ? "register" : "login";
    f("title").textContent = mode === "login" ? "Log in" : "Create account";
    f("submit").textContent = mode === "login" ? "Log in" : "Register";
    f("toggle").textContent = mode === "login" ? "New here? Create an account" : "Have an account? Log in";
    f("extra").style.display = mode === "register" ? "block" : "none";
    msg.textContent = "";
  };
  f("role").onchange = () => { f("codeBox").style.display = f("role").value === "teacher" ? "block" : "none"; };

  f("submit").onclick = async () => {
    msg.textContent = "";
    try {
      const body = { email: f("email").value, password: f("password").value };
      if (mode === "register") Object.assign(body, { name: f("name").value, role: f("role").value, teacherCode: f("code").value });
      const data = await api("/api/" + mode, "POST", body);
      store.save(data);
      location.href = data.role === "teacher" ? "/teacher.html" : "/student.html";
    } catch (e) { msg.textContent = e.message; }
  };
}

// ---------- Student page ----------
async function initStudent() {
  requireRole("student");
  const msg = document.getElementById("msg");
  document.getElementById("send").onclick = async () => {
    msg.textContent = "";
    try {
      await api("/api/assignments", "POST", {
        title: document.getElementById("title").value,
        description: document.getElementById("desc").value,
        link: document.getElementById("link").value
      });
      ["title", "desc", "link"].forEach((i) => (document.getElementById(i).value = ""));
      loadMine();
    } catch (e) { msg.textContent = e.message; }
  };
  loadMine();
}

async function loadMine() {
  const list = await api("/api/assignments/mine");
  const box = document.getElementById("list");
  if (!list.length) { box.innerHTML = '<p class="empty">You have not submitted anything yet.</p>'; return; }
  box.innerHTML = list.map((a) => `
    <div class="item">
      <h3>${esc(a.title)} <span class="badge ${a.status}">${a.status}</span></h3>
      <div class="meta">Submitted ${fmt(a.createdAt)}</div>
      ${a.description ? `<p>${esc(a.description)}</p>` : ""}
      ${safeLink(a.link) ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">Open file link</a>` : ""}
      ${a.status === "graded" ? `<p><strong>Marks: ${a.marks}/100</strong><br>${esc(a.feedback) || "No feedback"}</p>` : ""}
    </div>`).join("");
}

// ---------- Teacher page ----------
async function initTeacher() {
  requireRole("teacher");
  loadAll();
}

async function loadAll() {
  const list = await api("/api/assignments");
  const box = document.getElementById("list");
  if (!list.length) { box.innerHTML = '<p class="empty">No submissions yet.</p>'; return; }
  box.innerHTML = list.map((a) => `
    <div class="item">
      <h3>${esc(a.title)} <span class="badge ${a.status}">${a.status}</span></h3>
      <div class="meta">${esc(a.student?.name)} (${esc(a.student?.email)}) · ${fmt(a.createdAt)}</div>
      ${a.description ? `<p>${esc(a.description)}</p>` : ""}
      ${safeLink(a.link) ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">Open file link</a>` : ""}
      <div class="row">
        <div><label>Marks (0-100)</label><input type="number" min="0" max="100" id="m-${a._id}" value="${a.marks ?? ""}"></div>
        <div><label>Feedback</label><input id="f-${a._id}" value="${esc(a.feedback)}"></div>
      </div>
      <button onclick="grade('${a._id}')">Save grade</button>
      <div class="msg" id="e-${a._id}"></div>
    </div>`).join("");
}

async function grade(id) {
  const err = document.getElementById("e-" + id);
  try {
    await api(`/api/assignments/${id}/grade`, "PUT", {
      marks: Number(document.getElementById("m-" + id).value),
      feedback: document.getElementById("f-" + id).value
    });
    loadAll();
  } catch (e) { err.textContent = e.message; }
}
