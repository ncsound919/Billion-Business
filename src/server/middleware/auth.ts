/**
 * Authentication Middleware
 * Validates JWT tokens and API keys
 */

import express from "express";
import { verifyToken } from "../auth/jwt.ts";
import { query } from "../db/pool.ts";
import { ApiKeyService } from "../services/apiKeyService.ts";
type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      orgId?: string;
      apiKeyId?: string;
      authType?: "jwt" | "api-key";
    }
  }
}

/**
 * Middleware to authenticate via JWT or API Key
 * Sets req.userId and req.orgId on success
 */
function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx > -1) {
      const name = part.slice(0, eqIdx).trim();
      const val = part.slice(eqIdx + 1).trim();
      cookies[name] = decodeURIComponent(val);
    }
  }
  return cookies;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const cookies = parseCookies(req.headers.cookie);
    const cookieToken = cookies["token"];

    // Check Authorization header first, then cookie
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : cookieToken || undefined;

    if (!token) {
      return res.status(401).json({ error: "Missing authorization" });
    }

    // Try JWT
    try {
      const payload = verifyToken(token);
      req.userId = payload.userId;
      req.orgId = payload.orgId;
      req.authType = "jwt";
      return next();
    } catch (err) {
      // If it wasn't an API key attempt either, return 401
      if (!authHeader?.startsWith("Bearer gr_")) {
        return res.status(401).json({ error: "Invalid token" });
      }
    }

    // API Key (only via Authorization header, not cookie)
    if (authHeader?.startsWith("Bearer gr_")) {
      const apiKey = authHeader.substring(7);
      try {
        const keyHash = ApiKeyService.hashKey(apiKey);
        const { rows } = await query(
          `SELECT id, org_id, user_id FROM api_keys WHERE key_hash = $1`,
          [keyHash]
        );

        if (!rows || rows.length === 0) {
          return res.status(401).json({ error: "Invalid API key" });
        }

        const apiKeyRecord = rows[0];
        req.apiKeyId = apiKeyRecord.id;
        req.orgId = apiKeyRecord.org_id;
        req.userId = apiKeyRecord.user_id;
        req.authType = "api-key";

        query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [
          apiKeyRecord.id,
        ]).catch(console.error);

        return next();
      } catch (err) {
        console.error("API key verification error:", err);
        return res.status(401).json({ error: "API key verification failed" });
      }
    }

    return res.status(401).json({ error: "Invalid authorization format" });
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Middleware to ensure user belongs to requested org
 * Use after authMiddleware
 */
export const orgAccessMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const requestedOrgId = req.params.orgId || req.query.orgId;
    const userOrgId = req.orgId;

    if (!requestedOrgId) {
      return next(); // No org parameter, skip validation
    }

    if (requestedOrgId !== userOrgId) {
      // Verify user belongs to org
      const { rows } = await query(
        `SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2`,
        [requestedOrgId, req.userId]
      );

      if (!rows || rows.length === 0) {
        return res.status(403).json({ error: "Access denied to this organization" });
      }
    }

    next();
  } catch (error) {
    console.error("Org access check error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
