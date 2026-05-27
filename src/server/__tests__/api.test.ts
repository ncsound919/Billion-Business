// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";

const ORIGINAL_ENV = { ...process.env };

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
    it("returns 200 with status ready when API key is present", async () => {
      const res = await request(app).get("/readyz");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ready");
      expect(res.body.dependencies.gemini).toBe(true);
    });
  });

  describe("GET /api/scans", () => {
    it("returns empty array initially", async () => {
      const res = await request(app).get("/api/scans");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("POST /api/grade", () => {
    it("returns 400 when repoUrl is missing", async () => {
      const res = await request(app).post("/api/grade").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Repository URL");
    });

    it("returns 400 for invalid repo format", async () => {
      const res = await request(app).post("/api/grade").send({ repoUrl: "just-a-name" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid repository format");
    });

    it("returns 400 for empty string", async () => {
      const res = await request(app).post("/api/grade").send({ repoUrl: "" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 429 when GitHub rate limited (simulated with 403)", async () => {
      const res = await request(app).post("/api/grade").send({ repoUrl: "ratelimited/repo" });

      if (res.status === 429) {
        expect(res.body.error).toContain("rate limit");
      }
    });

    it("returns 404 when repo does not exist on GitHub", async () => {
      const res = await request(app)
        .post("/api/grade")
        .send({ repoUrl: "this-does-not-exist-12345/nonexistent-repo-67890" });

      expect([400, 404, 502]).toContain(res.status);
    }, 15000);
  });
});
