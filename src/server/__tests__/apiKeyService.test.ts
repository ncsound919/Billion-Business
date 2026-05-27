// @vitest-environment node
import { describe, it, expect } from "vitest";
import { ApiKeyService } from "../services/apiKeyService";

describe("ApiKeyService", () => {
  const orgId = "org-test-1";
  const keyName = "My Test Key";

  describe("generateKey", () => {
    it("returns a key with gr_ prefix and plain prefix", () => {
      const { key, prefix } = ApiKeyService.generateKey(orgId, keyName);
      expect(key).toMatch(/^gr_/);
      expect(key.length).toBeGreaterThan(20);
      expect(prefix).toMatch(/^gr_/);
      expect(prefix.length).toBeLessThan(key.length);
    });

    it("generates unique keys each time", () => {
      const { key: k1 } = ApiKeyService.generateKey(orgId, keyName);
      const { key: k2 } = ApiKeyService.generateKey(orgId, keyName);
      expect(k1).not.toBe(k2);
    });

    it("prefix is the first 10 chars of the key", () => {
      const { key, prefix } = ApiKeyService.generateKey(orgId, keyName);
      expect(key.startsWith(prefix)).toBe(true);
    });
  });

  describe("hashKey", () => {
    it("returns a hex string", () => {
      const hash = ApiKeyService.hashKey("gr_test_key_value");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("returns same hash for same input", () => {
      const input = "gr_test_key_value";
      const h1 = ApiKeyService.hashKey(input);
      const h2 = ApiKeyService.hashKey(input);
      expect(h1).toBe(h2);
    });

    it("returns different hash for different input", () => {
      const h1 = ApiKeyService.hashKey("gr_key_one");
      const h2 = ApiKeyService.hashKey("gr_key_two");
      expect(h1).not.toBe(h2);
    });
  });

  describe("verifyKey", () => {
    it("returns true for matching key and hash", () => {
      const key = "gr_my_test_key_abc123";
      const hash = ApiKeyService.hashKey(key);
      expect(ApiKeyService.verifyKey(key, hash)).toBe(true);
    });

    it("returns false for non-matching key and hash", () => {
      const hash = ApiKeyService.hashKey("gr_real_key");
      expect(ApiKeyService.verifyKey("gr_wrong_key", hash)).toBe(false);
    });

  it("returns false for empty inputs", () => {
    expect(ApiKeyService.verifyKey("", "")).toBe(false);
    expect(ApiKeyService.verifyKey("gr_key", "")).toBe(false);
    expect(ApiKeyService.verifyKey("", "somehash")).toBe(false);
  });
  });
});
