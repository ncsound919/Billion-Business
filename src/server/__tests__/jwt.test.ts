// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";

describe("JWT utilities", () => {
  let mod: typeof import("../auth/jwt");

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret-for-testing";
    mod = await import("../auth/jwt");
  });

  it("generates a token with user claims", () => {
    const token = mod.generateToken({ userId: "user-123", orgId: "org-456" });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("generates tokens with different payloads", () => {
    const t1 = mod.generateToken({ userId: "user-123" });
    const t2 = mod.generateToken({ userId: "user-456" });
    const p1 = mod.verifyToken(t1);
    const p2 = mod.verifyToken(t2);
    expect(p1.userId).not.toBe(p2.userId);
  });

  it("generates a token without orgId", () => {
    const token = mod.generateToken({ userId: "user-123" });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifies a valid token and returns payload", () => {
    const token = mod.generateToken({ userId: "user-1", orgId: "org-1" });
    const payload = mod.verifyToken(token);
    expect(payload.userId).toBe("user-1");
    expect(payload.orgId).toBe("org-1");
  });

  it("throws for malformed token", () => {
    expect(() => mod.verifyToken("not-a-valid-token")).toThrow();
  });

  it("throws for tampered token", () => {
    const token = mod.generateToken({ userId: "user-1" });
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(() => mod.verifyToken(tampered)).toThrow();
  });

  it("throws for empty string", () => {
    expect(() => mod.verifyToken("")).toThrow();
  });
});
