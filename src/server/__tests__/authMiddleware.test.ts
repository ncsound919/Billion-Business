// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../auth/jwt", () => ({
  generateToken: vi.fn(),
  verifyToken: vi.fn(),
}));

const { authMiddleware } = await import("../middleware/auth");
const jwtMod = await import("../auth/jwt");

function mockReq(overrides = {}) {
  return {
    headers: {},
    ...overrides,
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function mockJwtToken() {
  return "mock-jwt-valid-token-string";
}

function mockJwtTokenNoOrg() {
  return "mock-jwt-valid-token-no-org";
}

describe("Auth middleware", () => {
  const validToken = mockJwtToken();
  const validTokenNoOrg = mockJwtTokenNoOrg();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no Authorization header", async () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header is malformed", async () => {
    const req = mockReq({ headers: { authorization: "NotBearer token" } });
    const res = mockRes();
    const next = vi.fn();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header has no token", async () => {
    const req = mockReq({ headers: { authorization: "Bearer " } });
    const res = mockRes();
    const next = vi.fn();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 for expired/invalid token", async () => {
    vi.mocked(jwtMod.verifyToken).mockImplementationOnce(() => {
      throw new Error("Invalid token");
    });
    const req = mockReq({ headers: { authorization: "Bearer expired-token" } });
    const res = mockRes();
    const next = vi.fn();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() with valid Bearer token", async () => {
    vi.mocked(jwtMod.verifyToken).mockReturnValue({ userId: "user-1", orgId: "org-1" });
    const req = mockReq({ headers: { authorization: `Bearer ${validToken}` } });
    const res = mockRes();
    const next = vi.fn();
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe("user-1");
    expect(req.orgId).toBe("org-1");
  });

  it("sets userId but not orgId when token has no org", async () => {
    vi.mocked(jwtMod.verifyToken).mockReturnValue({ userId: "user-2" });
    const req = mockReq({ headers: { authorization: `Bearer ${validTokenNoOrg}` } });
    const res = mockRes();
    const next = vi.fn();
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe("user-2");
    expect(req.orgId).toBeUndefined();
  });
});
