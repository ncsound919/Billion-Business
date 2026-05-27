/**
 * ComplianceService — Aggregates all 4 scans, computes CISQ dimension
 * scores, generates a deterministic cert validation ID, and produces
 * the final ComplianceDetail response.
 */
import { createHash } from "crypto";
import { CweCatalogService, type CweDimension } from "./cweCatalog.ts";
import { scanFileTree } from "./scans/fileTreeScan.ts";
import { scanManifest } from "./scans/manifestScan.ts";
import { scanReadme } from "./scans/readmeScan.ts";
import { scanMetadata } from "./scans/metadataScan.ts";
import type { CweFinding } from "./scans/fileTreeScan.ts";

export interface ComplianceDetail {
  iso5055Compliant: boolean;
  certValidationId: string;
  scannedAt: string;
  summary: string;

  /** Per-dimension scores (0-100) */
  reliabilityScore: number;
  securityPracticesScore: number;
  performanceScore: number;
  maintainabilityPracticesScore: number;

  /** Aggregated findings */
  totalFindings: number;
  severeViolationsCount: number;
  findings: CweFinding[];

  /** Grouped by CISQ dimension */
  byDimension: Record<CweDimension, { score: number; count: number; findings: CweFinding[] }>;

  /** CWE catalog coverage — how many of the 138 were triggered */
  cweCoverage: { triggered: number; total: number; triggeredIds: string[] };
}

interface RepoData {
  repoMeta: Record<string, unknown> | null;
  packageJsonStr: string;
  readmeStr: string;
  fileList: string[];
}

// ── Severity weight matrix for scoring ─────────────────────────
const SEVERITY_PENALTY: Record<string, number> = {
  Critical: 25,
  High: 10,
  Medium: 5,
  Low: 1,
};

function computeDimensionScore(findings: CweFinding[]): number {
  if (findings.length === 0) return 100;
  const penalty = findings.reduce((sum, f) => sum + (SEVERITY_PENALTY[f.severity] ?? 0), 0);
  // Each penalty point reduces score; cap at 0
  return Math.max(0, Math.min(100, 100 - penalty));
}

function generateCertId(owner: string, repo: string, findings: CweFinding[]): string {
  const sorted = [...findings]
    .sort((a, b) => a.cweId.localeCompare(b.cweId))
    .map((f) => `${f.cweId}:${f.severity}`)
    .join(",");
  const hash = createHash("sha256")
    .update(`${owner}/${repo}|${sorted}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();
  return `ISO-5055-${hash}-${new Date().getFullYear()}`;
}

function computeSummary(findings: CweFinding[]): string {
  const critical = findings.filter((f) => f.severity === "Critical").length;
  const high = findings.filter((f) => f.severity === "High").length;
  const medium = findings.filter((f) => f.severity === "Medium").length;
  const low = findings.filter((f) => f.severity === "Low").length;
  const parts: string[] = [];
  if (critical) parts.push(`${critical} critical`);
  if (high) parts.push(`${high} high`);
  if (medium) parts.push(`${medium} medium`);
  if (low) parts.push(`${low} low`);
  if (parts.length === 0) return "No ISO 5055 weaknesses detected.";
  return `${parts.join(", ")} severity ISO 5055 weaknesses detected.`;
}

export class ComplianceService {
  static runCompliance(owner: string, repo: string, repoData: RepoData): ComplianceDetail {
    // ── Run all 4 scans ──────────────────────────────────
    const fileFindings = scanFileTree({ fileList: repoData.fileList });
    const manifestFindings = scanManifest({
      packageJsonStr: repoData.packageJsonStr,
      fileList: repoData.fileList,
    });
    const readmeFindings = scanReadme({ readmeStr: repoData.readmeStr });
    const metadataFindings = scanMetadata({
      repoMeta: repoData.repoMeta,
      readmeStr: repoData.readmeStr,
      fileList: repoData.fileList,
    });

    // ── Aggregate & deduplicate ──────────────────────────
    const allRaw = [...fileFindings, ...manifestFindings, ...readmeFindings, ...metadataFindings];
    const seen = new Set<string>();
    const allFindings: CweFinding[] = [];
    for (const f of allRaw) {
      // Dedup by CWE ID + evidence snippet
      const key = `${f.cweId}:${f.filePath ?? ""}:${f.evidence.slice(0, 60)}`;
      if (!seen.has(key)) {
        seen.add(key);
        allFindings.push(f);
      }
    }

    // ── Group by dimension ───────────────────────────────
    const byDimension: Record<string, { score: number; count: number; findings: CweFinding[] }> = {
      Reliability: { score: 100, count: 0, findings: [] },
      Security: { score: 100, count: 0, findings: [] },
      Performance: { score: 100, count: 0, findings: [] },
      Maintainability: { score: 100, count: 0, findings: [] },
    };

    for (const f of allFindings) {
      const entry = CweCatalogService.getById(f.cweId);
      if (!entry) continue;
      const dim = entry.dimension;
      if (!byDimension[dim]) continue;
      byDimension[dim].findings.push(f);
      byDimension[dim].count++;
    }

    for (const dim of Object.keys(byDimension)) {
      byDimension[dim].score = computeDimensionScore(byDimension[dim].findings);
    }

    // ── Compute overall dimension scores ────────────────
    const reliabilityScore = computeDimensionScore(byDimension.Reliability.findings);
    const securityScore = computeDimensionScore(byDimension.Security.findings);
    const performanceScore = computeDimensionScore(byDimension.Performance.findings);
    const maintainabilityScore = computeDimensionScore(byDimension.Maintainability.findings);

    // ── Severity counts ──────────────────────────────────
    const severeViolationsCount = allFindings.filter(
      (f) => f.severity === "Critical" || f.severity === "High"
    ).length;

    // ── CWE coverage ─────────────────────────────────────
    const triggeredIds = [...new Set(allFindings.map((f) => f.cweId))].filter((id) =>
      CweCatalogService.isValid(id)
    );
    const totalCwes = CweCatalogService.getAll().length;

    // ── Cert ID ──────────────────────────────────────────
    const certId = generateCertId(owner, repo, allFindings);

    // ── Overall compliance ───────────────────────────────
    const avgScore = (reliabilityScore + securityScore + performanceScore + maintainabilityScore) / 4;
    const iso5055Compliant = avgScore >= 70 && severeViolationsCount < 5;

    return {
      iso5055Compliant,
      certValidationId: certId,
      scannedAt: new Date().toISOString(),
      summary: computeSummary(allFindings),
      reliabilityScore,
      securityPracticesScore: securityScore,
      performanceScore,
      maintainabilityPracticesScore: maintainabilityScore,
      totalFindings: allFindings.length,
      severeViolationsCount,
      findings: allFindings,
      byDimension: byDimension as ComplianceDetail["byDimension"],
      cweCoverage: {
        triggered: triggeredIds.length,
        total: totalCwes,
        triggeredIds,
      },
    };
  }
}
