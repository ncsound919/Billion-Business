/**
 * Authentication Routes
 * GitHub OAuth, JWT generation, API key management
 */

import express from "express";
import passport from "passport";
import { generateToken } from "../auth/jwt.ts";
import { query } from "../db/pool.ts";
import { ApiKeyService } from "../services/apiKeyService.ts";
import { authMiddleware } from "../middleware/auth.ts";
import { githubAuth } from "../auth/github.ts";
const { Router } = express;
type Request = express.Request;
type Response = express.Response;

const router = Router();

/**
 * GET /api/v1/auth/github
 * Initiate GitHub OAuth flow
 */
router.get("/github", githubAuth);

/**
 * GET /api/v1/auth/github/callback
 * GitHub OAuth callback endpoint
 * Receives code from GitHub, exchanges for access token
 */
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/login?error=auth_failed" }),
  (req: Request, res: Response) => {
    const user = (req.user as any)?.user;
    const token = (req.user as any)?.token;

    if (!user || !token) {
      return res.redirect("/login?error=token_generation_failed");
    }

    // Set token as httpOnly cookie and redirect to dashboard
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      })
      .redirect("/dashboard");
  }
);

/**
 * POST /api/v1/auth/logout
 * Logout endpoint (client-side actually deletes token)
 */
router.post("/logout", authMiddleware, (_req: Request, res: Response) => {
  res.clearCookie("token").json({ message: "Logged out successfully" });
});

/**
 * GET /api/v1/auth/me
 * Get current user and orgs
 */
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get user info
    const { rows: userRows } = await query(
      `SELECT id, email, display_name, avatar_url, created_at FROM users WHERE id = $1`,
      [req.userId]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userRows[0];

    // Get user's orgs
    const { rows: orgRows } = await query(
      `SELECT o.id, o.name, o.slug, o.plan_tier, om.role
        FROM orgs o
        JOIN org_members om ON o.id = om.org_id
        WHERE om.user_id = $1
        ORDER BY o.created_at DESC`,
      [req.userId]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      },
      orgs: orgRows || [],
    });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/v1/auth/api-keys
 * Create new API key
 */
router.post("/api-keys", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.orgId || !req.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "API key name required" });
    }

    // Generate new key
    const { key, prefix } = ApiKeyService.generateKey(req.orgId, name);
    const keyHash = ApiKeyService.hashKey(key);

    // Store hashed key
    const { rows } = await query(
      `INSERT INTO api_keys (org_id, key_hash, prefix, name, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, prefix, name, created_at`,
      [req.orgId, keyHash, prefix, name]
    );

    if (!rows || rows.length === 0) {
      return res.status(500).json({ error: "Failed to create API key" });
    }

    // Return plaintext key only once
    res.json({
      id: rows[0].id,
      key: key, // Only returned here, never again!
      prefix: rows[0].prefix,
      name: rows[0].name,
      createdAt: rows[0].created_at,
      warning: "Save this key securely. You won't see it again.",
    });
  } catch (error) {
    console.error("Create API key error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/auth/api-keys
 * List API keys (prefix only, not full key)
 */
router.get("/api-keys", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.orgId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { rows } = await query(
      `SELECT id, prefix, name, last_used_at, created_at
        FROM api_keys
        WHERE org_id = $1
        ORDER BY created_at DESC`,
      [req.orgId]
    );

    res.json(rows || []);
  } catch (error) {
    console.error("List API keys error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/v1/auth/api-keys/:id
 * Revoke API key
 */
router.delete("/api-keys/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.orgId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;

    // Ensure key belongs to user's org
    const { rows } = await query(
      `DELETE FROM api_keys WHERE id = $1 AND org_id = $2 RETURNING id`,
      [id, req.orgId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "API key not found" });
    }

    res.json({ message: "API key revoked" });
  } catch (error) {
    console.error("Revoke API key error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;