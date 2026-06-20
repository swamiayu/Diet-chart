// ---- State ----
const state = {
  lang: "mr",
  languages: [],             // [{code, native, label}]
  foods: [],                 // [{_id, name, category, name_en, category_en, categoryId}]
  categories: [],            // [{_id, name_en, name, foodCount}]
  cls: new Map(),            // foodId -> 'pathya' | 'alpamatra' | 'apathya'
  search: "",
  cat: "",                   // category_en filter ("" = all)
};
const nativeName = (code) => (state.languages.find((l) => l.code === code) || {}).native || code;
const CYCLE = { pathya: "alpamatra", alpamatra: "apathya", apathya: "pathya" };
const MARK = { pathya: "✓", alpamatra: "•", apathya: "✕" };

const $ = (s) => document.querySelector(s);
const api = (p, opt) => fetch(p, opt);

// ---- Toast ----
let toastT;
function toast(msg, kind = "") {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast " + kind; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3000);
}

// ---- Languages ----
async function loadLanguages() {
  const { languages } = await api("/api/languages").then((r) => r.json());
  state.languages = languages || [];
  const wrap = $("#langSwitch");
  wrap.innerHTML = "";
  languages.forEach((l) => {
    const b = document.createElement("button");
    b.textContent = l.native;
    b.dataset.code = l.code;
    b.className = l.code === state.lang ? "active" : "";
    b.onclick = () => switchLang(l.code);
    wrap.appendChild(b);
  });
}

async function switchLang(code) {
  if (code === state.lang) return;
  state.lang = code;
  document.querySelectorAll("#langSwitch button").forEach((b) =>
    b.classList.toggle("active", b.dataset.code === code)
  );
  updateAdviceLangUI(true); // language changed -> clear stale translation
  await loadCategories();
  await loadFoods(); // classification map is preserved (keyed by id)
}

// Show/hide and label the additional-advice translation field for the current
// language (hidden for English, since the English field prints directly).
function updateAdviceLangUI(clear) {
  const block = $("#addAdviceTl");
  const label = $("#addAdviceLangLabel");
  const field = $("#addAdviceTrField");
  if (!block) return;
  const isEn = state.lang === "en";
  block.hidden = isEn;
  if (label) label.textContent = "Translated · " + nativeName(state.lang);
  if (field) {
    field.dataset.lang = state.lang;
    field.placeholder = `Translated advice in ${nativeName(state.lang)}…`;
    if (clear) field.value = "";
  }
}

async function translateAdditionalAdvice(btn) {
  const src = $("#patientForm [name=generalAdvice]").value.trim();
  if (!src) { toast("Type the additional advice first", "err"); return; }
  if (state.lang === "en") return;
  const data = await api("/api/translate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: src, lang: state.lang }),
  }).then((r) => r.json()).catch(() => null);
  if (data?.translated) {
    $("#addAdviceTrField").value = data.translated;
    toast("Translated — edit if needed", "ok");
  } else {
    toast("Translation failed", "err");
  }
}

// ---- Categories ----
async function loadCategories() {
  const data = await api(`/api/categories?lang=${state.lang}&withCounts=1`).then((r) => r.json());
  state.categories = data.categories || [];
  buildCatFilter();
  buildAddFoodCatOptions();
}

function buildCatFilter() {
  const sel = $("#catFilter");
  const prev = state.cat;
  sel.innerHTML = `<option value="">All categories</option>` +
    state.categories
      .map((c) => `<option value="${c.name_en}">${c.name} (${c.foodCount})</option>`).join("");
  sel.value = prev;
}

function buildAddFoodCatOptions() {
  const sel = $("#addFoodCat");
  if (!sel) return;
  sel.innerHTML =
    state.categories.map((c) => `<option value="${c.name_en}">${c.name}</option>`).join("") +
    `<option value="__new__">＋ New category…</option>`;
}

// ---- Foods ----
async function loadFoods() {
  $("#foodArea").innerHTML = `<p class="hint">Loading foods…</p>`;
  const data = await api(`/api/foods?lang=${state.lang}`).then((r) => r.json());
  state.foods = data.items || [];
  // default every food to pathya the first time we see it
  state.foods.forEach((f) => { if (!state.cls.has(f._id)) state.cls.set(f._id, "pathya"); });
  render();
}

function render() {
  const area = $("#foodArea");
  const q = state.search.trim().toLowerCase();
  const list = state.foods.filter((f) => {
    if (state.cat && f.category_en !== state.cat) return false;
    if (q && !(`${f.name} ${f.name_en}`.toLowerCase().includes(q))) return false;
    return true;
  });

  if (!list.length) { area.innerHTML = `<p class="hint">No matching foods.</p>`; updateCounts(); return; }

  // group by translated category
  const groups = new Map();
  list.forEach((f) => {
    if (!groups.has(f.category)) groups.set(f.category, []);
    groups.get(f.category).push(f);
  });

  area.innerHTML = "";
  for (const [cat, items] of groups) {
    const g = document.createElement("div");
    g.className = "cat-group";
    g.innerHTML = `<div class="cat-title">${cat}</div>`;
    const chips = document.createElement("div");
    chips.className = "chips";
    items.forEach((f) => chips.appendChild(makeChip(f)));
    g.appendChild(chips);
    area.appendChild(g);
  }
  updateCounts();
}

function makeChip(f) {
  const st = state.cls.get(f._id) || "pathya";
  const c = document.createElement("button");
  c.type = "button";
  c.className = "chip";
  c.dataset.state = st;
  c.title = f.name_en;
  c.innerHTML = `<span class="mark">${MARK[st]}</span> ${f.name} <span class="en">${f.name_en}</span>`;
  c.onclick = () => {
    const next = CYCLE[state.cls.get(f._id) || "pathya"];
    state.cls.set(f._id, next);
    c.dataset.state = next;
    c.querySelector(".mark").textContent = MARK[next];
    updateCounts();
  };
  return c;
}

function updateCounts() {
  let p = 0, a = 0, x = 0;
  state.cls.forEach((v) => (v === "pathya" ? p++ : v === "alpamatra" ? a++ : x++));
  $("#cPathya").textContent = p;
  $("#cAlpa").textContent = a;
  $("#cApathya").textContent = x;
}

// ---- Build request payload ----
function patientPayload() {
  const fd = new FormData($("#patientForm"));
  const get = (k) => (fd.get(k) || "").toString().trim();
  const items = state.foods.map((f) => ({
    foodItemId: f._id,
    classification: state.cls.get(f._id) || "pathya",
  }));
  // Reviewed translation of the additional advice for the chosen language.
  const addTr = ($("#addAdviceTrField")?.value || "").trim();
  const generalAdviceTr = state.lang !== "en" && addTr ? { [state.lang]: addTr } : undefined;
  return {
    patient: { name: get("name"), age: get("age") ? Number(get("age")) : undefined, gender: get("gender"), prakriti: get("prakriti") },
    doctorName: get("doctorName"),
    clinicName: get("clinicName"),
    diagnosis: get("diagnosis"),
    generalAdvice: get("generalAdvice"),
    generalAdviceTr,
    language: state.lang,
    items,
  };
}

// ---- Download PDF (preview, no save) ----
async function downloadPdf() {
  const body = patientPayload();
  if (!body.patient.name) { toast("Enter patient name first", "err"); return; }
  const btn = $("#btnPdf"); btn.disabled = true; const old = btn.textContent; btn.textContent = "Generating…";
  try {
    const res = await Auth.fetch("/api/diet-plans/preview-pdf", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "PDF failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diet-plan-${body.patient.name.replace(/[^a-z0-9]+/gi, "_")}-${state.lang}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("PDF downloaded", "ok");
  } catch (e) {
    toast(e.message, "err");
  } finally {
    btn.disabled = false; btn.textContent = old;
  }
}

// ---- Save plan ----
async function savePlan() {
  const body = patientPayload();
  if (!body.patient.name) { toast("Enter patient name first", "err"); return; }
  const btn = $("#btnSave"); btn.disabled = true;
  try {
    const res = await Auth.fetch("/api/diet-plans", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    toast("Plan saved ✓", "ok");
  } catch (e) {
    toast(e.message, "err");
  } finally {
    btn.disabled = false;
  }
}

// ---- Add food / category modal ----
function openModal() { $("#modal").hidden = false; }
function clearTl(containerSel) {
  document.querySelectorAll(`${containerSel} input[data-lang]`).forEach((i) => (i.value = ""));
}
function closeModal() {
  $("#modal").hidden = true;
  $("#addFoodForm").reset(); $("#addCatForm").reset();
  clearTl("#foodTl"); clearTl("#catTl");
  $("#newCatWrap").hidden = true;
}

// Collect the (possibly edited) translation fields into { mr, hi, gu }.
function collectTl(containerSel) {
  const out = {};
  document.querySelectorAll(`${containerSel} input[data-lang]`).forEach((inp) => {
    const v = inp.value.trim();
    if (v) out[inp.dataset.lang] = v;
  });
  return out;
}

// Fetch MyMemory suggestions for all languages and fill the fields (editable).
async function runTranslate(nameVal, containerSel, btn) {
  if (!nameVal) { toast("Enter the English name first", "err"); return; }
  const old = btn.textContent; btn.disabled = true; btn.textContent = "Translating…";
  try {
    const data = await api(`/api/translate/suggest?text=${encodeURIComponent(nameVal)}`).then((r) => r.json());
    document.querySelectorAll(`${containerSel} input[data-lang]`).forEach((inp) => {
      const t = data.translations?.[inp.dataset.lang];
      if (t) inp.value = t;
    });
    toast("Suggestions filled — edit anything wrong, then save", "ok");
  } catch (e) {
    toast("Translate failed: " + e.message, "err");
  } finally {
    btn.disabled = false; btn.textContent = old;
  }
}

async function addFood(e) {
  e.preventDefault();
  const name = $("#addFoodForm [name=name]").value.trim();
  let category = $("#addFoodCat").value;
  if (category === "__new__") category = $("#addFoodNewCat").value.trim();
  if (!name || !category) { toast("Food name and category required", "err"); return; }

  const btn = e.submitter; btn.disabled = true;
  try {
    const res = await Auth.fetch("/api/foods", {
      method: "POST", headers: { "Content-Type": "application/json" },
      // name-based category: backend creates it if new. translations are the
      // doctor-reviewed values (stored in DB, authoritative over MyMemory).
      body: JSON.stringify({ name, category, translations: collectTl("#foodTl") }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not add food");
    toast(`Added “${name}” ✓`, "ok");
    closeModal();
    await loadCategories();
    await loadFoods();
  } catch (err) {
    toast(err.message, "err");
  } finally {
    btn.disabled = false;
  }
}

async function addCategory(e) {
  e.preventDefault();
  const name = $("#addCatForm [name=name]").value.trim();
  if (!name) { toast("Category name required", "err"); return; }
  const btn = e.submitter; btn.disabled = true;
  try {
    const res = await Auth.fetch("/api/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, translations: collectTl("#catTl") }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not add category");
    toast(`Added category “${name}” ✓`, "ok");
    $("#addCatForm").reset(); clearTl("#catTl");
    await loadCategories(); // refresh dropdowns so it's selectable immediately
  } catch (err) {
    toast(err.message, "err");
  } finally {
    btn.disabled = false;
  }
}

// ---- Wire up ----
$("#search").addEventListener("input", (e) => { state.search = e.target.value; render(); });
$("#catFilter").addEventListener("change", (e) => { state.cat = e.target.value; render(); });
$("#btnPdf").addEventListener("click", downloadPdf);
$("#btnSave").addEventListener("click", savePlan);
$("#btnAdd").addEventListener("click", openModal);
$("#modalClose").addEventListener("click", closeModal);
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
$("#addFoodCat").addEventListener("change", (e) => {
  $("#newCatWrap").hidden = e.target.value !== "__new__";
});
$("#foodTranslateBtn").addEventListener("click", (e) =>
  runTranslate($("#addFoodForm [name=name]").value.trim(), "#foodTl", e.currentTarget)
);
$("#catTranslateBtn").addEventListener("click", (e) =>
  runTranslate($("#addCatForm [name=name]").value.trim(), "#catTl", e.currentTarget)
);
$("#addFoodForm").addEventListener("submit", addFood);
$("#addCatForm").addEventListener("submit", addCategory);
$("#addAdviceTranslateBtn").addEventListener("click", (e) => translateAdditionalAdvice(e.currentTarget));

(async function init() {
  // Gate the page: must be signed in.
  const doctor = await Auth.requireLogin();
  if (!doctor) return; // requireLogin already redirected to /login

  Auth.renderUserChip($("#userChip"));
  // Prefill the printed doctor/clinic from the signed-in account.
  const dn = $("#patientForm [name=doctorName]");
  const cn = $("#patientForm [name=clinicName]");
  if (dn && doctor.name) dn.value = doctor.name;
  if (cn && doctor.clinicName) cn.value = doctor.clinicName;

  const stdHint = $("#stdAdviceHint");
  const toggleStdHint = (adv) => { if (stdHint) stdHint.hidden = !(adv && adv.trim()); };
  toggleStdHint(doctor.defaultAdvice);

  // When clinic name / standard advice is saved in the profile modal, reflect it.
  window.addEventListener("profile-updated", (e) => {
    if (cn && e.detail?.clinicName) cn.value = e.detail.clinicName;
    toggleStdHint(e.detail?.defaultAdvice);
  });

  try {
    await loadLanguages();
    updateAdviceLangUI(false); // label/show the advice-translation field for the current language
    await loadCategories();
    await loadFoods();
  } catch (e) {
    $("#foodArea").innerHTML = `<p class="hint">Could not load data. Is the server running and seeded? (${e.message})</p>`;
  }
})();
