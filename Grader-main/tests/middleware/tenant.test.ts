
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanLimitMiddleware, apiRateLimitMiddleware } from '../../src/server/middleware/tenant.ts';
import { query } from '../../src/server/db/pool.ts';

// Mock the query function
vi.mock('../../src/server/db/pool.ts', () => ({
  query: vi.fn(),
}));

describe('Tenant Middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = { orgId: 'org123' };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('scanLimitMiddleware', () => {
    it('should block when scan limit is reached', async () => {
      (query as any)
        .mockResolvedValueOnce({ rows: [{ plan_tier: 'free' }] }) // Org tier
        .mockResolvedValueOnce({ rows: [{ count: '3' }] }); // Scan count (3 is limit for free)

      await scanLimitMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow when scan limit is not reached', async () => {
      (query as any)
        .mockResolvedValueOnce({ rows: [{ plan_tier: 'starter' }] }) // Starter limit is 30
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await scanLimitMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('apiRateLimitMiddleware', () => {
    it('should block when API tier is free', async () => {
      (query as any).mockResolvedValueOnce({ rows: [{ plan_tier: 'free' }] });

      await apiRateLimitMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
