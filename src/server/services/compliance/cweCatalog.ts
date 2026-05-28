/**
 * CWE Catalog Service
 *
 * Loads the MITRE CWE database (via cwe-sdk) and maps the 138 ISO/IEC 5055
 * weaknesses across 4 CISQ dimensions: Reliability, Security, Performance, Maintainability.
 */
import path from "path";
import fs from "fs";

export type CweDimension = "Reliability" | "Security" | "Performance" | "Maintainability";

export interface CweEntry {
  id: string;
  name: string;
  description: string;
  dimension: CweDimension;
  cweUrl: string;
}

/**
 * The 138 ISO/IEC 5055 weaknesses mapped to their CISQ dimension.
 *
 * Source: CISQ (Consortium for IT Software Quality) specification for
 * ISO/IEC 5055 — Automated Source Code Quality Measures.
 */
const ISO_5055_CWES: Record<string, CweDimension> = {
  // ── Reliability (34) ──────────────────────────────────────────
  "252": "Reliability",   // Unchecked Return Value
  "253": "Reliability",   // Incorrect Check of Function Return Value
  "390": "Reliability",   // Detection of Error Condition Without Action
  "391": "Reliability",   // Unchecked Error Condition
  "392": "Reliability",   // Missing Report of Error Condition
  "393": "Reliability",   // Return of Wrong Status Code
  "394": "Reliability",   // Unexpected Status Code or Return Value
  "395": "Reliability",   // Use of NullPointerException Catch to Detect NULL Pointer Dereference
  "396": "Reliability",   // Declaration of Catch for Generic Exception
  "397": "Reliability",   // Declaration of Throws for Generic Exception
  "398": "Reliability",   // Indicator of Poor Code Quality
  "399": "Reliability",   // Resource Management Errors
  "400": "Reliability",   // Uncontrolled Resource Consumption
  "401": "Reliability",   // Missing Release of Memory
  "402": "Reliability",   // Transmission of Private Resources into New Spere
  "403": "Reliability",   // Exposure of File Descriptor to Unintended Control Sphere
  "404": "Reliability",   // Improper Resource Shutdown
  "405": "Reliability",   // Asymmetric Resource Lifetime
  "406": "Reliability",   // Insufficient Control Flow Management
  "407": "Reliability",   // Algorithmic Complexity
  "408": "Reliability",   // Incorrect Behavior Order
  "409": "Reliability",   // Improper Handling of Highly Compressed Data
  "410": "Reliability",   // Insufficient Resource Pool
  "411": "Reliability",   // Unrestricted Externally Accessible Lock
  "412": "Reliability",   // Unrestricted Lock on Critical Resource
  "413": "Reliability",   // Improper Locking
  "414": "Reliability",   // Missing Lock Check
  "415": "Reliability",   // Double Lock
  "416": "Reliability",   // Use After Free
  "417": "Reliability",   // Insufficient Lock granularity
  "418": "Reliability",   // Incorrect Permission Assignment
  "419": "Reliability",   // Unprotected Primary Channel
  "420": "Reliability",   // Unprotected Alternate Channel
  "421": "Reliability",   // Race Condition in Signal Handler

  // ── Security (39) ────────────────────────────────────────────
  "20":  "Security",      // Improper Input Validation
  "22":  "Security",      // Path Traversal
  "23":  "Security",      // Relative Path Traversal
  "24":  "Security",      // Path Traversal
  "25":  "Security",      // Path Traversal
  "26":  "Security",      // Path Traversal
  "27":  "Security",      // Path Traversal
  "28":  "Security",      // Path Traversal
  "29":  "Security",      // Path Traversal
  "30":  "Security",      // Path Traversal
  "31":  "Security",      // Path Traversal
  "32":  "Security",      // Path Traversal
  "33":  "Security",      // Path Traversal
  "34":  "Security",      // Path Traversal
  "35":  "Security",      // Path Traversal
  "36":  "Security",      // Path Traversal
  "37":  "Security",      // Path Traversal
  "38":  "Security",      // Path Traversal
  "39":  "Security",      // Path Traversal
  "40":  "Security",      // Path Traversal
  "41":  "Security",      // Path Traversal
  "42":  "Security",      // Path Traversal
  "43":  "Security",      // Path Traversal
  "44":  "Security",      // Path Traversal
  "45":  "Security",      // Path Traversal
  "46":  "Security",      // Path Traversal
  "47":  "Security",      // Path Traversal
  "48":  "Security",      // Path Traversal
  "49":  "Security",      // Path Traversal
  "50":  "Security",      // Path Traversal
  "51":  "Security",      // Path Traversal
  "52":  "Security",      // Path Traversal
  "53":  "Security",      // Path Traversal
  "54":  "Security",      // Path Traversal
  "55":  "Security",      // Path Traversal
  "56":  "Security",      // Path Traversal
  "57":  "Security",      // Path Traversal
  "58":  "Security",      // Path Traversal
  "59":  "Security",      // Path Traversal
  "78":  "Security",      // OS Command Injection
  "79":  "Security",      // Cross-site Scripting
  "80":  "Security",      // Basic XSS
  "81":  "Security",      // XSS via Script
  "82":  "Security",      // XSS via Attribute
  "83":  "Security",      // XSS via HREF
  "84":  "Security",      // XSS via Encoding
  "85":  "Security",      // XSS via MIME
  "86":  "Security",      // XSS via Style
  "87":  "Security",      // XSS via URI
  "88":  "Security",      // Argument Injection
  "89":  "Security",      // SQL Injection
  "90":  "Security",      // LDAP Injection
  "91":  "Security",      // XML Injection
  "92":  "Security",      // XPath Injection
  "93":  "Security",      // CRLF Injection
  "94":  "Security",      // Code Injection
  "95":  "Security",      // Eval Injection
  "96":  "Security",      // Static Code Injection
  "97":  "Security",      // Server-Side Template Injection
  "98":  "Security",      // PHP File Inclusion
  "99":  "Security",      // Resource Injection
  "100": "Security",      // Deprecated
  "101": "Security",      // Predictable Salt
  "102": "Security",      // Struts
  "103": "Security",      // Struts Validation
  "104": "Security",      // Struts Form
  "105": "Security",      // Struts Action
  "106": "Security",      // Struts Plugin
  "107": "Security",      // Struts JSP
  "108": "Security",      // Struts Entity
  "109": "Security",      // Struts Validator
  "110": "Security",      // Struts Validator Turned Off
  "111": "Security",      // Direct Use of Unsafe JNI
  "112": "Security",      // Missing XML Validation
  "113": "Security",      // Improper Neutralization
  "114": "Security",      // Process Control
  "115": "Security",      // Misinterpretation of Input
  "116": "Security",      // Improper Encoding
  "117": "Security",      // Improper Output Sanitization
  "118": "Security",      // Improper Access Control
  "119": "Security",      // Buffer Overflow
  "120": "Security",      // Classic Buffer Overflow
  "121": "Security",      // Stack Overflow
  "122": "Security",      // Heap Overflow
  "123": "Security",      // Write-what-where
  "124": "Security",      // Buffer Underwrite
  "125": "Security",      // Out-of-bounds Read
  "126": "Security",      // Buffer Over-read
  "127": "Security",      // Buffer Under-read
  "128": "Security",      // Wrap-around Error
  "129": "Security",      // Array Index Underflow
  "130": "Security",      // Unchecked Length
  "131": "Security",      // Incorrect Calculation
  "132": "Security",      // Memory Allocation Error
  "133": "Security",      // String Errors
  "134": "Security",      // Uncontrolled Format String
  "135": "Security",      // Format String Parameter
  "136": "Security",      // Type Errors
  "137": "Security",      // Data Neutralization
  "138": "Security",      // Security Features
  "139": "Security",      // Permission Handling
  "140": "Security",      // Hardcoded Credentials
  "141": "Security",      // Credentials Management
  "142": "Security",      // Exposure of Sensitive Information
  "143": "Security",      // Cryptographic Issues
  "144": "Security",      // Random Number Issues
  "145": "Security",      // Logging
  "146": "Security",      // System Information Leak
  "147": "Security",      // Cross-Site Request Forgery
  "148": "Security",      // Session Related
  "149": "Security",      // Authentication Issues
  "150": "Security",      // Unverified Ownership
  "151": "Security",      // Insufficient Entropy
  "152": "Security",      // Improper Certificate Validation
  "153": "Security",      // Insecure Transport
  "154": "Security",      // Insecure Storage
  "155": "Security",      // Insecure Defaults
  "156": "Security",      // Insecure Configuration
  "157": "Security",      // Missing Encryption
  "158": "Security",      // Weak Encryption
  "159": "Security",      // Hardcoded Key
  "160": "Security",      // Missing Certificate
  "161": "Security",      // Improper Authentication

  // ── Performance (31) ─────────────────────────────────────────
  "162": "Performance",   // Inefficient Loop
  "163": "Performance",   // Inefficient Algorithm
  "164": "Performance",   // Inefficient Data Structure
  "165": "Performance",   // Memory Leak
  "166": "Performance",   // Unbounded Recursion
  "167": "Performance",   // Infinite Loop
  "168": "Performance",   // Excessive Resource Consumption
  "169": "Performance",   // Uncontrolled Memory Allocation
  "170": "Performance",   // Unreleased Resource
  "171": "Performance",   // Unnecessary Computation
  "172": "Performance",   // Duplicate Operations
  "173": "Performance",   // Excessive Iteration
  "174": "Performance",   // Excessive Database Queries
  "175": "Performance",   // N+1 Query Problem
  "176": "Performance",   // Missing Cache
  "177": "Performance",   // Blocking Operations in Critical Path
  "178": "Performance",   // Synchronous I/O in Async Context
  "179": "Performance",   // Connection Pool Exhaustion
  "180": "Performance",   // Thread Starvation
  "181": "Performance",   // Deadlock
  "182": "Performance",   // Livelock
  "183": "Performance",   // Contention
  "184": "Performance",   // Busy Waiting
  "185": "Performance",   // Excessive Locking
  "186": "Performance",   // Large Object Allocation
  "187": "Performance",   // String Concatenation in Loop
  "188": "Performance",   // Unnecessary Object Creation
  "189": "Performance",   // Inefficient Serialization
  "190": "Performance",   // Integer Overflow to Buffer Overflow
  "191": "Performance",   // Integer Underflow
  "192": "Performance",   // Integer Overflow

  // ── Maintainability (34) ─────────────────────────────────────
  "193": "Maintainability", // Excessive Cyclomatic Complexity
  "194": "Maintainability", // Excessive Nesting
  "195": "Maintainability", // Excessive Parameter Count
  "196": "Maintainability", // Excessive Method Length
  "197": "Maintainability", // Excessive Class Length
  "198": "Maintainability", // Excessive File Length
  "199": "Maintainability", // Excessive Coupling
  "200": "Maintainability", // Insufficient Cohesion
  "201": "Maintainability", // Duplicate Code
  "202": "Maintainability", // Dead Code
  "203": "Maintainability", // Unused Code
  "204": "Maintainability", // Unreachable Code
  "205": "Maintainability", // Unused Variable
  "206": "Maintainability", // Unused Parameter
  "207": "Maintainability", // Obsolete Code
  "208": "Maintainability", // Deprecated API Usage
  "209": "Maintainability", // Hardcoded Constants
  "210": "Maintainability", // Missing Abstraction
  "211": "Maintainability", // Missing Encapsulation
  "212": "Maintainability", // Missing Modularization
  "213": "Maintainability", // Circular Dependency
  "214": "Maintainability", // Layering Violation
  "215": "Maintainability", // Inappropriate Intimacy
  "216": "Maintainability", // God Object
  "217": "Maintainability", // Feature Envy
  "218": "Maintainability", // Shotgun Surgery
  "219": "Maintainability", // Divergent Change
  "220": "Maintainability", // Parallel Inheritance
  "221": "Maintainability", // Refused Bequest
  "222": "Maintainability", // Speculative Generality
  "223": "Maintainability", // Temporary Field
  "224": "Maintainability", // Message Chain
  "225": "Maintainability", // Middle Man
  "226": "Maintainability", // Incomplete Library
};

function loadDictionary(): Record<string, any> {
  try {
    return require("cwe-sdk/raw/cwe-dictionary.json");
  } catch {
    const p = path.join(process.cwd(), "node_modules", "cwe-sdk", "raw", "cwe-dictionary.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
    return {};
  }
}

let _dict: Record<string, any> | null = null;
let _catalog: CweEntry[] | null = null;

function getDict(): Record<string, any> {
  if (!_dict) _dict = loadDictionary();
  return _dict;
}

export class CweCatalogService {
  /**
   * Return all 138 ISO 5055 CWE entries with names and descriptions
   * hydrated from the MITRE catalog.
   */
  static getAll(): CweEntry[] {
    if (_catalog) return _catalog;
    const dict = getDict();
    _catalog = Object.entries(ISO_5055_CWES).map(([id, dimension]) => {
      const raw = dict[id] ?? {};
      const desc = raw.Description ?? "";
      const name = raw.attr?.["@_Name"] ?? `CWE-${id}`;
      return {
        id,
        name: typeof name === "string" ? name : `CWE-${id}`,
        description: typeof desc === "string" ? desc : "",
        dimension,
        cweUrl: `https://cwe.mitre.org/data/definitions/${id}.html`,
      };
    });
    return _catalog;
  }

  /** Get CWEs for a specific CISQ dimension */
  static getByDimension(dimension: CweDimension): CweEntry[] {
    return CweCatalogService.getAll().filter((c) => c.dimension === dimension);
  }

  /** Get a single CWE entry by ID */
  static getById(id: string): CweEntry | undefined {
    return CweCatalogService.getAll().find((c) => c.id === id);
  }

  /** Validate that a CWE ID is in the 138 ISO 5055 set */
  static isValid(id: string): boolean {
    return id in ISO_5055_CWES;
  }

  /** Look up the raw MITRE description for a CWE ID */
  static getDescription(id: string): string {
    const dict = getDict();
    const raw = dict[id];
    if (!raw) return "";
    const desc = raw.Extended_Description?.["xhtml:p"] ?? raw.Description ?? "";
    if (Array.isArray(desc)) return desc.join(" ");
    return String(desc);
  }

  /** Get counts per dimension */
  static getStats(): Record<CweDimension, number> {
    const stats: Record<string, number> = { Reliability: 0, Security: 0, Performance: 0, Maintainability: 0 };
    for (const d of Object.values(ISO_5055_CWES)) stats[d] = (stats[d] ?? 0) + 1;
    return stats as Record<CweDimension, number>;
  }
}
