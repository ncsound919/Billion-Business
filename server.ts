import "dotenv/config";
import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import Stripe from "stripe";
import { createServer as createViteServer } from "vite";
import authRouter from "./src/server/routes/auth.ts";
import scansRouter from "./src/server/routes/scans.ts";
import billingRouter from "./src/server/routes/billing.ts";
import orgsRouter from "./src/server/routes/orgs.ts";
import { initDb, query, getPool } from "./src/server/db/pool.ts";
import passport from "passport";
import cweRouter from "./src/server/routes/cweCatalog.ts";
import { csrfMiddleware, authMiddleware } from "./src/server/middleware/auth.ts";
import { GradingService } from "./src/server/services/gradingService.ts";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/readyz", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.status(200).json({ status: "ready", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
});

// Stripe webhook: raw body parser must run BEFORE global express.json()
app.use("/api/v1/billing/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10kb" }));
app.use(passport.initialize());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/scans", csrfMiddleware, scansRouter);

// Billing: webhook path is already raw-parsed above, skip CSRF for webhook
app.use("/api/v1/billing", csrfMiddleware, billingRouter);

app.use("/api/v1/orgs", csrfMiddleware, orgsRouter);
app.use("/api/v1/cwe", cweRouter);

function buildGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "Grader-App",
    "Accept": "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

app.post("/api/grade", authMiddleware, async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) {
    return res.status(400).json({ error: "Repository URL or Owner/Repo is required." });
  }

  const cleaned = repoUrl.trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/\.git\/?$/i, "")
    .replace(/\/+$/, "");
  const parts = cleaned.split("/");
  if (parts.length < 2) {
    return res.status(400).json({ error: "Invalid repository format." });
  }
  const [owner, repo] = parts;
  const repoKey = `${owner}/${repo}`.toLowerCase();

  const ghHeaders = buildGitHubHeaders();
  let repoMeta: Record<string, unknown> | null = null;
  let packageJsonStr = "";
  let readmeStr = "";
  let fileList: string[] = [];

  try {
    const ghController = new AbortController();
    const ghTimeout = setTimeout(() => ghController.abort(), 30000);
    try {
      const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders, signal: ghController.signal });

      if (metaRes.status === 404) {
        return res.status(404).json({ error: `Repository '${repoKey}' not found on public GitHub.` });
      }
      if (metaRes.status === 403 || metaRes.status === 429) {
        return res.status(429).json({ error: "GitHub API rate limit exceeded. Add a GITHUB_TOKEN to your .env to raise the limit." });
      }

      if (metaRes.ok) {
        repoMeta = await metaRes.json() as Record<string, unknown>;

        const branches = ["main", "master", "dev"];
        for (const branch of branches) {
          const pkgController = new AbortController();
          const pkgTimeout = setTimeout(() => pkgController.abort(), 15000);
          try {
            const pkgRes = await fetch(
              `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`,
              { headers: ghHeaders, signal: pkgController.signal }
            );
            if (pkgRes.ok) { packageJsonStr = await pkgRes.text(); break; }
          } finally {
            clearTimeout(pkgTimeout);
          }
        }

        for (const branch of branches) {
          const readmeController = new AbortController();
          const readmeTimeout = setTimeout(() => readmeController.abort(), 15000);
          try {
            const readmeRes = await fetch(
              `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`,
              { headers: ghHeaders, signal: readmeController.signal }
            );
            if (readmeRes.ok) { readmeStr = await readmeRes.text(); break; }
          } finally {
            clearTimeout(readmeTimeout);
          }
        }

        const defaultBranch = (repoMeta.default_branch as string) ?? "main";
        const treeController = new AbortController();
        const treeTimeout = setTimeout(() => treeController.abort(), 15000);
        try {
          const treeRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
            { headers: ghHeaders, signal: treeController.signal }
          );
          if (treeRes.ok) {
            const treeData = await treeRes.json() as { tree?: Array<{ path: string }> };
            if (Array.isArray(treeData.tree)) {
              fileList = treeData.tree.map((f) => f.path).slice(0, 80);
            }
          }
        } finally {
          clearTimeout(treeTimeout);
        }
      }
    } finally {
      clearTimeout(ghTimeout);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: "Failed to connect to GitHub API.", details: msg });
  }

  if (!repoMeta) {
    return res.status(502).json({ error: "Could not retrieve repository metadata from GitHub." });
  }

  try {
    const report = await GradingService.gradeRepo(
      { repoUrl, owner, repo },
      { repoMeta, packageJsonStr, readmeStr, fileList }
    );
    res.json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gemini evaluation failed:", msg);
    res.status(500).json({ error: "Gemini evaluation failed.", details: msg });
  }
});

async function startServer() {
  try {
    await initDb();
  } catch (err) {
    console.error("Database initialization failed:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Grader server running on port ${PORT}`);
  });

  async function shutdown() {
    console.log("Shutting down gracefully...");
    server.close();
    const pool = getPool();
    if (pool) {
      await pool.end().catch((err) => console.error("Pool drain error:", err));
    }
    process.exit(0);
  }
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export { app };

const isMainModule = typeof require !== "undefined" && require.main === module;
if (isMainModule) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}