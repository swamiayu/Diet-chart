const $ = (s) => document.querySelector(s);
let allPlans = [];
let LANGS = [{ code: "mr", native: "मराठी" }, { code: "hi", native: "हिन्दी" }, { code: "gu", native: "ગુજરાતી" }, { code: "en", native: "English" }];

let toastT;
function toast(msg, kind = "") {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast " + kind; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3000);
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function langOptions(selected) {
  return LANGS.map((l) => `<option value="${l.code}" ${l.code === selected ? "selected" : ""}>${l.native}</option>`).join("");
}

function render(list) {
  const wrap = $("#plansList");
  $("#planCount").textContent = `${list.length} plan${list.length === 1 ? "" : "s"}`;
  if (!list.length) {
    wrap.innerHTML = `<div class="empty-state">
      <p>No saved plans yet.</p>
      <a class="btn primary" href="/app">Create your first plan</a>
    </div>`;
    return;
  }
  wrap.innerHTML = "";
  for (const p of list) {
    const card = document.createElement("div");
    card.className = "plan-card";
    card.innerHTML = `
      <div class="pc-top">
        <div class="pc-name">${esc(p.patient?.name || "Patient")}</div>
        <div class="pc-date">${fmtDate(p.date || p.createdAt)}</div>
      </div>
      <div class="pc-meta">
        ${p.patient?.age ? `<span>${esc(String(p.patient.age))} yrs</span>` : ""}
        ${p.diagnosis ? `<span>· ${esc(p.diagnosis)}</span>` : ""}
      </div>
      <div class="pc-foot">
        <span class="pc-count">${p.itemCount || 0} item${p.itemCount === 1 ? "" : "s"}</span>
        <div class="pc-actions">
          <select class="pc-lang search">${langOptions(p.language || "mr")}</select>
          <button class="btn primary sm pc-pdf" type="button">⬇ PDF</button>
        </div>
      </div>`;
    card.querySelector(".pc-pdf").onclick = (e) =>
      downloadPdf(p._id, card.querySelector(".pc-lang").value, p.patient?.name, e.currentTarget);
    wrap.appendChild(card);
  }
}

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function downloadPdf(id, lang, name, btn) {
  const old = btn.textContent; btn.disabled = true; btn.textContent = "…";
  try {
    const res = await Auth.fetch(`/api/diet-plans/${id}/pdf?lang=${lang}`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "PDF failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diet-plan-${(name || "patient").replace(/[^a-z0-9]+/gi, "_")}-${lang}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("PDF downloaded", "ok");
  } catch (e) {
    toast(e.message, "err");
  } finally {
    btn.disabled = false; btn.textContent = old;
  }
}

$("#search").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  render(allPlans.filter((p) =>
    `${p.patient?.name || ""} ${p.diagnosis || ""}`.toLowerCase().includes(q)
  ));
});

(async function init() {
  const doctor = await Auth.requireLogin();
  if (!doctor) return;
  Auth.renderUserChip($("#userChip"));

  // languages (best-effort; falls back to defaults)
  try {
    const { languages } = await fetch("/api/languages").then((r) => r.json());
    if (Array.isArray(languages) && languages.length) LANGS = languages;
  } catch {}

  try {
    const data = await Auth.fetch("/api/diet-plans").then((r) => r.json());
    allPlans = data.plans || [];
    render(allPlans);
  } catch (e) {
    $("#plansList").innerHTML = `<p class="hint">Could not load plans (${e.message})</p>`;
  }
})();
