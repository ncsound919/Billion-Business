/**
 * CWE Catalog Route
 * GET /api/v1/cwe — full CWE catalog with optional dimension filter
 */
import express from "express";
import { CweCatalogService } from "../services/compliance/cweCatalog.ts";

const { Router } = express;

const router = Router();

/**
 * GET /api/v1/cwe
 * Returns the full ISO 5055 CWE catalog, optionally filtered by dimension
 * Query params: ?dimension=Security|Reliability|Performance|Maintainability
 */
router.get("/", (_req, res) => {
  const dimension = _req.query.dimension as string | undefined;

  let entries = CweCatalogService.getAll();

  if (dimension) {
    const valid = ["Reliability", "Security", "Performance", "Maintainability"];
    if (!valid.includes(dimension)) {
      return res.status(400).json({ error: `Invalid dimension. Must be one of: ${valid.join(", ")}` });
    }
    entries = entries.filter((e) => e.dimension === dimension);
  }

  res.json({
    total: entries.length,
    dimensions: CweCatalogService.getStats(),
    entries,
  });
});

export default router;
