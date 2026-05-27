/**
 * Tenant & Rate Limiting Middleware
 * Enforces plan limits and rate limits per organization
 */

import express from "express";
import { query } from "../db/pool.ts";
import { PLAN_LIMITS, getPlanLimit } from "../config/planLimits.ts";
type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;

/**
 * Check if org has reached scan limit for this month
 * Use after authMiddleware
 */
export const scanLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.orgId) {
      return res.status(401).json({ error: "Org ID required" });
    }

    // Get org plan tier
    const { rows: orgRows } = await query(
      `SELECT plan_tier FROM orgs WHERE id = $1`,
      [req.orgId]
    );

    if (!orgRows || orgRows.length === 0) {
      return res.status(404).json({ error: "Org not found" });
    }

    const planTier = orgRows[0].plan_tier || "free";
    const limit = getPlanLimit(planTier, "scansPerMonth");

    // Count scans this month
    const { rows: countRows } = await query(
      `SELECT COUNT(*) as count FROM scans 
       WHERE org_id = $1 AND created_at >= date_trunc('month', NOW())`,
      [req.orgId]
    );

    const scansThisMonth = parseInt(countRows[0].count, 10) || 0;

    // Attach limit info to request for response headers
    (req as Request & { scanLimit?: Record<string, unknown> }).scanLimit = {
      used: scansThisMonth,
      total: limit,
      remaining: Math.max(0, limit - scansThisMonth),
    };

    if (scansThisMonth >= limit && limit !== Infinity) {
      const { rows: resetRows } = await query(
        `SELECT date_trunc('month', NOW()) + interval '1 month' as reset_date`
      );
      const resetDate = resetRows?.[0]?.reset_date || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
      return res.status(429).json({
        error: "Monthly scan limit reached",
        limit,
        used: scansThisMonth,
        resetDate,
      });
    }

    next();
  } catch (error) {
    console.error(`[tenant] [orgId:${req.orgId}] Scan limit check error:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Rate limiting: API calls per hour
 * Use for API endpoints
 */
export const apiRateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.orgId) {
      return res.status(401).json({ error: "Org ID required" });
    }

    // Check plan tier for hourly limit
    const { rows: orgRows } = await query(
      `SELECT plan_tier FROM orgs WHERE id = $1`,
      [req.orgId]
    );

    if (!orgRows || orgRows.length === 0) {
      return res.status(404).json({ error: "Org not found" });
    }

    const planTier = orgRows[0].plan_tier || "free";
    const limit = getPlanLimit(planTier, "apiCallsPerHour");

    if (limit === 0) {
      return res.status(403).json({
        error: "API access not available in free tier",
        upgradeRequired: true,
      });
    }

    // PostgreSQL-based rate limiting (DB timezone handles hour boundary)
    const { rows } = await query(
      `INSERT INTO rate_limits (org_id, period_start, api_call_count)
       VALUES ($1, date_trunc('hour', NOW()), 1)
       ON CONFLICT (org_id, period_start)
       DO UPDATE SET api_call_count = rate_limits.api_call_count + 1
       RETURNING api_call_count, period_start`,
      [req.orgId]
    );

    const currentCount = rows[0].api_call_count;

    if (currentCount > limit) {
      const { rows: resetRows } = await query(
        `SELECT date_trunc('hour', NOW()) + interval '1 hour' as reset_time`
      );
      return res.status(429).json({
        error: "API rate limit exceeded",
        limit,
        resetTime: resetRows[0].reset_time,
      });
    }

    next();
  } catch (error) {
    console.error(`[tenant] [orgId:${req.orgId}] API rate limit check error:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Add limit headers to response
 * Sends headers immediately (before body) to avoid monkey-patching res.json
 */
export const limitHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const scanLimit = (req as Request & { scanLimit?: { total: number; used: number; remaining: number } }).scanLimit;
  if (scanLimit) {
    res.setHeader("X-RateLimit-Limit", String(scanLimit.total));
    res.setHeader("X-RateLimit-Used", String(scanLimit.used));
    res.setHeader("X-RateLimit-Remaining", String(scanLimit.remaining));
  }
  next();
};
