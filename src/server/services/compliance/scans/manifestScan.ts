/**
 * Manifest Scan — ~30 CWE rules based on package.json analysis.
 */

import type { CweFinding } from "./fileTreeScan.ts";

interface ManifestScanInput {
  packageJsonStr: string;
  fileList: string[];
}

interface PkgJson {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  main?: string;
  module?: string;
  types?: string;
  private?: boolean;
  [key: string]: unknown;
}

const MAX_SAFE_VERSIONS: Record<string, string> = {
  "lodash": "4.17.20",
  "axios": "0.28.0",
  "express": "4.18.0",
  "jsonwebtoken": "9.0.0",
  "minimist": "1.2.6",
  "node-fetch": "2.6.7",
  "undici": "5.19.1",
  "webpack-dev-server": "4.15.0",
  "protobufjs": "7.2.4",
  "next": "13.5.0",
  "prisma": "5.0.0",
};

function parsePkg(jsonStr: string): PkgJson | null {
  try {
    return JSON.parse(jsonStr) as PkgJson;
  } catch {
    return null;
  }
}

const DEPRECATED_PACKAGES: Record<string, string> = {
  "gulp": "Use Vite, esbuild, or Turbopack",
  "grunt": "Use Vite, esbuild, or Turbopack",
  "bower": "Use npm or yarn",
  "jslint": "Use ESLint",
  "tslint": "Use ESLint with typescript-eslint",
  "coffeescript": "Use TypeScript",
  "request": "Use fetch, got, or undici",
  "moment": "Use date-fns or dayjs",
  "underscore": "Use lodash or native array methods",
  "redux-thunk": "Use Redux Toolkit (RTK) instead",
  "connected-react-router": "Use React Router v6 built-in",
  "react-router-redux": "Use React Router v6 built-in",
};

const VULNERABLE_PATTERNS: Array<{ pkg: string; cweId: string }> = [
  { pkg: "lodash", cweId: "94" },
  { pkg: "axios", cweId: "79" },
  { pkg: "express", cweId: "79" },
  { pkg: "jsonwebtoken", cweId: "20" },
  { pkg: "minimist", cweId: "20" },
  { pkg: "node-fetch", cweId: "20" },
  { pkg: "undici", cweId: "20" },
  { pkg: "webpack-dev-server", cweId: "79" },
  { pkg: "protobufjs", cweId: "94" },
  { pkg: "next", cweId: "20" },
  { pkg: "prisma", cweId: "89" },
];

const INSECURE_PKG_PATTERNS: Array<{ pkg: string; cweId: string }> = [
  { pkg: "eval", cweId: "95" },
  { pkg: "sandbox", cweId: "94" },
  { pkg: "vm2", cweId: "94" },
  { pkg: "child_process", cweId: "78" },
  { pkg: "exec", cweId: "78" },
  { pkg: "spawn", cweId: "78" },
];

export function scanManifest(input: ManifestScanInput): CweFinding[] {
  const findings: CweFinding[] = [];
  const pkg = parsePkg(input.packageJsonStr);
  if (!pkg) return findings;

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };

  // ── Deprecated / outdated dependencies ────────────────────
  for (const [depName, reason] of Object.entries(DEPRECATED_PACKAGES)) {
    if (depName in allDeps) {
      findings.push({
        cweId: "208",
        evidence: `Deprecated package "${depName}" in use. ${reason}`,
        severity: "Medium",
        confidence: 0.9,
      });
    }
  }

  // ── Known vulnerable version patterns ─────────────────────
  for (const vp of VULNERABLE_PATTERNS) {
    const rawVer = allDeps[vp.pkg];
    if (!rawVer) continue;
    const safeVer = MAX_SAFE_VERSIONS[vp.pkg];
    if (!safeVer) continue;
    const cleaned = rawVer.replace(/^[\^~>=<]+\s*/, "").split(".").map(Number);
    const safeParts = safeVer.split(".").map(Number);
    const isVulnerable = cleaned.length === 3 && safeParts.length === 3 &&
      (cleaned[0] < safeParts[0] ||
       (cleaned[0] === safeParts[0] && cleaned[1] < safeParts[1]) ||
       (cleaned[0] === safeParts[0] && cleaned[1] === safeParts[1] && cleaned[2] <= safeParts[2]));
    if (isVulnerable) {
      findings.push({
        cweId: vp.cweId,
        evidence: `Package "${vp.pkg}" version ${rawVer} may be vulnerable (safe: >=${safeVer}).`,
        severity: "High",
        confidence: 0.5,
      });
    }
  }

  // ── Insecure package names ────────────────────────────────
  for (const ip of INSECURE_PKG_PATTERNS) {
    if (ip.pkg in allDeps) {
      findings.push({
        cweId: ip.cweId,
        evidence: `Potentially dangerous package "${ip.pkg}" in dependencies.`,
        severity: "High",
        confidence: 0.4,
      });
    }
  }

  // ── Missing scripts ───────────────────────────────────────
  const scripts = pkg.scripts ?? {};
  if (!scripts.test) {
    findings.push({
      cweId: "196",
      evidence: "No \"test\" script defined in package.json",
      severity: "Medium",
      confidence: 0.8,
    });
  }
  if (!scripts.build && !scripts.compile) {
    findings.push({
      cweId: "193",
      evidence: "No build/compile script defined",
      severity: "Low",
      confidence: 0.6,
    });
  }
  if (!scripts.lint) {
    findings.push({
      cweId: "193",
      evidence: "No lint script defined",
      severity: "Low",
      confidence: 0.6,
    });
  }
  if (!scripts.lint && !scripts.test && !scripts.build) {
    findings.push({
      cweId: "399",
      evidence: "No quality-check scripts (lint/test/build) defined",
      severity: "Low",
      confidence: 0.7,
    });
  }

  // ── Missing fields ────────────────────────────────────────
  if (!pkg.license) {
    findings.push({
      cweId: "203",
      evidence: "Missing license field in package.json",
      severity: "Low",
      confidence: 0.9,
    });
  }
  if (!pkg.repository) {
    findings.push({
      cweId: "211",
      evidence: "Missing repository field in package.json",
      severity: "Low",
      confidence: 0.8,
    });
  }
  if (!pkg.description) {
    findings.push({
      cweId: "209",
      evidence: "Missing description in package.json",
      severity: "Low",
      confidence: 0.8,
    });
  }

  // ── Dependency count warning ──────────────────────────────
  const depCount = Object.keys(allDeps).length;
  if (depCount > 100) {
    findings.push({
      cweId: "200",
      evidence: `High dependency count (${depCount}). May indicate excessive coupling or bloat.`,
      severity: "Medium",
      confidence: 0.5,
    });
  } else if (depCount > 50) {
    findings.push({
      cweId: "200",
      evidence: `Moderate dependency count (${depCount}). Consider reviewing.`,
      severity: "Low",
      confidence: 0.4,
    });
  }

  // ── Lock file check ───────────────────────────────────────
  const hasLock = input.fileList.some(
    (p) => /package-lock\.json$|yarn\.lock$|pnpm-lock\.yaml$/i.test(p)
  );
  if (!hasLock) {
    findings.push({
      cweId: "168",
      evidence: "No lock file committed; dependency resolution may be non-deterministic",
      severity: "High",
      confidence: 0.9,
    });
  }

  // ── TypeScript usage ──────────────────────────────────────
  if (!allDeps["typescript"] && !allDeps["@types/node"]) {
    findings.push({
      cweId: "252",
      evidence: "TypeScript not used — no type-checked return values",
      severity: "Medium",
      confidence: 0.5,
    });
  }

  // ── Engines field ─────────────────────────────────────────
  if (!pkg.engines || Object.keys(pkg.engines).length === 0) {
    findings.push({
      cweId: "193",
      evidence: "Missing engines field in package.json; runtime constraints unclear",
      severity: "Low",
      confidence: 0.6,
    });
  }

  return findings;
}
