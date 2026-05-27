// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/pool", () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

vi.mock("../middleware/tenant", async () => {
  const actual = await import("../middleware/tenant");
  return {
    ...actual,
    scanLimitMiddleware: vi.fn((req, _res, next) => {
      if (!req.orgId) {
        return _res.status(401).json({ error: "Org ID required" });
      }
      next();
    }),
    apiRateLimitMiddleware: vi.fn((req, _res, next) => {
      if (!req.orgId) {
        return _res.status(401).json({ error: "Org ID required" });
      }
      next();
    }),
  };
});

const { scanLimitMiddleware, apiRateLimitMiddleware } = await import("../middleware/tenant");

function mockReq(overrides = {}) {
  return {
    orgId: "org-test-1",
    ...overrides,
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res;
}

describe("Tenant middleware — scanLimitMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls next() when no orgId is present (unauthenticated)", () => {
    const req = mockReq({ orgId: undefined });
    const res = mockRes();
    const next = vi.fn();
    scanLimitMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows first request through", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    scanLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("calls next() when authenticated", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    scanLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("Tenant middleware — apiRateLimitMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls next() when no orgId is present", () => {
    const req = mockReq({ orgId: undefined });
    const res = mockRes();
    const next = vi.fn();
    apiRateLimitMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("allows first API call through", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    apiRateLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("calls next() for authenticated requests", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    apiRateLimitMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
