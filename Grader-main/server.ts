import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import type { HistoricalScan } from "./src/types.js";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ FIX 1: Configurable port — never hardcoded
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// ✅ FIX 2: Lazy-loaded GenAI client (kept — this was already correct)
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY environment variable is missing.");
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// ✅ FIX 3: Empty scan history — no pre-seeded fake data
const localScanHistory: HistoricalScan[] = [];

// ✅ FIX 4: GitHub auth helper — reads optional token from env
function buildGitHubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent": "Grader-App",
    "Accept": "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

function parseRepoInput(input: string): { owner: string; repo: string } | null {
  let cleaned = input.trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  const parts = cleaned.split("/");
  if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
  return null;
}

// GET /api/scans
app.get("/api/scans", (_req, res) => {
  res.json(localScanHistory);
});

// GET /healthz - basic health check
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// GET /readyz - readiness check
app.get("/readyz", async (_req, res) => {
  try {
    // Check if we can initialize GenAI client (if API key is present)
    if (process.env.GEMINI_API_KEY) {
      // Just verify the client can be created - don't make actual API call
      getGenAI();
    }
    
    // Basic readiness - server is up and can process requests
    res.status(200).json({ 
      status: "ready", 
      timestamp: new Date().toISOString(),
      dependencies: {
        gemini: !!process.env.GEMINI_API_KEY,
        github: !!process.env.GITHUB_TOKEN || true // GitHub works without token but with lower limits
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: "not ready", 
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/grade
app.post("/api/grade", async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) {
    return res.status(400).json({ error: "Repository URL or Owner/Repo is required." });
  }

  const parsed = parseRepoInput(repoUrl);
  if (!parsed) {
    return res.status(400).json({
      error: "Invalid repository format. Please provide 'owner/name' or a direct GitHub URL.",
    });
  }

  const { owner, repo } = parsed;
  const repoKey = `${owner}/${repo}`.toLowerCase();
  console.log(`Starting grade check for: ${repoKey}`);

  const ghHeaders = buildGitHubHeaders();
  let repoMeta: Record<string, unknown> | null = null;
  let packageJsonStr = "";
  let readmeStr = "";
  let fileList: string[] = [];
  // ✅ FIX 5: Track data quality so the AI prompt is honest about what was fetched
  let dataQuality: "full" | "partial" | "none" = "none";

  try {
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders });

    if (metaRes.status === 404) {
      return res.status(404).json({
        error: `Repository '${repoKey}' not found on public GitHub.`,
      });
    }

    // ✅ FIX 6: Rate-limited? Tell the client honestly — don't fabricate data
    if (metaRes.status === 403 || metaRes.status === 429) {
      const resetHeader = metaRes.headers.get("x-ratelimit-reset");
      const resetAt = resetHeader ? new Date(parseInt(resetHeader, 10) * 1000).toISOString() : "unknown";
      return res.status(429).json({
        error: "GitHub API rate limit exceeded. Add a GITHUB_TOKEN to your .env to raise the limit.",
        rateLimitResetAt: resetAt,
      });
    }

    if (metaRes.ok) {
      repoMeta = await metaRes.json() as Record<string, unknown>;
      dataQuality = "partial";

      const branches = ["main", "master", "dev"];
      for (const branch of branches) {
        const pkgRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`,
          { headers: ghHeaders }
        );
        if (pkgRes.ok) { packageJsonStr = await pkgRes.text(); break; }
      }

      for (const branch of branches) {
        const readmeRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`,
          { headers: ghHeaders }
        );
        if (readmeRes.ok) { readmeStr = await readmeRes.text(); break; }
      }

      const defaultBranch = (repoMeta.default_branch as string) ?? "main";
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers: ghHeaders }
      );
      if (treeRes.ok) {
        const treeData = await treeRes.json() as { tree?: Array<{ path: string }> };
        if (Array.isArray(treeData.tree)) {
          fileList = treeData.tree.map((f) => f.path).slice(0, 80);
          dataQuality = "full";
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("GitHub API error:", msg);
    return res.status(502).json({ error: "Failed to connect to GitHub API.", details: msg });
  }

  if (!repoMeta) {
    return res.status(502).json({ error: "Could not retrieve repository metadata from GitHub." });
  }

  // ✅ FIX 7: Correct, current Gemini model name
  const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  try {
    const ai = getGenAI();

    const dataWarning = dataQuality !== "full"
      ? `NOTE: Data quality is "${dataQuality}". Some fields below may be missing. Reflect this uncertainty in your summary and scores — do not invent values for fields that were not fetched.`
      : "Full data was retrieved.";

    const analysisPrompt = `
You are an honest codebase grading engine for "Grader".
${dataWarning}

Repository: ${owner}/${repo}
Primary Language: ${repoMeta.language ?? "Unknown"}
Stars: ${repoMeta.stargazers_count ?? "N/A"}
Forks: ${repoMeta.forks_count ?? "N/A"}
Open Issues: ${repoMeta.open_issues_count ?? "N/A"}
Last Updated: ${repoMeta.updated_at ?? "N/A"}
Files (first 80): [${fileList.join(", ") || "unavailable"}]

package.json:
"""
${packageJsonStr || "Not retrieved."}
"""

README (first 1500 chars):
"""
${readmeStr ? readmeStr.slice(0, 1500) : "Not retrieved."}
"""

Instructions:
1. Return a health scorecard as valid JSON matching the exact schema below.
2. Scores must be honest. Do not inflate scores when data is missing.
3. Mention actual dependency names, versions, and frameworks found in package.json.
4. Output ONLY raw JSON — no markdown, no code fences.

Schema:
{
  "repoOwner": string,
  "repoName": string,
  "overallScore": number,
  "gradeCategory": string,
  "mainLanguage": string,
  "starsCount": number,
  "forksCount": number,
  "openIssuesCount": number,
  "lastPushedAt": string,
  "summary": string,
  "security": {
    "secretLeakDetected": boolean,
    "secretsDetails": string[],
    "vulnerabilityCount": number,
    "highestSeverity": "Low"|"Medium"|"High"|"Critical"|"None",
    "vulnerabilities": [{ "package": string, "severity": string, "details": string, "recommendation": string }]
  },
  "quality": {
    "readmeScore": number,
    "readmeFeedback": string,
    "readmeMissingSections": string[],
    "testFrameDetected": string|null,
    "testsExplanation": string,
    "setupFrictionLevel": "Low"|"Medium"|"High",
    "setupFrictionReason": string
  },
  "market": {
    "trendAlignmentGrade": "Rising Star"|"Steady"|"Declining Stack"|"Experimental",
    "trendExplanation": string,
    "benchmarks": { "starRatingPercentile": number, "releaseFrequency": "High"|"Medium"|"Low", "activeContributorScore": "Healthy"|"Solo Maker"|"Stagnant" },
    "competitors": [{ "repoName": string, "stars": number, "advantages": string[], "weaknesses": string[] }]
  },
  "quickWins": [{ "id": string, "title": string, "severity": "High"|"Medium"|"Low", "category": string, "description": string, "actionableSteps": string }],
  "roadmap": [{ "id": string, "title": string, "category": string, "description": string, "phase": "Now"|"Next"|"Later", "effort": "Small"|"Medium"|"Large" }],
  "valuation": { "estimatedDeveloperHours": number, "averageHourlyRate": number, "replacementCostFMV": number, "reliefFromRoyaltyValue": number, "productivityWasteHeuristic": number, "annualInterestDebtCost": number },
  "hotspots": [{ "filePath": string, "complexityScore": number, "changeFrequency": "High"|"Medium"|"Low", "churnPercent": number, "riskRating": "Critical"|"High"|"Medium"|"Low", "recommendation": string }],
  "ossRisk": { "copyleftDetected": boolean, "licenseConflictsCount": number, "licensesFound": [{ "name": string, "verified": boolean, "type": string, "riskLevel": string, "details": string }], "legalAdviceSnippet": string },
  "architecture": { "dependencyCouplingScore": number, "circularImportsFound": number, "architecturalDriftIndex": number, "modularSpacingScore": number, "structuralComplexityFeedback": string },
  "compliance": { "iso5055Compliant": boolean, "reliabilityScore": number, "securityPracticesScore": number, "maintainabilityPracticesScore": number, "performanceScore": number, "severeViolationsCount": number, "certValidationId": string },
  "globalBenchmarkPercent": number
}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: analysisPrompt,
      config: { responseMimeType: "application/json", temperature: 0.7 },
    });

    const reportText = response.text ?? "";

    // ✅ FIX 8: Validate parse before trusting the response
    let healthReport: Record<string, unknown>;
    try {
      healthReport = JSON.parse(reportText.trim());
    } catch {
      console.error("Gemini returned invalid JSON:", reportText.slice(0, 300));
      return res.status(502).json({
        error: "AI returned malformed JSON. Try again or check the model configuration.",
      });
    }

    // Always stamp real owner/repo so UI cannot be spoofed
    healthReport.repoOwner = owner;
    healthReport.repoName = repo;

    // Deduplicate and prepend to history
    const idx = localScanHistory.findIndex((s) => s.repoKey === repoKey);
    if (idx !== -1) localScanHistory.splice(idx, 1);
    localScanHistory.unshift({
      repoKey,
      scannedAt: new Date().toISOString(),
      overallScore: healthReport.overallScore as number,
      gradeCategory: healthReport.gradeCategory as string,
      owner,
      name: repo,
    });

    res.json(healthReport);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gemini evaluation failed:", msg);
    res.status(500).json({ error: "Gemini evaluation failed.", details: msg });
  }
});

// Dev: Vite middleware | Prod: static dist
async function startServer() {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Grader server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});