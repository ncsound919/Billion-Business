export type ProviderType = "gemini" | "openai" | "anthropic" | "ollama" | "deepseek" | "local"

export type TaskType =
  | "coding"
  | "business_logic"
  | "agent_brain"
  | "cross_domain"
  | "creative"
  | "analysis"
  | "summarization"
  | "chat"

export type OversightMode = "shadow" | "checkpoint" | "recovery"

export interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export interface GenerateOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: "text" | "json"
  systemPrompt?: string
  timeout?: number
  metadata?: Record<string, any>
}

export interface GenerateResult {
  text: string
  provider: ProviderType
  model: string
  tokensUsed?: number
  costUsd?: number
  latencyMs: number
  confidence?: number
  flagged?: boolean
  flagReason?: string
}

export interface ModelRoute {
  taskType: TaskType
  provider: ProviderType
  model: string
  fallback?: { provider: ProviderType; model: string }
  maxCostPerCall?: number
}

export interface AICoreConfig {
  providers: {
    gemini?: { apiKey: string }
    openai?: { apiKey: string; baseUrl?: string }
    anthropic?: { apiKey: string }
    ollama?: { baseUrl?: string; model?: string }
    deepseek?: { apiKey: string }
    local?: { baseUrl?: string; model?: string }[]
  }
  routes?: ModelRoute[]
  oversight?: {
    mode: OversightMode
    confidenceThreshold: number
    onEscalate?: (payload: EscalationPayload) => Promise<boolean>
  }
  rateLimit?: {
    maxCallsPerMinute: number
    maxTokensPerMinute: number
  }
  costTracking?: {
    enabled: boolean
    budgetLimitUsd?: number
  }
}

export interface EscalationPayload {
  action: "generate" | "chat" | "analyze"
  provider: ProviderType
  model: string
  prompt: string
  confidence: number
  risk: "low" | "medium" | "high" | "critical"
  metadata?: Record<string, any>
}

export interface UsageStats {
  totalCalls: number
  totalTokens: number
  totalCostUsd: number
  callsByProvider: Record<ProviderType, number>
  callsByTask: Record<TaskType, number>
  averageLatencyMs: number
  errorCount: number
}

// Autonomous Brain Types
export interface RevenueOpportunity {
  type: "consulting" | "product" | "service" | "investment"
  description: string
  potentialValue: number
  riskLevel: "low" | "medium" | "high"
  costToExecute?: number
  estimatedTime?: string
}

export interface RevenueResult {
  success: boolean
  revenueGenerated: number
  executionTime?: number
  reason?: string
  error?: string
  analysis?: any
}

export interface RevenueStats {
  totalRevenue: number
  totalOpportunities: number
  successfulOpportunities: number
  successRate: number
  activeOpportunities: number
  pipelineSize: number
  recentTransactions: any[]
}

export interface CurrentOpportunities {
  pipeline: RevenueOpportunity[]
  active: any[]
  history: any[]
}

export interface LearningExperience {
  type: "user" | "system" | "learning"
  task?: string
  input?: string
  output?: string
  success: boolean
  error?: string
  metrics?: Record<string, any>
}

export interface PerformanceMetrics {
  successRate: number
  errorRate: number
  responseTimeMs: number
  costPerCall: number
  userSatisfaction?: number
}

export interface LearningStats {
  totalExperiences: number
  successRate: number
  knowledgeBaseSize: number
  performanceHistoryDays: number
  recentImprovements: any[]
}

export interface AutonomousResponse {
  text: string
  provider: string
  model: string
  latencyMs: number
  tokensUsed?: number
  costUsd?: number
  confidence?: number
  flagged?: boolean
  flagReason?: string
  autonomousMetadata: {
    systemStatus: string
    learningEnabled: boolean
    revenueGenerationEnabled: boolean
    selfImprovementActive: boolean
    timestamp: Date
  }
}

export interface PerformanceReport {
  systemStatus: string
  uptimeHours: number
  coreStats: {
    totalCalls: number
    errorRate: number
    avgLatencyMs: number
    totalCostUsd: number
    callsByProvider: Record<string, number>
  }
  revenueStats: {
    totalRevenue: number
    totalOpportunities: number
    successfulOpportunities: number
    successRate: number
    activeOpportunities: number
    pipelineSize: number
  }
  learningStats: {
    totalExperiences: number
    successRate: number
    knowledgeBaseSize: number
    performanceHistoryDays: number
  }
  timestamp: Date
}

export interface ComprehensiveSystemStatus {
  systemStatus: string
  startupTime: Date
  uptimeHours: number
  coreConfig: any
  revenueStats: any
  learningStats: any
  currentOpportunities: any
}

// Revenue Brainstem Types
export interface RevenueTargets {
  mrrTarget: number
  maxCac: number
  maxPaybackMonths: number
  targetCloseRate: number
  targetChurnRate: number
}

export interface RevenuePerformance {
  timestamp: Date
  mrr: number
  newMrr30: number
  churnMrr30: number
  netNewMrr: number
  cac: number
  ltv: number
  closeRate: number
  churnRate: number
  pipelineValue: number
  customerCount: number
}

export interface RevenueAnalysis {
  performanceScore: number
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  threats: string[]
  recommendations: string[]
  channelPerformance: Record<RevenueChannel, "poor" | "fair" | "good" | "excellent">
  confidenceScore: number
}

export type RevenueChannel = "outbound" | "inbound" | "content" | "pricing" | "retention"

export interface RevenuePlan {
  weekStarting: Date
  targetRevenue: number
  focusChannels: RevenueChannel[]
  keyInitiatives: RevenueInitiative[]
  analysisSummary: {
    performanceScore: number
    confidenceScore: number
  }
}

export interface RevenueInitiative {
  id: string
  description: string
  owner: string
  status: "planned" | "executing" | "completed" | "failed"
  targetImpact: "low" | "medium" | "high"
  priority?: "low" | "medium" | "high"
  actualImpact?: "none" | "low" | "medium" | "high"
  completedAt?: Date
  error?: string
}

export interface InitiativeResult {
  success: boolean
  summary: string
  impact: "none" | "low" | "medium" | "high"
  confidence: number
  error?: string
  data?: Record<string, any>
}

export interface AgentStatus {
  type: string
  status: "initializing" | "operational" | "degraded" | "offline"
  lastActivity: Date
  metrics?: Record<string, any>
}

export interface RevenueDashboard {
  currentPlan: RevenuePlan | null
  currentPerformance: RevenuePerformance
  performanceHistory: RevenuePerformance[]
  agentStatus: AgentStatus[]
  targets: RevenueTargets
  lastUpdated: Date
}

export interface RevenuePerformanceReport {
  mrr: {
    current: number
    target: number
    variance: number
    onTrack: boolean
  }
  cac: {
    current: number
    target: number
    variance: number
    onTrack: boolean
  }
  paybackPeriod: {
    current: number
    target: number
    onTrack: boolean
  }
  closeRate: {
    current: number
    target: number
    variance: number
    onTrack: boolean
  }
  generatedAt: Date
}

// Revenue Data Types
export interface RevenueDataSourceConfig {
  type: "stripe" | "hubspot" | "salesforce" | "google_analytics" | "postgres" | "bigquery" | "custom"
  name: string
  apiKey?: string
  connectionString?: string
  settings?: Record<string, any>
}

export interface RevenueDataSource {
  id: string
  type: string
  name: string
  status: "connected" | "disconnected" | "error" | "syncing"
  lastSync: Date
  connectedAt: Date
  config: {
    apiKey?: string
    connectionString?: string
  }
  error?: string
}

export interface DataSyncResult {
  sourceId: string
  recordsSynced: number
  syncTimeMs: number
  lastSync: Date
  error?: string
}

export interface RevenueMetric {
  name: string
  value: number
  lastUpdated: Date
}

export interface Customer {
  id: string
  name: string
  email: string
  status: CustomerStatus
  source: CustomerSource
  createdAt: Date
  mrr?: number
  acquisitionCost?: number
  churnDate?: Date
  lastActivity?: Date
  [key: string]: any
}

export interface Transaction {
  id: string
  customerId: string
  type: TransactionType
  status: TransactionStatus
  source: TransactionSource
  amount?: number
  date: Date
  currency: string
  product?: string
  [key: string]: any
}

export interface Opportunity {
  id: string
  name: string
  customerId: string
  status: OpportunityStatus
  source: OpportunitySource
  owner: string
  amount?: number
  probability?: number
  createdAt: Date
  expectedCloseDate?: Date
  [key: string]: any
}

export interface RevenuePerformanceSnapshot {
  timestamp: Date
  mrr: number
  newMrr30: number
  churnMrr30: number
  netNewMrr: number
  cac: number
  ltv: number
  closeRate: number
  churnRate: number
  pipelineValue: number
  customerCount: number
}

// Filter types
export interface CustomerFilter {
  status?: CustomerStatus
  source?: CustomerSource
  minMrr?: number
  maxMrr?: number
}

export interface TransactionFilter {
  type?: TransactionType
  status?: TransactionStatus
  minAmount?: number
  maxAmount?: number
  startDate?: Date
  endDate?: Date
}

export interface OpportunityFilter {
  status?: OpportunityStatus
  source?: OpportunitySource
  owner?: string
  minAmount?: number
  maxAmount?: number
}

// Type definitions
type CustomerStatus = "lead" | "trial" | "paid" | "churned" | "inactive"
type CustomerSource = "organic" | "paid" | "referral" | "outbound" | "inbound" | "event" | "other"
type TransactionType = "subscription" | "one_time" | "refund" | "upgrade" | "downgrade" | "other"
type TransactionStatus = "pending" | "completed" | "failed" | "refunded" | "active" | "cancelled"
type TransactionSource = "stripe" | "paypal" | "bank_transfer" | "invoice" | "other"
type OpportunityStatus = "open" | "contacted" | "qualified" | "proposal_sent" | "negotiation" | "closed_won" | "closed_lost"
type OpportunitySource = "inbound" | "outbound" | "referral" | "website" | "event" | "other"

// Audit Types
export interface AuditIssue {
  id: string
  severity: "critical" | "high" | "medium" | "low"
  category: "system" | "reliability" | "performance" | "security" | "business" | "learning" | "audit"
  description: string
  location: string
  detectedAt: Date
  error?: string
  metrics?: Record<string, any>
  recommendation?: string
}

export interface AuditWarning {
  id: string
  severity: "high" | "medium" | "low"
  category: string
  description: string
  location?: string
  detectedAt: Date
  recommendation?: string
  metrics?: Record<string, any>
}

export interface PerformanceMetrics {
  timestamp: Date
  metric: string
  value: number
  unit: string
  threshold?: number
  status: "healthy" | "warning" | "critical"
}

export interface SeveritySummary {
  issues: {
    critical: number
    high: number
    medium: number
    low: number
    total: number
  }
  warnings: {
    high: number
    medium: number
    low: number
    total: number
  }
  overallScore: number
}

export interface AuditRecommendation {
  id: string
  priority: "critical" | "high" | "medium" | "low"
  description: string
  issues?: string[]
  warnings?: string[]
  details?: string
}

export interface FullAuditReport {
  timestamp: Date
  durationMs: number
  issues: AuditIssue[]
  warnings: AuditWarning[]
  performanceMetrics: PerformanceMetrics[]
  severitySummary: SeveritySummary
  recommendations: AuditRecommendation[]
}

export interface E2ETestCase {
  id: string
  name: string
  description: string
  steps: string[]
  expected: string
  category: "reliability" | "performance" | "security" | "integration" | "functional"
  priority: "critical" | "high" | "medium" | "low"
  setup?: string
  teardown?: string
}

// Brain Orchestrator Types
export interface SchedulerTask {
  id: string
  name: string
  frequency: "5m" | "30m" | "1h" | "6h" | "12h" | "24h"
  lastRun: Date | null
  nextRun: Date | null
  handler: () => Promise<{ success: boolean }>
}

export interface DreamTask {
  id: string
  name: string
  priority: "low" | "medium" | "high"
  lastRun: Date | null
  handler: () => Promise<{ success: boolean }>
}

export interface CronJob {
  id: string
  name: string
  schedule: string
  lastRun: Date | null
  nextRun: Date | null
  handler: () => Promise<{ success: boolean }>
}

export type BrainOrchestratorStatus = "running" | "paused" | "stopped"

export interface BrainOrchestratorStatusReport {
  status: BrainOrchestratorStatus
  canOperate: boolean
  schedulerActive: boolean
  dreamProcessorActive: boolean
  cronMonitorActive: boolean
  auditActive: boolean
  testActive: boolean
  schedulerTasks: number
  dreamQueueSize: number
  cronJobsScheduled: number
}



export interface MonthlyReport {
  period: string
  totalRevenue: number
  newCustomers: number
  totalAICalls: number
  errorRate: number
  learningExperiences: number
  systemHealth: string
}

// API Client Types
export interface RequestOptions {
  headers?: Record<string, string>
  [key: string]: any
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  status: number
}

// System Initializer Types
export interface SystemConfig {
  providers?: {
    gemini?: { apiKey: string }
    openai?: { apiKey: string }
    deepseek?: { apiKey: string }
    ollama?: { baseUrl?: string; model?: string }
  }
  revenueTargets?: {
    mrrTarget: number
    maxCac: number
    maxPaybackMonths: number
    targetCloseRate: number
    targetChurnRate: number
  }
  costTracking?: {
    enabled: boolean
    budgetLimitUsd?: number
  }
}

export interface InitializationLogEntry {
  timestamp: Date
  message: string
}

export interface InitializationResult {
  success: boolean
  components: {
    core?: boolean
    autonomousBrain?: boolean
    revenueBrainstem?: boolean
    learningSystem?: boolean
    orchestrator?: boolean
    auditor?: boolean
    tester?: boolean
    revenueData?: boolean
  }
  initializationLog: InitializationLogEntry[]
  errors: Error[]
}

// Test Types
export interface TestDefinition {
  id: string
  name: string
  description: string
  test: () => Promise<TestExecutionResult>
  category?: "functional" | "integration" | "performance" | "reliability" | "security"
  priority?: "critical" | "high" | "medium" | "low"
}

export interface TestExecutionResult {
  success: boolean
  message: string
  data?: Record<string, any>
}

export interface TestResult extends TestDefinition {
  startTime: Date
  endTime?: Date
  durationMs?: number
  status: "running" | "passed" | "failed" | "error"
  error?: any
}

export interface TestSuite {
  id: string
  name: string
  description: string
  startTime: Date
  endTime?: Date
  durationMs?: number
  tests: TestResult[]
}

export interface TestSuiteReport {
  suiteId: string
  suiteName: string
  startTime: Date
  endTime: Date
  durationMs: number
  passed: number
  failed: number
  errors: number
  total: number
  passRate: number
  averageDurationMs: number
  byCategory: Record<string, { passed: number; failed: number; errors: number }>
  tests: TestResult[]
}
