// Offline sanity check: verifies glossary correctness + PDF HTML build.
// Run: node utils/test-glossary.js   (no DB needed — glossary hits short-circuit)
import assert from "node:assert";
import { translateText } from "../services/translationService.js";
import { buildDietPlanHtml } from "../services/pdfService.js";

const cases = [
  ["Curd", "mr", "दही"],
  ["Curd", "hi", "दही"],
  ["Curd", "gu", "દહીં"],
  ["Ghee", "mr", "तूप"],
  ["Buttermilk", "mr", "ताक"],
  ["Rice", "mr", "तांदूळ"],
  ["Mango", "gu", "કેરી"],
  ["Jaggery", "hi", "गुड़"],
  ["Dairy", "mr", "दुग्धजन्य पदार्थ"],
  ["Vegetables", "gu", "શાકભાજી"],
];

let pass = 0;
for (const [text, lang, expected] of cases) {
  const got = await translateText(text, lang);
  assert.strictEqual(got, expected, `${text} -> ${lang}: expected "${expected}", got "${got}"`);
  console.log(`✓ ${text} (${lang}) = ${got}`);
  pass++;
}

// English passthrough
assert.strictEqual(await translateText("Curd", "en"), "Curd");
console.log("✓ english passthrough");

// PDF HTML builds and contains the translated section heading + a chip.
const html = buildDietPlanHtml(
  { patient: { name: "Test" }, doctorName: "Dr. A", clinicName: "Clinic", date: Date.now() },
  [
    { name: "दही", category: "दुग्धजन्य पदार्थ", classification: "pathya" },
    { name: "साखर", category: "गोड पदार्थ", classification: "apathya", note: "टाळा" },
    { name: "तूप", category: "दुग्धजन्य पदार्थ", classification: "alpamatra" },
  ],
  "mr"
);
assert.ok(html.includes("पथ्य"), "html should contain Pathya heading");
assert.ok(html.includes("दही"), "html should contain curd chip");
assert.ok(html.includes("अपथ्य"), "html should contain Apathya heading");
console.log("✓ PDF HTML builds with translated content");

console.log(`\nAll ${pass + 2} checks passed.`);
process.exit(0);
