/**
 * Scans Routes
 * Submit, list, retrieve, and delete repository scans
 */

import express from "express";
import { authMiddleware } from "../middleware/auth.ts";
import { scanLimitMiddleware, apiRateLimitMiddleware } from "../middleware/tenant.ts";
import { query } from "../db/pool.ts";
import { GradingService } from "../services/gradingService.ts";
import { ComplianceService } from "../services/compliance/complianceService.ts";
const { Router } = express;

// Bounded in-memory cache for GitHub API responses with 1-hour TTL
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 500;
const MAX_FILE_LIST_LENGTH = 80;
const gitHubCache = new Map<string, { data: any; timestamp: number }>();

function getFromCache<T>(key: string): T | null {
  const cached = gitHubCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    gitHubCache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

function setInCache<T>(key: string, data: T): void {
  gitHubCache.set(key, { data, timestamp: Date.now() });
  if (gitHubCache.size > MAX_CACHE_SIZE) {
    const oldest = gitHubCache.entries().next().value;
    if (oldest) gitHubCache.delete(oldest[0]);
  }
}

// Periodic cache cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of gitHubCache) {
    if (now - value.timestamp > CACHE_TTL_MS) gitHubCache.delete(key);
  }
}, 10 * 60 * 1000).unref();
type Request = express.Request;
type Response = express.Response;

const router = Router();

/**
 * POST /api/v1/scans
 * Submit a repository for grading
 */
router.post(
  "/",
  authMiddleware,
  scanLimitMiddleware,
  apiRateLimitMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.orgId || !req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { repoUrl } = req.body;
      if (!repoUrl) {
        return res.status(400).json({ error: "repoUrl required" });
      }

      // Parse repo URL
      const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/|$)/);
      if (!repoMatch) {
        return res.status(400).json({ error: "Invalid GitHub URL" });
      }

      const [, owner, repo] = repoMatch;

      // Create scan record
      const { rows: scanRows } = await query(
        `INSERT INTO scans (org_id, user_id, repo_url, owner, name, score, grade_category, report, created_at)
          VALUES ($1, $2, $3, $4, $5, 0, 'pending', '{"status": "processing"}', NOW())
          RETURNING id, repo_url, owner, name, created_at`,
        [req.orgId, req.userId, repoUrl, owner, repo]
      );

      if (!scanRows || scanRows.length === 0) {
        return res.status(500).json({ error: "Failed to create scan" });
      }

      const scan = scanRows[0];

      // Grade the repo (fire-and-forget — response returns immediately with status "processing")
      gradeRepoAsync(scan.id, owner, repo, repoUrl, req.orgId);

      res.status(201).json({
        id: scan.id,
        repoUrl: scan.repo_url,
        owner: scan.owner,
        repo: scan.name,
        status: "processing",
        createdAt: scan.created_at,
      });
    } catch (error) {
      console.error(`[scans] [userId:${req.userId}] Submit scan error:`, error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /api/v1/scans
 * List all scans for the authenticated org
 */
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.orgId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const { rows: scans } = await query(
      `SELECT id, repo_url, owner, name, score, grade_category, created_at, updated_at
        FROM scans
        WHERE org_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [req.orgId, limit, offset]
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*) as total FROM scans WHERE org_id = $1`,
      [req.orgId]
    );

    const total = parseInt(countRows[0].total, 10) || 0;

    res.json({
      scans: scans || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(`[scans] [userId:${req.userId}] List scans error:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/scans/:id
 * Get scan detail including full report
 */
router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.orgId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    const { rows } = await query(
      `SELECT id, org_id, user_id, repo_url, owner, name, score, grade_category, report, created_at, updated_at
        FROM scans
        WHERE id = $1 AND org_id = $2`,
      [id, req.orgId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const scan = rows[0];

    let report: unknown = scan.report;
    if (typeof report === "string") {
      try {
        report = JSON.parse(report);
      } catch {
        report = { status: "error", error: "Malformed report data" };
      }
    }

    res.json({
      id: scan.id,
      repoUrl: scan.repo_url,
      owner: scan.owner,
      repo: scan.name,
      score: scan.score,
      grade: scan.grade_category,
      report,
      createdAt: scan.created_at,
      updatedAt: scan.updated_at,
    });
  } catch (error) {
    console.error(`[scans] [scanId:${req.params.id}] [userId:${req.userId}] Get scan error:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/v1/scans/:id
 * Delete a scan
 */
router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.orgId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    const { rows } = await query(
      `DELETE FROM scans WHERE id = $1 AND org_id = $2 RETURNING id`,
      [id, req.orgId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Scan not found" });
    }

    res.json({ message: "Scan deleted" });
  } catch (error) {
    console.error(`[scans] [scanId:${req.params.id}] [userId:${req.userId}] Delete scan error:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Background task: Grade repo and update scan
 */
async function gradeRepoAsync(
  scanId: string,
  owner: string,
  repo: string,
  repoUrl: string,
  orgId: string
) {
  // Mark scan as processing
  try {
    await query(
      `UPDATE scans SET grade_category = 'processing', updated_at = NOW() WHERE id = $1`,
      [scanId]
    );
  } catch (updateError) {
    console.error(`Failed to update scan ${scanId} to processing:`, updateError);
  }

  try {
    const ghHeaders: Record<string, string> = {
      "User-Agent": "Grader-App",
      "Accept": "application/vnd.github+json",
    };
    if (process.env.GITHUB_TOKEN) {
      ghHeaders["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // Timeout for GitHub API calls
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    // Check cache for repo metadata
    const metaCacheKey = `github:meta:${owner}/${repo}`;
    let repoMeta = getFromCache<Record<string, unknown> | null>(metaCacheKey);
    
    if (repoMeta === null) {
      const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: ghHeaders,
        signal: controller.signal,
      });

      if (metaRes.status === 404) {
        clearTimeout(timeout);
        throw new Error(`Repository ${owner}/${repo} not found`);
      }
      if (metaRes.status === 403 || metaRes.status === 429) {
        clearTimeout(timeout);
        throw new Error("GitHub API rate limit exceeded");
      }

      repoMeta = metaRes.ok ? await metaRes.json() : null;
      setInCache(metaCacheKey, repoMeta);
    }
    clearTimeout(timeout);

    let packageJsonStr = "";
    let readmeStr = "";
    let fileList: string[] = [];

    if (repoMeta) {
      // Check cache for package.json
      const pkgCacheKey = `github:pkg:${owner}/${repo}`;
      let cachedPackageJson = getFromCache<string>(pkgCacheKey);
      
      if (cachedPackageJson === null) {
        const pkgController = new AbortController();
        const pkgTimeout = setTimeout(() => pkgController.abort(), 30000);
        try {
          const branches = ["main", "master", "dev"];
          for (const branch of branches) {
            const pkgRes = await fetch(
              `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`,
              { headers: ghHeaders, signal: pkgController.signal }
            );
            if (pkgRes.ok) { 
              packageJsonStr = await pkgRes.text(); 
              setInCache(pkgCacheKey, packageJsonStr);
              break; 
            }
          }
        } finally {
          clearTimeout(pkgTimeout);
        }
      } else {
        packageJsonStr = cachedPackageJson;
      }

      // Check cache for README
      const readmeCacheKey = `github:readme:${owner}/${repo}`;
      let cachedReadme = getFromCache<string>(readmeCacheKey);
      
      if (cachedReadme === null) {
        const readmeController = new AbortController();
        const readmeTimeout = setTimeout(() => readmeController.abort(), 30000);
        try {
          const branches = ["main", "master", "dev"];
          for (const branch of branches) {
            const readmeRes = await fetch(
              `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`,
              { headers: ghHeaders, signal: readmeController.signal }
            );
            if (readmeRes.ok) { 
              readmeStr = await readmeRes.text(); 
              setInCache(readmeCacheKey, readmeStr);
              break; 
            }
          }
        } finally {
          clearTimeout(readmeTimeout);
        }
      } else {
        readmeStr = cachedReadme;
      }

      const defaultBranch = (repoMeta.default_branch as string) ?? "main";
      const treeCacheKey = `github:tree:${owner}/${repo}:${defaultBranch}`;
      let cachedFileList = getFromCache<string[]>(treeCacheKey);
      
      if (cachedFileList === null) {
        const treeController = new AbortController();
        const treeTimeout = setTimeout(() => treeController.abort(), 30000);
        try {
          const treeRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
            { headers: ghHeaders, signal: treeController.signal }
          );
          if (treeRes.ok) {
            const treeData = await treeRes.json() as { tree?: Array<{ path: string }> };
            if (Array.isArray(treeData.tree)) {
              fileList = treeData.tree.map((f) => f.path).slice(0, MAX_FILE_LIST_LENGTH);
              setInCache(treeCacheKey, fileList);
            }
          }
        } finally {
          clearTimeout(treeTimeout);
        }
      } else {
        fileList = cachedFileList;
      }
    }

    const report = await GradingService.gradeRepo(
      { repoUrl, owner, repo },
      { repoMeta, packageJsonStr, readmeStr, fileList }
    );

    await query(
      `UPDATE scans
        SET score = $1, grade_category = $2, report = $3, updated_at = NOW()
        WHERE id = $4`,
      [report.overallScore, report.gradeCategory, JSON.stringify(report), scanId]
    );

    // Run ISO 5055 compliance analysis
    try {
      const complianceReport = ComplianceService.runCompliance(owner, repo, {
        repoMeta: repoMeta as Record<string, unknown> | null,
        packageJsonStr,
        readmeStr,
        fileList,
      });
      await query(
        `UPDATE scans SET compliance_report = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(complianceReport), scanId]
      );
    } catch (complianceError) {
      console.error(`Compliance analysis failed for scan ${scanId}:`, complianceError);
    }

    await query(
      `INSERT INTO usage_log (org_id, action, resource, created_at)
        VALUES ($1, 'scan_completed', $2, NOW())`,
      [orgId, `${owner}/${repo}`]
    );

    console.log(`[scans] [scanId:${scanId}] Scan completed successfully`);
  } catch (error) {
    console.error(`Error grading repo for scan ${scanId}:`, error);

    // Determine appropriate error status
    let errorStatus = "error";
    if (error instanceof Error) {
      if (error.message.includes("rate limit") || error.message.includes("429")) {
        errorStatus = "rate_limited";
      } else if (error.message.includes("not found") || error.message.includes("404")) {
        errorStatus = "not_found";
      } else if (error.name === "AbortError") {
        errorStatus = "timeout";
      }
    }

    try {
      await query(
        `UPDATE scans
          SET grade_category = $1, report = $2, updated_at = NOW()
          WHERE id = $3`,
      [
        errorStatus,
        JSON.stringify({
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        scanId,
      ]
    );
    } catch (updateError) {
      console.error(`Failed to update error status for scan ${scanId}:`, updateError);
    }
  }
}

/**
 * GET /api/v1/scans/:id/compliance
 * Returns the ISO 5055 compliance report for a scan
 */
router.get("/:id/compliance", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.orgId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    const { rows } = await query(
      `SELECT id, org_id, compliance_report FROM scans WHERE id = $1 AND org_id = $2`,
      [id, req.orgId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const compliance = rows[0].compliance_report
      ? (typeof rows[0].compliance_report === "string"
          ? JSON.parse(rows[0].compliance_report)
          : rows[0].compliance_report)
      : null;

    if (!compliance) {
      return res.status(404).json({ error: "Compliance report not yet available for this scan" });
    }

    res.json(compliance);
  } catch (error) {
    console.error("Get compliance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;