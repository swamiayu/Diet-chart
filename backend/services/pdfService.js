import puppeteer from "puppeteer";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SUPPORTED_LANGUAGES, SOURCE_LANG } from "../data/languages.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = join(__dirname, "..", "assets", "fonts");

// Load the bundled Noto fonts ONCE and inline them as base64 @font-face rules.
// Self-hosting (vs. a Google Fonts @import) makes PDF rendering deterministic and
// network-independent, and guarantees Devanagari/Gujarati glyphs are embedded.
// Static (single-weight) fonts are used on purpose: Chromium/Skia subsets them
// cleanly into the PDF (~tens of KB), whereas VARIABLE fonts get embedded whole
// (~2 MB each). Keeping PDFs small while still embedding the scripts.
function loadFontFace(family, file, weight) {
  try {
    const b64 = readFileSync(join(FONT_DIR, file)).toString("base64");
    return `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;` +
      `src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
  } catch (e) {
    console.warn(`⚠️  Font ${file} not loaded (${e.message}). Run the font download step in README.`);
    return "";
  }
}

const FONT_FACE_CSS = [
  loadFontFace("Noto Sans", "NotoSans-Regular.ttf", 400),
  loadFontFace("Noto Sans", "NotoSans-Bold.ttf", 700),
  loadFontFace("Noto Sans Devanagari", "NotoSansDevanagari-Regular.ttf", 400),
  loadFontFace("Noto Sans Devanagari", "NotoSansDevanagari-Bold.ttf", 700),
  loadFontFace("Noto Sans Gujarati", "NotoSansGujarati-Regular.ttf", 400),
  loadFontFace("Noto Sans Gujarati", "NotoSansGujarati-Bold.ttf", 700),
].join("\n");

// Section colour scheme + labels (with native-script headings per language).
const SECTIONS = {
  pathya: {
    order: 1,
    accent: "#2e7d32",
    bg: "#e8f5e9",
    border: "#a5d6a7",
    symbol: "✓",
    label: { en: "Pathya (Recommended)", mr: "पथ्य (सेवन करावे)", hi: "पथ्य (सेवन करें)", gu: "પથ્ય (લેવાય)" },
  },
  alpamatra: {
    order: 2,
    accent: "#ef6c00",
    bg: "#fff3e0",
    border: "#ffcc80",
    symbol: "•",
    label: { en: "Alpa-matra (In small quantity)", mr: "अल्प मात्रा (कमी प्रमाणात)", hi: "अल्प मात्रा (कम मात्रा में)", gu: "અલ્પ માત્રા (ઓછી માત્રામાં)" },
  },
  apathya: {
    order: 3,
    accent: "#c62828",
    bg: "#ffebee",
    border: "#ef9a9a",
    symbol: "✕",
    label: { en: "Apathya (To avoid)", mr: "अपथ्य (टाळावे)", hi: "अपथ्य (परहेज़ करें)", gu: "અપથ્ય (ટાળવું)" },
  },
};

function pick(labelObj, lang) {
  return labelObj[lang] || labelObj.en;
}

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// `rows` is the array of translated plan items: { name, category, classification, note, name_en }
function buildSectionHtml(key, rows, lang) {
  const cfg = SECTIONS[key];
  const items = rows.filter((r) => r.classification === key);

  const heading = `
    <div class="sec-head" style="background:${cfg.bg};border-left:6px solid ${cfg.accent};">
      <span class="sec-symbol" style="color:${cfg.accent}">${cfg.symbol}</span>
      <span class="sec-title" style="color:${cfg.accent}">${esc(pick(cfg.label, lang))}</span>
      <span class="sec-count" style="color:${cfg.accent}">${items.length}</span>
    </div>`;

  if (items.length === 0) {
    return heading + `<div class="empty">—</div>`;
  }

  // Group by category for tidy presentation.
  const byCat = new Map();
  for (const it of items) {
    const cat = it.category || "—";
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(it);
  }

  let body = "";
  for (const [cat, list] of byCat) {
    const chips = list
      .map(
        (it) =>
          `<span class="chip" style="border-color:${cfg.border};background:#fff;">
             ${esc(it.name)}${it.note ? `<em>(${esc(it.note)})</em>` : ""}
           </span>`
      )
      .join("");
    body += `
      <div class="cat-block">
        <div class="cat-label" style="color:${cfg.accent}">${esc(cat)}</div>
        <div class="chips">${chips}</div>
      </div>`;
  }

  return heading + `<div class="sec-body" style="border:1px solid ${cfg.border};">${body}</div>`;
}

export function buildDietPlanHtml(plan, rows, lang) {
  const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
  const dateStr = new Date(plan.date || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const sectionsHtml = ["pathya", "alpamatra", "apathya"]
    .map((k) => buildSectionHtml(k, rows, lang))
    .join("");

  // Advice block: standard advice (always) + per-plan extra advice, each shown in
  // the selected language using the doctor's reviewed translation, falling back
  // to the English source when no translation exists for that language.
  const nl2br = (s) => esc(s).replace(/\r?\n/g, "<br>");
  const trGet = (tr, l) => {
    if (!tr || l === SOURCE_LANG) return "";
    return (typeof tr.get === "function" ? tr.get(l) : tr[l]) || "";
  };
  const adviceParts = [
    trGet(plan.defaultAdviceTr, lang) || plan.defaultAdvice,
    trGet(plan.generalAdviceTr, lang) || plan.generalAdvice,
  ]
    .map((a) => (a || "").trim())
    .filter(Boolean);
  const adviceHtml = adviceParts.length
    ? `<div class="advice"><div class="t">General Advice</div>${adviceParts
        .map((a) => `<div class="advice-line">${nl2br(a)}</div>`)
        .join("")}</div>`
    : "";

  const p = plan.patient || {};
  const patientLine = [
    p.name && `<b>${esc(p.name)}</b>`,
    p.age && `${esc(String(p.age))} yrs`,
    p.gender && esc(p.gender),
    p.prakriti && `Prakriti: ${esc(p.prakriti)}`,
  ]
    .filter(Boolean)
    .join(" &nbsp;|&nbsp; ");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<style>
  ${FONT_FACE_CSS}

  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Gujarati', 'Nirmala UI', sans-serif;
    margin: 0; color: #1f2937; font-size: 12px;
  }
  .page { padding: 28px 32px; }

  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #00695c; padding-bottom: 12px; margin-bottom: 16px;
  }
  .brand h1 { margin: 0; font-size: 20px; color: #00695c; }
  .brand .sub { color: #6b7280; font-size: 11px; margin-top: 2px; }
  .header .meta { text-align: right; font-size: 11px; color: #374151; }

  .patient {
    background: #f1f8f6; border: 1px solid #cfe3dd; border-radius: 8px;
    padding: 10px 14px; margin-bottom: 18px; font-size: 12px;
  }
  .patient .row { margin: 2px 0; }
  .patient .label { color: #6b7280; }

  .legend { display:flex; gap:14px; margin: 0 0 14px; font-size: 11px; }
  .legend span { display:inline-flex; align-items:center; gap:5px; }
  .dot { width:11px; height:11px; border-radius:50%; display:inline-block; }

  .sec-head {
    display:flex; align-items:center; gap:10px;
    padding: 8px 12px; border-radius: 6px 6px 0 0; margin-top: 16px;
  }
  .sec-symbol { font-size: 16px; font-weight: 700; }
  .sec-title { font-size: 14px; font-weight: 700; flex: 1; }
  .sec-count {
    font-size: 11px; font-weight: 700; background:#fff; border-radius: 10px;
    padding: 1px 9px;
  }
  .sec-body { border-radius: 0 0 6px 6px; padding: 10px 12px; }
  .empty { padding: 8px 12px; color:#9ca3af; border:1px dashed #e5e7eb; border-radius:0 0 6px 6px; }

  .cat-block { margin-bottom: 8px; }
  .cat-block:last-child { margin-bottom: 0; }
  .cat-label { font-size: 11px; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .03em; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    border: 1px solid; border-radius: 14px; padding: 3px 11px; font-size: 12px;
  }
  .chip em { color:#6b7280; font-style: italic; margin-left: 4px; font-size: 10px; }

  .advice { margin-top: 18px; padding: 10px 14px; background:#fffdf5; border:1px solid #f0e6c8; border-radius:8px; }
  .advice .t { font-weight: 600; color:#92400e; margin-bottom: 4px; }
  .advice-line { margin-bottom: 5px; }
  .advice-line:last-child { margin-bottom: 0; }

  .footer { margin-top: 26px; display:flex; justify-content: space-between; align-items:flex-end; font-size:10px; color:#6b7280; }
  .sign { text-align:center; }
  .sign .line { width: 160px; border-top: 1px solid #9ca3af; margin-bottom: 3px; }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <h1>${esc(plan.clinicName || "Ayurvedic Diet Plan")}</h1>
        <div class="sub">पथ्य • अपथ्य • अल्प-मात्रा &nbsp;·&nbsp; ${esc(langMeta.native)}</div>
      </div>
      <div class="meta">
        <div><b>Date:</b> ${dateStr}</div>
        ${plan.doctorName ? `<div><b>Dr.</b> ${esc(plan.doctorName)}</div>` : ""}
      </div>
    </div>

    <div class="patient">
      <div class="row">${patientLine || "Patient"}</div>
      ${plan.diagnosis ? `<div class="row"><span class="label">Diagnosis:</span> ${esc(plan.diagnosis)}</div>` : ""}
    </div>

    <div class="legend">
      <span><i class="dot" style="background:${SECTIONS.pathya.accent}"></i> ${esc(pick(SECTIONS.pathya.label, lang))}</span>
      <span><i class="dot" style="background:${SECTIONS.alpamatra.accent}"></i> ${esc(pick(SECTIONS.alpamatra.label, lang))}</span>
      <span><i class="dot" style="background:${SECTIONS.apathya.accent}"></i> ${esc(pick(SECTIONS.apathya.label, lang))}</span>
    </div>

    ${sectionsHtml}

    ${adviceHtml}

    <div class="footer">
      <div>Generated by Ayurvedic Diet Planner · ${dateStr}</div>
      <div class="sign"><div class="line"></div>${esc(plan.doctorName ? "Dr. " + plan.doctorName : "Doctor's Signature")}</div>
    </div>
  </div>
</body>
</html>`;
}

export async function generatePdfBuffer(html) {
  // A short-lived, dedicated browser per PDF. A long-lived shared browser was
  // observed to stop subsetting embedded fonts (producing ~1.1 MB PDFs); a
  // fresh browser subsets correctly (~100 KB). PDF generation is low-frequency,
  // so the ~0.5 s launch cost is acceptable for a >10x smaller file.
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    // Ensure the inlined @font-face fonts are parsed/ready before printing,
    // otherwise Devanagari/Gujarati text can render with fallback glyphs.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
    // Puppeteer returns a Uint8Array; wrap as a Buffer so Express res.send()
    // streams it as raw binary. Sending a bare Uint8Array corrupts and bloats
    // the response (it gets serialised, not sent as bytes).
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// Kept for the server's graceful-shutdown import. Browsers are now per-PDF and
// closed in generatePdfBuffer's finally block, so there's nothing to clean up.
export async function closeBrowser() {}
