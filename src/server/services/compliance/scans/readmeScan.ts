/**
 * Readme Scan — ~20 CWE rules based on README content analysis.
 */

import type { CweFinding } from "./fileTreeScan.ts";

interface ReadmeScanInput {
  readmeStr: string;
}

const RECOMMENDED_SECTIONS = [
  { keyword: "install", name: "Installation", cweId: "193", severity: "Low" as const },
  { keyword: "usage", name: "Usage", cweId: "193", severity: "Low" as const },
  { keyword: "api", name: "API Documentation", cweId: "225", severity: "Medium" as const },
  { keyword: "test", name: "Testing", cweId: "196", severity: "Medium" as const },
  { keyword: "contribut", name: "Contributing", cweId: "211", severity: "Low" as const },
  { keyword: "license", name: "License", cweId: "203", severity: "Low" as const },
  { keyword: "badge", name: "Status Badges", cweId: "142", severity: "Low" as const },
  { keyword: "ci", name: "CI Status", cweId: "193", severity: "Low" as const },
  { keyword: "coverage", name: "Test Coverage", cweId: "196", severity: "Medium" as const },
  { keyword: "depend", name: "Dependencies", cweId: "200", severity: "Low" as const },
  { keyword: "exam", name: "Examples", cweId: "225", severity: "Low" as const },
  { keyword: "changelog", name: "Changelog", cweId: "211", severity: "Low" as const },
  { keyword: "roadmap", name: "Roadmap", cweId: "211", severity: "Low" as const },
  { keyword: "faq", name: "FAQ", cweId: "225", severity: "Low" as const },
  { keyword: "acknowledg", name: "Acknowledgments", cweId: "211", severity: "Low" as const },
  { keyword: "secur", name: "Security Policy", cweId: "142", severity: "High" as const },
  { keyword: "support", name: "Support", cweId: "211", severity: "Low" as const },
];

export function scanReadme(input: ReadmeScanInput): CweFinding[] {
  const findings: CweFinding[] = [];
  const readme = input.readmeStr || "";

  if (!readme) {
    findings.push({
      cweId: "203",
      evidence: "No README.md found",
      severity: "High",
      confidence: 1.0,
    });
    return findings;
  }

  const lower = readme.toLowerCase();

  // ── Check for recommended sections ────────────────────────
  for (const section of RECOMMENDED_SECTIONS) {
    if (!lower.includes(section.keyword)) {
      findings.push({
        cweId: section.cweId,
        evidence: `Missing "${section.name}" section in README`,
        severity: section.severity,
        confidence: 0.7,
      });
    }
  }

  // ── README length / quality ───────────────────────────────
  const wordCount = readme.split(/\s+/).length;
  if (wordCount < 30) {
    findings.push({
      cweId: "209",
      evidence: `README is very short (${wordCount} words); may lack sufficient documentation`,
      severity: "Medium",
      confidence: 0.6,
    });
  }

  // ── Badges indicate CI quality ────────────────────────────
  const hasBadges = lower.includes("https://") && /shield\.io|github\.com\/.*\/actions|codecov|coveralls|circleci|travis/i.test(lower);
  if (!hasBadges) {
    findings.push({
      cweId: "142",
      evidence: "No CI/quality badges found in README",
      severity: "Low",
      confidence: 0.5,
    });
  }

  // ── Missing code of conduct ───────────────────────────────
  if (!lower.includes("code of conduct") && !lower.includes("coc")) {
    findings.push({
      cweId: "211",
      evidence: "No Code of Conduct referenced in README",
      severity: "Low",
      confidence: 0.4,
    });
  }

  // ── Installation instructions ─────────────────────────────
  if (!lower.includes("npm install") && !lower.includes("yarn add") && !lower.includes("pip install") && !lower.includes("go get")) {
    findings.push({
      cweId: "225",
      evidence: "No explicit installation instructions in README",
      severity: "Low",
      confidence: 0.6,
    });
  }

  // ── Quick start ──────────────────────────────────────────
  if (!lower.includes("quick start") && !lower.includes("getting started")) {
    findings.push({
      cweId: "225",
      evidence: "No quick start / getting started guide in README",
      severity: "Low",
      confidence: 0.5,
    });
  }

  return findings;
}
