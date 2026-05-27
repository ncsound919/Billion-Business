import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { HealthReport } from "../../types.ts";

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new GoogleGenAI({ apiKey });
}

const healthReportSchema = z.object({
  repoOwner: z.string(),
  repoName: z.string(),
  overallScore: z.number().min(0).max(100),
  gradeCategory: z.string(),
  mainLanguage: z.string(),
  starsCount: z.number().min(0),
  forksCount: z.number().min(0),
  openIssuesCount: z.number().min(0),
  lastPushedAt: z.string(),
  summary: z.string(),
  security: z.object({
    secretLeakDetected: z.boolean(),
    secretsDetails: z.array(z.string()),
    vulnerabilityCount: z.number().min(0),
    highestSeverity: z.enum(["Low", "Medium", "High", "Critical", "None"]),
    vulnerabilities: z.array(z.object({
      package: z.string(),
      severity: z.enum(["Low", "Medium", "High", "Critical", "None"]),
      details: z.string(),
      recommendation: z.string(),
    })),
  }),
  quality: z.object({
    readmeScore: z.number().min(0).max(100),
    readmeFeedback: z.string(),
    readmeMissingSections: z.array(z.string()),
    testFrameDetected: z.string().nullable(),
    testsExplanation: z.string(),
    setupFrictionLevel: z.enum(["Low", "Medium", "High"]),
    setupFrictionReason: z.string(),
  }),
  market: z.object({
    trendAlignmentGrade: z.enum(["Rising Star", "Steady", "Declining Stack", "Experimental"]),
    trendExplanation: z.string(),
    benchmarks: z.object({
      starRatingPercentile: z.number(),
      releaseFrequency: z.enum(["High", "Medium", "Low"]),
      activeContributorScore: z.enum(["Healthy", "Solo Maker", "Stagnant"]),
    }),
    competitors: z.array(z.object({
      repoName: z.string(),
      stars: z.number(),
      advantages: z.array(z.string()),
      weaknesses: z.array(z.string())
    })),
  }),
  quickWins: z.array(z.object({
    id: z.string(),
    title: z.string(),
    severity: z.enum(["High", "Medium", "Low"]),
    category: z.string(),
    description: z.string(),
    actionableSteps: z.string()
  })),
  roadmap: z.array(z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    description: z.string(),
    phase: z.enum(["Now", "Next", "Later"]),
    effort: z.enum(["Small", "Medium", "Large"])
  })),
  valuation: z.object({
    estimatedDeveloperHours: z.number(),
    averageHourlyRate: z.number(),
    replacementCostFMV: z.number(),
    reliefFromRoyaltyValue: z.number(),
    productivityWasteHeuristic: z.number(),
    annualInterestDebtCost: z.number(),
  }),
  hotspots: z.array(z.object({
    filePath: z.string(),
    complexityScore: z.number(),
    changeFrequency: z.enum(["High", "Medium", "Low"]),
    churnPercent: z.number(),
    riskRating: z.enum(["Critical", "High", "Medium", "Low"]),
    recommendation: z.string(),
  })),
  ossRisk: z.object({
    copyleftDetected: z.boolean(),
    licenseConflictsCount: z.number(),
    licensesFound: z.array(z.object({
      name: z.string(),
      verified: z.boolean(),
      type: z.string(),
      riskLevel: z.string(),
      details: z.string(),
    })),
    legalAdviceSnippet: z.string(),
  }),
  architecture: z.object({
    dependencyCouplingScore: z.number(),
    circularImportsFound: z.number(),
    architecturalDriftIndex: z.number(),
    modularSpacingScore: z.number(),
    structuralComplexityFeedback: z.string(),
  }),
  compliance: z.object({
    iso5055Compliant: z.boolean(),
    reliabilityScore: z.number(),
    securityPracticesScore: z.number(),
    maintainabilityPracticesScore: z.number(),
    performanceScore: z.number(),
    severeViolationsCount: z.number(),
    certValidationId: z.string(),
  }),
  globalBenchmarkPercent: z.number(),
});

export interface GradeInput {
  repoUrl: string;
  owner: string;
  repo: string;
}

interface RepoData {
  repoMeta?: Record<string, unknown> | null;
  packageJsonStr?: string;
  readmeStr?: string;
  fileList?: string[];
}

export class GradingService {
  static async gradeRepo(
    input: GradeInput,
    repoData?: RepoData | null
  ): Promise<HealthReport> {
    const client = getGeminiClient();
    const prompt = this.buildGradingPrompt(input, repoData);

    const response = await client.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.7 },
    });

    const text = response.text ?? "";
    if (!text) throw new Error("Empty response from Gemini");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse JSON from Gemini response");

    const parsed = JSON.parse(jsonMatch[0]);
    const report = healthReportSchema.parse(parsed);
    return report as HealthReport;
  }

  private static buildGradingPrompt(input: GradeInput, repoData?: RepoData | null): string {
    const truncatedData = repoData ? {
      ...repoData,
      readmeStr: repoData.readmeStr?.slice(0, 10000) || "",
      packageJsonStr: repoData.packageJsonStr?.slice(0, 5000) || "",
      fileList: repoData.fileList?.slice(0, 50) || [],
      repoMeta: repoData.repoMeta ? {
        name: repoData.repoMeta.name,
        full_name: repoData.repoMeta.full_name,
        description: repoData.repoMeta.description,
        language: repoData.repoMeta.language,
        stargazers_count: repoData.repoMeta.stargazers_count,
        forks_count: repoData.repoMeta.forks_count,
        open_issues_count: repoData.repoMeta.open_issues_count,
        topics: repoData.repoMeta.topics,
        default_branch: repoData.repoMeta.default_branch,
        license: repoData.repoMeta.license,
      } : null,
    } : null;
    const dataSection = truncatedData ? `
## Repository Data
${JSON.stringify(truncatedData, null, 2)}
` : "";
    return `
You are an expert codebase auditor. Grade the GitHub repository "${input.owner}/${input.repo}".
${dataSection}

Return ONLY valid JSON matching this exact schema:
{
  "repoOwner": string,
  "repoName": string,
  "overallScore": number,
  "gradeCategory": string,
  "mainLanguage": string,
  "starsCount": number,
  "forksCount": number,
  "openIssuesCount": number,
  "lastPushedAt": string,
  "summary": string,
  "security": {
    "secretLeakDetected": boolean,
    "secretsDetails": string[],
    "vulnerabilityCount": number,
    "highestSeverity": "Low"|"Medium"|"High"|"Critical"|"None",
    "vulnerabilities": [{ "package": string, "severity": string, "details": string, "recommendation": string }]
  },
  "quality": {
    "readmeScore": number,
    "readmeFeedback": string,
    "readmeMissingSections": string[],
    "testFrameDetected": string | null,
    "testsExplanation": string,
    "setupFrictionLevel": "Low"|"Medium"|"High",
    "setupFrictionReason": string
  },
  "market": {
    "trendAlignmentGrade": "Rising Star"|"Steady"|"Declining Stack"|"Experimental",
    "trendExplanation": string,
    "benchmarks": { "starRatingPercentile": number, "releaseFrequency": "High"|"Medium"|"Low", "activeContributorScore": "Healthy"|"Solo Maker"|"Stagnant" },
    "competitors": [{ "repoName": string, "stars": number, "advantages": string[], "weaknesses": string[] }]
  },
  "quickWins": [{ "id": string, "title": string, "severity": "High"|"Medium"|"Low", "category": string, "description": string, "actionableSteps": string }],
  "roadmap": [{ "id": string, "title": string, "category": string, "description": string, "phase": "Now"|"Next"|"Later", "effort": "Small"|"Medium"|"Large" }],
  "valuation": { "estimatedDeveloperHours": number, "averageHourlyRate": number, "replacementCostFMV": number, "reliefFromRoyaltyValue": number, "productivityWasteHeuristic": number, "annualInterestDebtCost": number },
  "hotspots": [{ "filePath": string, "complexityScore": number, "changeFrequency": "High"|"Medium"|"Low", "churnPercent": number, "riskRating": "Critical"|"High"|"Medium"|"Low", "recommendation": string }],
  "ossRisk": { "copyleftDetected": boolean, "licenseConflictsCount": number, "licensesFound": [{ "name": string, "verified": boolean, "type": string, "riskLevel": string, "details": string }], "legalAdviceSnippet": string },
  "architecture": { "dependencyCouplingScore": number, "circularImportsFound": number, "architecturalDriftIndex": number, "modularSpacingScore": number, "structuralComplexityFeedback": string },
  "compliance": { "iso5055Compliant": boolean, "reliabilityScore": number, "securityPracticesScore": number, "maintainabilityPracticesScore": number, "performanceScore": number, "severeViolationsCount": number, "certValidationId": string },
  "globalBenchmarkPercent": number
}

Rules:
- Return ONLY raw JSON. No markdown, no code fences, no commentary.
- If you cannot determine a value, use null for nullable fields, 0 for numbers, "" for strings, [] for arrays.
- Do not invent data. If package.json was not fetched, say "Not retrieved" in explanations.
`;
  }
}
