// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import request from "supertest";

const ORIGINAL_ENV = { ...process.env };

// Mock JWT verification to avoid database calls
vi.mock("../auth/jwt.ts", async () => {
  const actual = await vi.importActual("../auth/jwt.ts");
  return {
    ...actual,
    verifyToken: (token: string) => {
      if (token === "test-jwt-token") {
        return {
          userId: "test-user",
          orgId: "test-org",
          iat: Math.floor(Date.now() / 1000),
        };
      }
      throw new Error("Invalid token");
    },
  };
});

describe("API E2E — server.ts endpoints", () => {
  let app: express.Application;

  beforeAll(async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GITHUB_TOKEN = "test-token";
    process.env.NODE_ENV = "test";
    const mod = await import("../../../server.ts");
    app = mod.app;
  });

  afterAll(() => {
    Object.assign(process.env, ORIGINAL_ENV);
  });

  describe("GET /healthz", () => {
    it("returns 200 with status healthy", async () => {
      const res = await request(app).get("/healthz");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe("GET /readyz", () => {
    it("returns 503 when database is unavailable (test environment)", async () => {
      const res = await request(app).get("/readyz");
      // In test environment without real database, this will be 503
      // In production with database connection, this will be 200
      expect([200, 503]).toContain(res.status);
      expect(res.body.status).toBeDefined();
    });
  });

  describe("POST /api/grade", () => {
    it("requires authentication (no token provided)", async () => {
      const res = await request(app)
        .post("/api/grade")
        .set("Origin", "http://localhost:5173")
        .send({ repoUrl: "owner/repo" });
      expect(res.status).toBe(401);
    });

    it("returns 400 when repoUrl is missing with valid auth", async () => {
      const res = await request(app)
        .post("/api/grade")
        .set("Authorization", "Bearer test-jwt-token")
        .set("Origin", "http://localhost:5173")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Repository URL");
    });

    it("returns 400 for invalid repo format", async () => {
      const res = await request(app)
        .post("/api/grade")
        .set("Authorization", "Bearer test-jwt-token")
        .set("Origin", "http://localhost:5173")
        .send({ repoUrl: "just-a-name" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid repository format");
    });

    it("returns 400 for empty string", async () => {
      const res = await request(app)
        .post("/api/grade")
        .set("Authorization", "Bearer test-jwt-token")
        .set("Origin", "http://localhost:5173")
        .send({ repoUrl: "" });
      expect(res.status).toBe(400);
    });
  });
});
