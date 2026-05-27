/**
 * Organizations Routes
 * Org CRUD, member management, usage stats
 */

import express from "express";
import { authMiddleware, orgAccessMiddleware } from "../middleware/auth.ts";
import { query } from "../db/pool.ts";
import { getPlanLimit } from "../config/planLimits.ts";
const { Router } = express;
type Request = express.Request;
type Response = express.Response;

const router = Router();

/**
 * GET /api/v1/orgs
 * List all orgs for authenticated user
 */
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { rows } = await query(
      `SELECT o.id, o.name, o.slug, o.plan_tier, o.created_at, om.role
       FROM orgs o
       JOIN org_members om ON o.id = om.org_id
       WHERE om.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.userId]
    );

    res.json(rows || []);
  } catch (error) {
    console.error(`[orgs] [userId:${req.userId}] List orgs error:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/v1/orgs
 * Create new organization
 */
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: "Name and slug required" });
    }

    if (!/^[a-z0-9-]{1,63}$/.test(slug)) {
      return res.status(400).json({ error: "Slug must be 1-63 characters and contain only lowercase letters, numbers, and hyphens" });
    }

    // Create org
    const { rows: orgRows } = await query(
      `INSERT INTO orgs (name, slug, plan_tier, created_at)
       VALUES ($1, $2, 'free', NOW())
       RETURNING id, name, slug, plan_tier, created_at`,
      [name, slug]
    );

    if (!orgRows || orgRows.length === 0) {
      return res.status(500).json({ error: "Failed to create organization" });
    }

    const org = orgRows[0];

    // Add creator as owner
    await query(
      `INSERT INTO org_members (org_id, user_id, role, joined_at)
       VALUES ($1, $2, 'owner', NOW())`,
      [org.id, req.userId]
    );

    res.status(201).json(org);
  } catch (error: any) {
    if ((error as any)?.code === "23505") {
      return res.status(409).json({ error: "Organization slug already exists" });
    }

    console.error("[orgs] Create org error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/orgs/:id
 * Get organization details
 */
router.get("/:id", authMiddleware, orgAccessMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT id, name, slug, plan_tier, created_at, updated_at
       FROM orgs
       WHERE id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Get org error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/orgs/:id/usage
 * Get organization usage stats
 */
router.get("/:id/usage", authMiddleware, orgAccessMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get scan count this month
    const { rows: scanRows } = await query(
      `SELECT COUNT(*) as count FROM scans 
       WHERE org_id = $1 AND created_at >= date_trunc('month', NOW())`,
      [id]
    );

    // Get plan tier
    const { rows: orgRows } = await query(
      `SELECT plan_tier FROM orgs WHERE id = $1`,
      [id]
    );

    if (!orgRows || orgRows.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const planTier = orgRows[0].plan_tier || "free";
    const limit = getPlanLimit(planTier, "scansPerMonth");
    const scansUsed = parseInt(scanRows[0].count, 10) || 0;

    res.json({
      planTier,
      scansPerMonth: {
        limit,
        used: scansUsed,
        remaining: Math.max(0, limit - scansUsed),
      },
    });
  } catch (error) {
    console.error("Get org usage error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/orgs/:id/members
 * List organization members
 */
router.get("/:id/members", authMiddleware, orgAccessMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT u.id, u.email, u.display_name, u.avatar_url, om.role, om.joined_at
       FROM org_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.org_id = $1
       ORDER BY om.joined_at DESC`,
      [id]
    );

    res.json(rows || []);
  } catch (error) {
    console.error("List org members error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/v1/orgs/:id/members/invite
 * Invite member to organization (Phase 2)
 * For now, just placeholder that returns 503
 */
router.post("/:id/members/invite", authMiddleware, orgAccessMiddleware, async (req: Request, res: Response) => {
  return res.status(503).json({
    error: "Email invitations coming in Phase 2",
    message: "Team invitations will be available in the Professional plan",
  });
});

/**
 * DELETE /api/v1/orgs/:id/members/:userId
 * Remove member from organization (Phase 2)
 */
router.delete("/:id/members/:userId", authMiddleware, orgAccessMiddleware, async (req: Request, res: Response) => {
  return res.status(503).json({
    error: "Member management coming in Phase 2",
  });
});

export default router;
