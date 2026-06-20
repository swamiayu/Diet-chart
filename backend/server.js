import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import foodRoutes from "./routes/foodRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import dietPlanRoutes from "./routes/dietPlanRoutes.js";
import translationRoutes from "./routes/translationRoutes.js";
import { closeBrowser } from "./services/pdfService.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true, service: "ayurvedic-diet-backend" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/diet-plans", dietPlanRoutes);
app.use("/api", translationRoutes); // exposes /api/languages and /api/translate

// ---- Frontend pages (public/) ----
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "public");
const page = (file) => (req, res) => res.sendFile(join(publicDir, file));

// Clean URLs for the multi-page app.
app.get("/", page("landing.html"));      // public landing
app.get("/login", page("login.html"));   // Google sign-in
app.get("/app", page("app.html"));        // the planner (gated client-side)
app.get("/plans", page("plans.html"));    // saved plans (gated client-side)

// Static assets (css/js) and direct .html access.
app.use(express.static(publicDir));

// 404 for anything else.
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown (closes the shared Puppeteer browser).
  const shutdown = async (sig) => {
    console.log(`\n${sig} received, shutting down...`);
    server.close();
    await closeBrowser().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
