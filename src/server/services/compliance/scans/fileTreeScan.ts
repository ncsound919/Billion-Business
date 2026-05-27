/**
 * File-Tree Scan — ~60 CWE rules based on file names and directory structure.
 *
 * Runs one pass over the file list, evaluating all path-based rules simultaneously.
 */

export interface CweFinding {
  cweId: string;
  evidence: string;
  filePath?: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence: number; // 0-1
}

interface FileTreeScanInput {
  fileList: string[];
}

// ── File-level rule definitions ────────────────────────────────

type FileRule = (path: string) => CweFinding | null;
type RepoRule = (paths: string[]) => CweFinding[];

const FILE_RULES: Array<{ cweId: string; name: string; test: (p: string) => boolean; severity: CweFinding["severity"] }> = [
  // Security — hardcoded secrets
  { cweId: "140", name: "Hardcoded Credentials", test: (p) => /\.env$/i.test(p) || /\.env\./.test(p), severity: "Critical" },
  { cweId: "140", name: "Hardcoded Credentials", test: (p) => /credentials?\.[a-z]+$/i.test(p), severity: "High" },
  { cweId: "140", name: "Hardcoded Credentials", test: (p) => /secrets?\.[a-z]+$/i.test(p), severity: "High" },
  { cweId: "140", name: "Hardcoded Credentials", test: (p) => /passwords?\.[a-z]+$/i.test(p), severity: "High" },
  { cweId: "140", name: "Hardcoded Credentials", test: (p) => /\.(p12|pfx|jks|keystore)$/i.test(p), severity: "Critical" },
  { cweId: "159", name: "Hardcoded Key", test: (p) => /\.key$/i.test(p) || /private.*\.pem$/i.test(p), severity: "Critical" },
  { cweId: "158", name: "Weak Encryption", test: (p) => /md5\./i.test(p), severity: "Medium" },

  // Security — configuration issues
  { cweId: "156", name: "Insecure Configuration", test: (p) => /\.conf$/i.test(p) && /config/i.test(p), severity: "Medium" },
  { cweId: "156", name: "Insecure Configuration", test: (p) => /\.htaccess$/i.test(p), severity: "Medium" },
  { cweId: "156", name: "Insecure Configuration", test: (p) => /nginx\.conf$/i.test(p), severity: "Low" },

  // Security — injection
  { cweId: "94", name: "Code Injection", test: (p) => /eval\b/i.test(p) && /\.[jt]sx?$/i.test(p), severity: "Critical" },
  { cweId: "78", name: "OS Command Injection", test: (p) => /exec\b/i.test(p) || /spawn\b/i.test(p), severity: "High" },
  { cweId: "89", name: "SQL Injection", test: (p) => /sql.*inject|raw.*sql/i.test(p) && /\.[jt]sx?$/i.test(p), severity: "Critical" },
  { cweId: "79", name: "Cross-site Scripting", test: (p) => /xss/i.test(p), severity: "High" },

  // Maintainability — dead/unused code
  { cweId: "203", name: "Dead Code", test: (p) => /\.dead\./i.test(p), severity: "Medium" },
  { cweId: "204", name: "Unreachable Code", test: (p) => /unused/i.test(p) && /\.[jt]sx?$/i.test(p), severity: "Low" },
  { cweId: "205", name: "Unused Variable", test: (p) => /\btodo\b/i.test(p) && /\.[jt]sx?$/i.test(p), severity: "Low" },
  { cweId: "203", name: "Dead Code", test: (p) => /\.old\./i.test(p) || /\.bak\./i.test(p) || /\.deprecated\./i.test(p), severity: "Medium" },

  // Maintainability — duplication
  { cweId: "201", name: "Duplicate Code", test: (p) => /copy\b/i.test(p) || /_copy\b/.test(p), severity: "Medium" },

  // Maintainability — complexity indicators
  { cweId: "196", name: "Excessive Method Length", test: (p) => /\/(complex|god|blob|monster)\b/i.test(p), severity: "Medium" },
  { cweId: "213", name: "Circular Dependency", test: (p) => /circular/i.test(p), severity: "High" },

  // Maintainability — missing docs
  { cweId: "225", name: "Middle Man", test: (p) => /proxy|wrapper|delegate/i.test(p), severity: "Low" },

  // Performance — large files
  { cweId: "187", name: "String Concatenation in Loop", test: (p) => /concat/i.test(p) && /\.[jt]sx?$/i.test(p), severity: "Medium" },
  { cweId: "186", name: "Large Object Allocation", test: (p) => /\.(zip|tar|gz)$/i.test(p) || /\.(iso|dmg)$/i.test(p), severity: "Low" },
];

const REPO_RULES: Array<{ cweId: string; name: string; check: (paths: string[]) => string | null; severity: CweFinding["severity"] }> = [
  // Security
  {
    cweId: "142", name: "Exposure of Sensitive Information",
    check: (paths) => paths.some((p) => /\.gitignore$/i.test(p)) ? null : "No .gitignore file found",
    severity: "Medium",
  },
  {
    cweId: "142", name: "Exposure of Sensitive Information",
    check: (paths) => paths.some((p) => /\.npmrc$/i.test(p)) ? "Found .npmrc file (may contain tokens)" : null,
    severity: "High",
  },

  // Reliability
  {
    cweId: "399", name: "Resource Management Errors",
    check: (paths) => {
      const srcFiles = paths.filter((p) => /\.[jt]sx?$/i.test(p));
      return srcFiles.length === 0 ? "No source files found" : null;
    },
    severity: "Low",
  },
  {
    cweId: "399", name: "Resource Management Errors",
    check: (paths) => paths.some((p) => /\/lock$/i.test(p) || /lock\./.test(p)) ? null : "No lock files, potential dependency drift",
    severity: "Low",
  },
  {
    cweId: "252", name: "Unchecked Return Value",
    check: (paths) => {
      const tsFiles = paths.filter((p) => /\.[jt]sx?$/i.test(p));
      const hasTypes = tsFiles.some((p) => /\.tsx?$/i.test(p));
      return !hasTypes && tsFiles.length > 0 ? "TypeScript not used; no type-checked return values" : null;
    },
    severity: "Medium",
  },

  // Maintainability
  {
    cweId: "196", name: "Excessive Method Length",
    check: (paths) => {
      const testCount = paths.filter((p) => /\.(test|spec|e2e)\.(ts|tsx|js|jsx)$/i.test(p)).length;
      const srcCount = paths.filter((p) => /\.[jt]sx?$/i.test(p) && !/\.(test|spec|e2e)\./i.test(p)).length;
      return srcCount > 0 && testCount === 0 ? "No test files found alongside source files" : null;
    },
    severity: "Medium",
  },
  {
    cweId: "211", name: "Missing Encapsulation",
    check: (paths) => {
      const hasSrcDir = paths.some((p) => p.startsWith("src/") || p.startsWith("lib/") || p.startsWith("app/"));
      const hasTests = paths.some((p) => /\.(test|spec)\./i.test(p));
      return hasSrcDir && !hasTests ? "Source directory found but no corresponding tests" : null;
    },
    severity: "Medium",
  },
  {
    cweId: "193", name: "Excessive Cyclomatic Complexity",
    check: (paths) => {
      const hasCi = paths.some((p) => /\.github\/workflows/i.test(p) || /\.gitlab-ci/i.test(p));
      return !hasCi ? "No CI/CD configuration detected" : null;
    },
    severity: "Low",
  },
  {
    cweId: "193", name: "Excessive Cyclomatic Complexity",
    check: (paths) => {
      const lintDirs = [".eslintrc", ".eslintrc.json", ".eslintrc.js", ".eslintrc.yaml", ".eslintrc.yml", ".prettierrc", ".prettierrc.json", "tsconfig.json"];
      const missing = lintDirs.filter((d) => !paths.some((p) => p.includes(d) || p === d));
      return missing.length >= 3 ? `Missing lint/tsconfig config files (${missing.slice(0, 3).join(", ")})` : null;
    },
    severity: "Low",
  },
  {
    cweId: "213", name: "Circular Dependency",
    check: (paths) => paths.some((p) => /\/index\.(ts|js)$/i.test(p)) ? null : "No barrel/index files; potential import chaos",
    severity: "Low",
  },
  {
    cweId: "214", name: "Layering Violation",
    check: (paths) => {
      const hasMonorepo = paths.some((p) => /^(packages|apps|modules)\//.test(p));
      return hasMonorepo ? null : "No monorepo structure detected";
    },
    severity: "Low",
  },
  {
    cweId: "202", name: "Duplicate Code",
    check: (paths) => {
      const files = paths.map((p) => p.split("/").pop() ?? "");
      const nameCounts = new Map<string, number>();
      files.forEach((f) => nameCounts.set(f, (nameCounts.get(f) ?? 0) + 1));
      const dups = [...nameCounts.entries()].filter(([n, c]) => c > 2 && !/^\./.test(n)).map(([n]) => n);
      return dups.length > 0 ? `Duplicate filenames found: ${dups.join(", ")}` : null;
    },
    severity: "Low",
  },
  {
    cweId: "216", name: "God Object",
    check: (paths) => {
      const bigSrc = paths.filter((p) => /\.[jt]sx?$/i.test(p) && !/\.(test|spec|config)\./i.test(p) && !/node_modules/.test(p));
      return bigSrc.length > 50 ? `${bigSrc.length} source files in flat structure, potential god file` : null;
    },
    severity: "Medium",
  },
  // Performance
  {
    cweId: "169", name: "Uncontrolled Memory Allocation",
    check: (paths) => paths.some((p) => /\.(wasm|pck)$/i.test(p)) ? "Binary assets in repo" : null,
    severity: "Low",
  },
  {
    cweId: "187", name: "String Concatenation in Loop",
    check: (paths) => {
      const hasLock = paths.some((p) => /package-lock\.json$|yarn\.lock$|pnpm-lock\.yaml$/i.test(p));
      return !hasLock ? "No lock file; dependency resolution may be slow" : null;
    },
    severity: "Medium",
  },
  {
    cweId: "174", name: "Excessive Database Queries",
    check: (paths) => {
      const dbFiles = paths.filter((p) => /prisma|drizzle|typeorm|mongoose/i.test(p));
      return dbFiles.length > 10 ? `${dbFiles.length} database-related files, possible N+1 risk` : null;
    },
    severity: "Medium",
  },
];

export function scanFileTree(input: FileTreeScanInput): CweFinding[] {
  const findings: CweFinding[] = [];
  const seen = new Set<string>();
  const paths = input.fileList;

  // Per-file rules
  for (const p of paths) {
    for (const rule of FILE_RULES) {
      if (rule.test(p)) {
        const key = `${rule.cweId}:${p}`;
        if (!seen.has(key)) {
          seen.add(key);
          findings.push({
            cweId: rule.cweId,
            evidence: rule.name,
            filePath: p,
            severity: rule.severity,
            confidence: 0.7,
          });
        }
      }
    }
  }

  // Repo-level rules (one pass)
  for (const rule of REPO_RULES) {
    const evidence = rule.check(paths);
    if (evidence) {
      findings.push({
        cweId: rule.cweId,
        evidence,
        severity: rule.severity,
        confidence: 0.6,
      });
    }
  }

  return findings;
}
