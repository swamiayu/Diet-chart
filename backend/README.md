# Ayurvedic Diet Plan — Backend

Backend for an Ayurvedic diet plan website that classifies food items into
**Pathya** (recommended), **Apathya** (avoid) and **Alpa‑matra** (small quantity),
shows them in **Marathi / Hindi / Gujarati**, and exports a colour‑coded **PDF**.

- **DB:** MongoDB Atlas (Mongoose)
- **Auth:** Google SSO (Google Identity Services → verified ID token → our JWT)
- **Translations:** DB-stored per item, editable in UI; MyMemory suggestions + glossary seed
- **PDF:** Puppeteer (HTML→PDF) so Devanagari & Gujarati scripts render correctly
- **Stack:** Node 18+, Express (ESM)

Pages (served by Express): `/` landing · `/login` Google sign-in · `/app` planner
(gated) · `/plans` saved plans (gated). **Each doctor sees only their own saved plans.**

---

## Google sign-in setup (one-time)

1. Go to **https://console.cloud.google.com/apis/credentials** → *Create credentials* →
   *OAuth client ID* → **Web application**.
2. Under **Authorized JavaScript origins** add `http://localhost:5000` (and your prod URL).
3. Copy the **Client ID** into `.env` as `GOOGLE_CLIENT_ID=...`.
4. Set a `JWT_SECRET` in `.env` (any long random string —
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).

Until `GOOGLE_CLIENT_ID` + `JWT_SECRET` are set, the login page shows a "not configured"
message and the app stays gated.

---

## How translations work (DB is the source of truth)

Machine translation is unreliable for food terms, **and** `glossary.js` is code that
can't be edited after deployment. So translations live in the **database**, editable
in production:

1. **Each food/category stores its own `translations` map** (`{ mr, hi, gu }`). This is
   authoritative — set/edited by the doctor via the **Translate + override** UI.
2. **Adding/editing:** doctor types the English name → clicks **Translate** (MyMemory
   fills suggestions via `GET /api/translate/suggest`) → **corrects anything wrong** →
   saves. The reviewed values are stored in the DB.
3. **Display** uses the stored translation first; only if a language is unset does it
   fall back to a live MyMemory translation (cached in `TranslationCache`), and that
   fallback is *not* written back — so stored values always reflect what was reviewed.
4. **`data/foodGlossary.js` is demoted** to a non-production helper: it pre-fills good
   defaults at **seed time** and boosts the Translate-button suggestions. Nothing reads
   it at request time, so you never need to edit code to fix a translation in production.

Net: `curd → दही` ships correct out of the box (seeded), and any term can be fixed
later straight from the browser.

---

## Setup

```bash
cd backend
npm install                 # installs deps + downloads Chromium for Puppeteer
cp .env.example .env        # then edit .env with your Atlas URI
npm run seed                # loads ~90 starter foods (translations come from glossary)
npm start                   # http://localhost:5000
```

Then open **http://localhost:5000** — the doctor's UI (in `public/`) is served by the
same Express server, so there's no separate frontend to run and no CORS setup.
Pick a language, tap a food to cycle **Pathya → Alpa-matra → Apathya**, fill in the
patient details, and click **Download PDF**.

Fonts (Noto Sans + Devanagari + Gujarati, static TTFs) are committed under
`assets/fonts/` and inlined into the PDF, so generation works offline and embeds
the Indic scripts correctly. No font download step is needed.

`.env`:

```
MONGO_URI=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/ayurvedic_diet?retryWrites=true&w=majority
PORT=5000
MYMEMORY_EMAIL=you@example.com   # optional, raises free quota
CLIENT_ORIGIN=*
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
JWT_SECRET=<long-random-string>
```

---

## API

### Auth
| Method | Path | Notes |
|---|---|---|
| GET | `/api/auth/config` | Whether SSO is configured + the Google Client ID (for the button) |
| POST | `/api/auth/google` | Body `{ credential }` (Google ID token) → `{ token, doctor }` |
| GET | `/api/auth/me` | 🔒 current doctor |
| PUT | `/api/auth/me` | 🔒 update profile (e.g. `{ clinicName }`) — used by the profile modal |

All `/api/diet-plans*` routes are 🔒 — they require `Authorization: Bearer <token>`
and are **scoped to the signed-in doctor** (you only ever see your own plans).

### Languages & translation
| Method | Path | Notes |
|---|---|---|
| GET | `/api/languages` | Supported languages (`en`, `mr`, `hi`, `gu`) |
| GET | `/api/translate/suggest?text=Idli` | Suggestions for **all** target langs (powers the Translate button) |
| POST | `/api/translate` | Body `{ text, lang }` or `{ texts:[...], lang }` |

Foods and categories accept an optional `translations: { mr, hi, gu }` on **POST/PUT**
to store the doctor-reviewed values (authoritative over MyMemory).

### Categories (own collection, referenced by food items)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/categories?lang=mr&withCounts=1` | List, translated, with food counts |
| POST | `/api/categories` | `{ name }` |
| PUT | `/api/categories/:id` | Rename (clears cached translations) |
| DELETE | `/api/categories/:id` | Soft delete (blocked if foods still use it) |

### Food items (master list)
Each food **references a `Category` document** (`category` = ObjectId ref). Category
names and their translations live in the `categories` collection, not duplicated here.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/foods?lang=mr&categoryId=<id>&search=ba` | List, translated; each row has `name`, `category`, `categoryId` |
| POST | `/api/foods` | `{ name, categoryId }` **or** `{ name, category:"<name>" }` (creates the category if new) |
| POST | `/api/foods/bulk` | `{ items:[{name, category}] }` (category names auto-resolved/created) |
| PUT | `/api/foods/:id` | Update; accepts `categoryId` or `category` name |
| DELETE | `/api/foods/:id` | Soft delete |

### Diet plans
| Method | Path | Notes |
|---|---|---|
| POST | `/api/diet-plans` | Create a plan (see body below) |
| GET | `/api/diet-plans` | List plans (summary) |
| GET | `/api/diet-plans/:id?lang=mr` | One plan with items translated |
| GET | `/api/diet-plans/:id/pdf?lang=mr` | **Download the PDF** |
| POST | `/api/diet-plans/preview-pdf` | PDF **without** saving (same body as create) |

**Doctor workflow → request body.** The doctor *crosses* items → `apathya`,
*dots* items → `alpamatra`, and everything *remaining* → `pathya`. Send either:

```jsonc
// A) explicit items
{
  "patient": { "name": "Ramesh", "age": 45, "prakriti": "Pitta" },
  "doctorName": "Dr. Kale",
  "clinicName": "Arogya Ayurveda",
  "language": "mr",
  "items": [
    { "foodItemId": "<id>", "classification": "apathya" },
    { "foodItemId": "<id>", "classification": "alpamatra", "note": "twice a week" },
    { "foodItemId": "<id>", "classification": "pathya" }
  ]
}
```

```jsonc
// B) selections (arrays of food ids per bucket)
{
  "patient": { "name": "Ramesh" },
  "language": "mr",
  "selections": {
    "apathya":   ["<id1>", "<id2>"],
    "alpamatra": ["<id3>"],
    "pathya":    ["<id4>", "<id5>"]
  }
}
```

The PDF groups items by category under three colour‑coded sections:
🟢 Pathya · 🟠 Alpa‑matra · 🔴 Apathya.

---

## Project structure

```
backend/
├─ server.js                 # app entry (also serves public/)
├─ config/db.js              # Mongo Atlas connection
├─ public/                   # the doctor's UI (vanilla HTML/CSS/JS)
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ assets/fonts/             # bundled Noto static TTFs (Latin/Devanagari/Gujarati)
├─ data/
│  ├─ languages.js           # supported langs
│  └─ foodGlossary.js        # verified translations (source of truth)
├─ models/                   # Category, FoodItem (refs Category), DietPlan, TranslationCache
├─ services/
│  ├─ translationService.js  # glossary→cache→MyMemory
│  └─ pdfService.js          # HTML template + Puppeteer (returns a Buffer)
├─ controllers/              # category, food, dietPlan, translation
├─ routes/                   # category, food, dietPlan, translation
└─ utils/
   ├─ seedFoods.js           # starter food list
   └─ test-glossary.js       # offline glossary + PDF sanity check
```
