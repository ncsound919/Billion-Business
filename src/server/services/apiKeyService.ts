/**
 * API Key Service
 * Manages API key generation, hashing, and verification
 */

import crypto from "crypto";

export interface ApiKey {
  id: string;
  orgId: string;
  keyHash: string;
  prefix: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export class ApiKeyService {
  /**
   * Generate a new API key
   * Returns the plaintext key (shown only once to user)
   */
  static generateKey(orgId: string, name: string): { key: string; prefix: string } {
    const randomPart = crypto.randomBytes(24).toString("hex");
    const key = `gr_${randomPart}`;
    const prefix = key.substring(0, 7); // "gr_xyz"

    return { key, prefix };
  }

  /**
   * Hash an API key for storage
   */
  static hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
  }

  /**
   * Verify an API key against stored hash
   */
  static verifyKey(key: string, hash: string): boolean {
    const computedHash = this.hashKey(key);
    if (computedHash.length !== hash.length) {
      return false;
    }
    return crypto.timingSafeEqual(
      Buffer.from(computedHash),
      Buffer.from(hash)
    );
  }
}
