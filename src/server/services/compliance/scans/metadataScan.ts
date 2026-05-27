/**
 * Metadata Scan — ~28 CWE rules based on GitHub API metadata.
 */

import type { CweFinding } from "./fileTreeScan.ts";

interface MetadataScanInput {
  repoMeta: Record<string, unknown> | null;
  readmeStr: string;
  fileList: string[];
}

export function scanMetadata(input: MetadataScanInput): CweFinding[] {
  const findings: CweFinding[] = [];
  const meta = input.repoMeta;
  if (!meta) return findings;

  // ── Visibility & access ──────────────────────────────────
  if (meta.visibility === "private") {
    findings.push({
      cweId: "156",
      evidence: "Repository is private — not auditable",
      severity: "Low",
      confidence: 0.3,
    });
  }

  // ── License ──────────────────────────────────────────────
  if (!meta.license) {
    findings.push({
      cweId: "203",
      evidence: "No open-source license detected",
      severity: "Medium",
      confidence: 0.9,
    });
  }

  // ── Stars / popularity ───────────────────────────────────
  const stars = Number(meta.stargazers_count ?? meta.stars ?? 0);
  if (stars === 0) {
    findings.push({
      cweId: "142",
      evidence: "Repository has no stars; limited community validation",
      severity: "Low",
      confidence: 0.3,
    });
  }
  // ── Forks ────────────────────────────────────────────────
  const forks = Number(meta.forks_count ?? meta.forks ?? 0);
  if (forks === 0 && stars > 0) {
    findings.push({
      cweId: "211",
      evidence: "No forks despite having stars; community engagement may be passive",
      severity: "Low",
      confidence: 0.3,
    });
  }

  // ── Open issues ─────────────────────────────────────────
  const issues = Number(meta.open_issues_count ?? meta.open_issues ?? 0);
  if (issues > 100) {
    findings.push({
      cweId: "399",
      evidence: `High open issue count (${issues}); may indicate maintenance debt`,
      severity: "Medium",
      confidence: 0.5,
    });
  } else if (issues > 20) {
    findings.push({
      cweId: "399",
      evidence: `Moderate open issue count (${issues})`,
      severity: "Low",
      confidence: 0.4,
    });
  }

  // ── Last push / staleness ───────────────────────────────
  const pushedAt = meta.pushed_at as string | undefined;
  if (pushedAt) {
    const lastPush = new Date(pushedAt).getTime();
    const monthsAgo = (Date.now() - lastPush) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo > 12) {
      findings.push({
        cweId: "203",
        evidence: `Repository not updated in ${Math.round(monthsAgo)} months; possible abandonment`,
        severity: "High",
        confidence: 0.8,
      });
    } else if (monthsAgo > 6) {
      findings.push({
        cweId: "203",
        evidence: `Repository not updated in ${Math.round(monthsAgo)} months`,
        severity: "Medium",
        confidence: 0.6,
      });
    }
  }

  // ── Default branch ──────────────────────────────────────
  const defaultBranch = meta.default_branch as string | undefined;
  if (defaultBranch && defaultBranch !== "main") {
    findings.push({
      cweId: "193",
      evidence: `Default branch is "${defaultBranch}" instead of "main"`,
      severity: "Low",
      confidence: 0.3,
    });
  }

  // ── Topics / tags ───────────────────────────────────────
  const topics = meta.topics as string[] | undefined;
  if (!topics || topics.length === 0) {
    findings.push({
      cweId: "142",
      evidence: "No repository topics defined; reduces discoverability",
      severity: "Low",
      confidence: 0.5,
    });
  }

  // ── Homepage ────────────────────────────────────────────
  if (!meta.homepage) {
    findings.push({
      cweId: "211",
      evidence: "No homepage URL set",
      severity: "Low",
      confidence: 0.4,
    });
  }

  // ── Language detection ──────────────────────────────────
  const lang = meta.language as string | undefined;
  if (lang && lang.toLowerCase() === "javascript") {
    findings.push({
      cweId: "252",
      evidence: "Primary language is JavaScript (not TypeScript); no type safety",
      severity: "Medium",
      confidence: 0.4,
    });
  }

  // ── Has Wiki ────────────────────────────────────────────
  const hasWiki = meta.has_wiki;
  if (hasWiki === false) {
    findings.push({
      cweId: "211",
      evidence: "Wiki is disabled",
      severity: "Low",
      confidence: 0.3,
    });
  }

  // ── Has Discussions ─────────────────────────────────────
  const hasDiscussions = meta.has_discussions;
  if (hasDiscussions === false) {
    findings.push({
      cweId: "211",
      evidence: "Discussions are disabled",
      severity: "Low",
      confidence: 0.2,
    });
  }

  // ── Archived ────────────────────────────────────────────
  if (meta.archived) {
    findings.push({
      cweId: "203",
      evidence: "Repository is archived — read-only",
      severity: "Critical",
      confidence: 1.0,
    });
  }

  // ── Fork indicator ──────────────────────────────────────
  if (meta.fork) {
    findings.push({
      cweId: "211",
      evidence: "Repository is a fork; consider evaluating upstream",
      severity: "Low",
      confidence: 0.5,
    });
  }

  // ── Template repository ─────────────────────────────────
  if (meta.is_template) {
    findings.push({
      cweId: "211",
      evidence: "Repository is a template",
      severity: "Low",
      confidence: 0.3,
    });
  }

  // ── Size ────────────────────────────────────────────────
  const size = Number(meta.size ?? 0);
  if (size > 100000) {
    findings.push({
      cweId: "186",
      evidence: `Repository is very large (${Math.round(size / 1024)} MB); potential bloat`,
      severity: "Medium",
      confidence: 0.6,
    });
  }

  // ── Topics without security keywords ────────────────────
  if (topics && topics.length > 0) {
    const secTopics = topics.filter((t) => /security|vuln|cve|auth/i.test(t));
    if (secTopics.length === 0) {
      findings.push({
        cweId: "142",
        evidence: "No security-related repository topics defined",
        severity: "Low",
        confidence: 0.4,
      });
    }
  }

  // ── File count alarm ────────────────────────────────────
  if (input.fileList.length > 500) {
    findings.push({
      cweId: "198",
      evidence: `${input.fileList.length} files in repository; may indicate excessive complexity`,
      severity: "Low",
      confidence: 0.4,
    });
  }

  return findings;
}
