// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("../middleware/auth", () => ({
  authMiddleware: vi.fn((_req, _res, next) => next()),
  orgAccessMiddleware: vi.fn((_req, _res, next) => next()),
}));

vi.mock("stripe", () => {
  const StripeMock = vi.fn(function () {
    return {
      checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }) } },
      subscriptions: { create: vi.fn().mockResolvedValue({ id: "sub_test" }) },
    };
  });
  return { default: StripeMock };
});

vi.mock("../db/pool", () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

process.env.STRIPE_SECRET_KEY = "sk_test_mock";

describe("Billing module", () => {
  it("loads billing module without errors", async () => {
    const mod = await import("../routes/billing");
    expect(mod.default).toBeDefined();
  });

  it("exports a router with routes", async () => {
    const mod = await import("../routes/billing");
    expect(mod.default.stack).toBeDefined();
    expect(Array.isArray(mod.default.stack)).toBe(true);
  });
});
