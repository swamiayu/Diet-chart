# Deploying to Render (Docker)

This app runs a long-lived Express server and generates PDFs with **Puppeteer
(Chromium)**, so it deploys as a **Docker web service**. The included `Dockerfile`
installs the Chromium system libraries; your code runs unchanged.

> Railway works the same way (Deploy from GitHub → it detects the Dockerfile →
> add the same env vars → generate a domain).

## 1. Push to GitHub
Commit everything (the `Dockerfile` and `.dockerignore` are included; `.env`
stays ignored). The app lives in the `backend/` folder of the repo.

## 2. Create the Render web service
1. https://render.com → **New +** → **Web Service**.
2. Connect your GitHub repo.
3. Settings:
   - **Root Directory:** `backend`  ← important (the app isn't at repo root)
   - **Runtime:** Docker (auto-detected from the Dockerfile)
   - **Branch:** `main`
   - **Region:** closest to your users (e.g. Singapore for India)
   - **Instance type:** Free works, but it **spins down when idle** — the first
     request (and first PDF) after a nap is slow. **Starter ($7/mo)** stays warm.
4. **Health Check Path:** `/api/health`

## 3. Environment variables (Render dashboard → Environment)
Set these (same values as your local `.env`):

| Key | Value |
|---|---|
| `MONGO_URI` | your Atlas connection string |
| `JWT_SECRET` | your long random string |
| `GOOGLE_CLIENT_ID` | your `...apps.googleusercontent.com` |
| `MYMEMORY_EMAIL` | your email (optional, raises quota) |

**Do NOT set `PORT`** — Render injects it and the app already reads
`process.env.PORT`. Hardcoding a port breaks Render's port detection.

## 4. Deploy
Click **Create Web Service**. First build takes ~5–10 min (it downloads
Chromium). You'll get a URL like `https://your-app.onrender.com`.

## 5. MongoDB Atlas — allow the server in
Atlas → **Network Access** → **Add IP Address** → **Allow access from anywhere
(0.0.0.0/0)**. Render's outbound IP isn't fixed on lower tiers, so this is
required or the DB connection times out.

## 6. Google sign-in — add the production origin
Google Cloud Console → **APIs & Services → Credentials** → open your **OAuth 2.0
Client ID (Web application)**:
- **Authorized JavaScript origins → Add URI:** `https://your-app.onrender.com`
  (exact: `https`, no trailing slash, no path).
- Keep `http://localhost:5000` for local dev.
- Save, then wait a few minutes to propagate.

> Our sign-in uses **Google Identity Services** (the rendered button), which only
> checks **Authorized JavaScript origins** — you do **not** need to fill in
> "Authorized redirect URIs".

If sign-in fails after deploy, it's almost always this origin not matching
exactly (http vs https, a trailing slash, or not yet propagated).

## Changing the port
- **Local:** edit `PORT=` in `backend/.env`.
- **Hosted (Render/Railway):** don't set it — the platform provides `PORT` and
  the app binds to it automatically.
