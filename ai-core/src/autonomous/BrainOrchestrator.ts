import { AICore } from "../AICore"
import { RevenueBrainstem } from "../revenue/RevenueBrainstem"
import { ContinuousLearning } from "../learning/ContinuousLearning"
import { SystemAuditor } from "../audit/SystemAuditor"
import { SystemTester } from "../audit/SystemTester"

/**
 * Brain Orchestrator - Central control system for all brain components
 * Manages scheduler, dreams, crons, and all autonomous operations
 */
export class BrainOrchestrator {
  private core: AICore
  private revenueBrainstem: RevenueBrainstem
  private learningSystem: ContinuousLearning
  private auditor: SystemAuditor
  private tester: SystemTester
  
  private status: BrainOrchestratorStatus = "stopped"
  private schedulerInterval: NodeJS.Timeout | null = null
  private dreamInterval: NodeJS.Timeout | null = null
  private cronInterval: NodeJS.Timeout | null = null
  private auditInterval: NodeJS.Timeout | null = null
  private testInterval: NodeJS.Timeout | null = null
  
  private schedulerTasks: SchedulerTask[] = []
  private dreamQueue: DreamTask[] = []
  private cronJobs: CronJob[] = []
  
  constructor(
    core: AICore,
    revenueBrainstem: RevenueBrainstem,
    learningSystem: ContinuousLearning
  ) {
    this.core = core
    this.revenueBrainstem = revenueBrainstem
    this.learningSystem = learningSystem
    this.auditor = new SystemAuditor(core)
    this.tester = new SystemTester(core)
    
    // Initialize with default tasks
    this.initializeDefaultTasks()
  }
  
  /**
   * Initialize default scheduler, dream, and cron tasks
   */
  private initializeDefaultTasks(): void {
    // Scheduler tasks (run every 5 minutes)
    this.schedulerTasks = [
      {
        id: "performance-monitor",
        name: "Performance Monitoring",
        frequency: "5m",
        lastRun: null,
        nextRun: null,
        handler: async () => {
          const stats = this.core.getStats()
          console.log(`[Scheduler] Performance check: ${stats.totalCalls} calls, ${stats.errorRate}% errors`)
          return { success: true }
        },
      },
      {
        id: "revenue-check",
        name: "Revenue Performance Check",
        frequency: "5m",
        lastRun: null,
        nextRun: null,
        handler: async () => {
          const performance = this.revenueBrainstem.getPerformanceReport()
          if (!performance.mrr.onTrack) {
            console.warn(`[Scheduler] MRR off track: $${performance.mrr.current}/$${performance.mrr.target}`)
          }
          return { success: true }
        },
      },
      {
        id: "learning-sync",
        name: "Learning System Sync",
        frequency: "5m",
        lastRun: null,
        nextRun: null,
        handler: async () => {
          const stats = this.learningSystem.getLearningStats()
          console.log(`[Scheduler] Learning sync: ${stats.totalExperiences} experiences`)
          return { success: true }
        },
      },
    ]
    
    // Dream tasks (run when system is idle)
    this.dreamQueue = [
      {
        id: "self-improvement",
        name: "Self-Improvement Analysis",
        priority: "high",
        lastRun: null,
        handler: async () => {
          const analysis = await this.analyzePerformanceAndImprove()
          console.log(`[Dream] Self-improvement: ${analysis.improvements.length} improvements identified`)
          return { success: true }
        },
      },
      {
        id: "revenue-optimization",
        name: "Revenue Optimization",
        priority: "medium",
        lastRun: null,
        handler: async () => {
          const opportunities = await this.findRevenueOpportunities()
          console.log(`[Dream] Revenue optimization: ${opportunities.length} opportunities found`)
          return { success: true }
        },
      },
      {
        id: "knowledge-consolidation",
        name: "Knowledge Consolidation",
        priority: "low",
        lastRun: null,
        handler: async () => {
          const knowledge = this.learningSystem.getKnowledgeBase()
          console.log(`[Dream] Knowledge consolidation: ${knowledge.length} entries processed`)
          return { success: true }
        },
      },
    ]
    
    // Cron jobs (run on schedule)
    this.cronJobs = [
      {
        id: "daily-audit",
        name: "Daily System Audit",
        schedule: "0 0 * * *", // Midnight every day
        lastRun: null,
        nextRun: this.calculateNextRun("0 0 * * *"),
        handler: async () => {
          const report = await this.auditor.runFullAudit(
            this.core,
            this.revenueBrainstem,
            this.learningSystem
          )
          console.log(`[Cron] Daily audit completed: ${report.severitySummary.overallScore}/100`)
          return { success: true }
        },
      },
      {
        id: "weekly-tests",
        name: "Weekly System Tests",
        schedule: "0 0 * * 1", // Midnight every Monday
        lastRun: null,
        nextRun: this.calculateNextRun("0 0 * * 1"),
        handler: async () => {
          const report = await this.tester.runComprehensiveTests()
          console.log(`[Cron] Weekly tests completed: ${report.passRate}% pass rate`)
          return { success: true }
        },
      },
      {
        id: "monthly-report",
        name: "Monthly Performance Report",
        schedule: "0 0 1 * *", // Midnight on 1st of month
        lastRun: null,
        nextRun: this.calculateNextRun("0 0 1 * *"),
        handler: async () => {
          const report = this.generateMonthlyReport()
          console.log(`[Cron] Monthly report generated: ${report.totalRevenue} revenue`)
          return { success: true }
        },
      },
    ]
  }
  
  /**
   * Start the entire brain system
   */
  start(): void {
    if (this.status !== "stopped") {
      console.log("⚠️  Brain is already running or paused")
      return
    }
    
    console.log("🟢 Starting brain orchestrator...")
    this.status = "running"
    
    // Start all subsystems
    this.core.start()
    
    // Start scheduler (every 5 minutes)
    this.schedulerInterval = setInterval(
      () => this.runSchedulerTasks(),
      5 * 60 * 1000
    )
    
    // Start dream processor (every 30 minutes)
    this.dreamInterval = setInterval(
      () => this.processDreamQueue(),
      30 * 60 * 1000
    )
    
    // Start cron monitor (every minute)
    this.cronInterval = setInterval(
      () => this.checkCronJobs(),
      60 * 1000
    )
    
    // Start periodic audits (every 6 hours)
    this.auditInterval = setInterval(
      () => this.runPeriodicAudit(),
      6 * 60 * 60 * 1000
    )
    
    // Start periodic tests (every 12 hours)
    this.testInterval = setInterval(
      () => this.runPeriodicTests(),
      12 * 60 * 60 * 1000
    )
    
    console.log("✅ Brain orchestrator started")
    console.log("   - Scheduler: Active")
    console.log("   - Dream processor: Active")
    console.log("   - Cron jobs: Active")
    console.log("   - Audits: Active")
    console.log("   - Tests: Active")
  }
  
  /**
   * Pause the brain system
   */
  pause(): void {
    if (this.status !== "running") {
      console.log("⚠️  Brain is not running")
      return
    }
    
    console.log("🟠 Pausing brain orchestrator...")
    this.status = "paused"
    
    // Pause all subsystems
    this.core.pause()
    
    console.log("✅ Brain orchestrator paused")
    console.log("   - All scheduled tasks paused")
    console.log("   - Current operations will complete")
    console.log("   - No new tasks will start")
  }
  
  /**
   * Resume the brain system
   */
  resume(): void {
    if (this.status !== "paused") {
      console.log("⚠️  Brain is not paused")
      return
    }
    
    console.log("▶️  Resuming brain orchestrator...")
    this.status = "running"
    
    // Resume all subsystems
    this.core.resume()
    
    console.log("✅ Brain orchestrator resumed")
    console.log("   - All systems operational")
    console.log("   - Scheduled tasks continuing")
  }
  
  /**
   * Stop the brain system completely
   */
  stop(): void {
    console.log("🔴 Stopping brain orchestrator...")
    
    // Clear all intervals
    if (this.schedulerInterval) clearInterval(this.schedulerInterval)
    if (this.dreamInterval) clearInterval(this.dreamInterval)
    if (this.cronInterval) clearInterval(this.cronInterval)
    if (this.auditInterval) clearInterval(this.auditInterval)
    if (this.testInterval) clearInterval(this.testInterval)
    
    // Stop all subsystems
    this.core.stop()
    
    this.status = "stopped"
    
    console.log("✅ Brain orchestrator stopped")
    console.log("   - All intervals cleared")
    console.log("   - All subsystems stopped")
    console.log("   - Ready for restart")
  }
  
  /**
   * Get current orchestrator status
   */
  getStatus(): BrainOrchestratorStatusReport {
    const coreStatus = this.core.getStatus()
    
    return {
      status: this.status,
      canOperate: this.status === "running" && coreStatus.canGenerate,
      schedulerActive: !!this.schedulerInterval,
      dreamProcessorActive: !!this.dreamInterval,
      cronMonitorActive: !!this.cronInterval,
      auditActive: !!this.auditInterval,
      testActive: !!this.testInterval,
      schedulerTasks: this.schedulerTasks.length,
      dreamQueueSize: this.dreamQueue.length,
      cronJobsScheduled: this.cronJobs.length,
    }
  }
  
  /**
   * Run scheduled tasks
   */
  private async runSchedulerTasks(): Promise<void> {
    if (this.status !== "running") return
    
    console.log(`[Orchestrator] Running ${this.schedulerTasks.length} scheduler tasks...`)
    
    const now = new Date()
    
    for (const task of this.schedulerTasks) {
      try {
        console.log(`[Orchestrator] Running task: ${task.name}`)
        const result = await task.handler()
        
        if (result.success) {
          task.lastRun = now
          task.nextRun = this.calculateNextRunForTask(task)
          console.log(`[Orchestrator] ✅ ${task.name} completed successfully`)
        } else {
          console.log(`[Orchestrator] ❌ ${task.name} failed`)
        }
      } catch (error) {
        console.error(`[Orchestrator] 💥 ${task.name} error:`, error)
      }
    }
  }
  
  /**
   * Process dream queue
   */
  private async processDreamQueue(): Promise<void> {
    if (this.status !== "running" || this.dreamQueue.length === 0) return
    
    console.log(`[Orchestrator] Processing ${this.dreamQueue.length} dream tasks...`)
    
    // Process high priority dreams first
    const highPriorityDreams = this.dreamQueue.filter(d => d.priority === "high")
    
    for (const dream of highPriorityDreams) {
      try {
        console.log(`[Orchestrator] Dreaming: ${dream.name}`)
        const result = await dream.handler()
        
        if (result.success) {
          dream.lastRun = new Date()
          console.log(`[Orchestrator] ✅ Dream ${dream.name} completed`)
        }
      } catch (error) {
        console.error(`[Orchestrator] 💥 Dream ${dream.name} error:`, error)
      }
    }
    
    // Remove completed high priority dreams
    this.dreamQueue = this.dreamQueue.filter(d => d.priority !== "high")
  }
  
  /**
   * Check and run cron jobs
   */
  private async checkCronJobs(): Promise<void> {
    if (this.status !== "running") return
    
    const now = new Date()
    
    for (const job of this.cronJobs) {
      if (job.nextRun && now >= job.nextRun) {
        try {
          console.log(`[Orchestrator] Running cron job: ${job.name}`)
          const result = await job.handler()
          
          if (result.success) {
            job.lastRun = now
            job.nextRun = this.calculateNextRun(job.schedule)
            console.log(`[Orchestrator] ✅ Cron job ${job.name} completed`)
          }
        } catch (error) {
          console.error(`[Orchestrator] 💥 Cron job ${job.name} error:`, error)
        }
      }
    }
  }
  
  /**
   * Run periodic system audit
   */
  private async runPeriodicAudit(): Promise<void> {
    if (this.status !== "running") return
    
    console.log("[Orchestrator] Running periodic system audit...")
    
    try {
      const report = await this.auditor.runFullAudit(
        this.core,
        this.revenueBrainstem,
        this.learningSystem
      )
      
      console.log(`[Orchestrator] ✅ Audit completed: ${report.severitySummary.overallScore}/100`)
      
      if (report.severitySummary.issues.critical > 0) {
        console.warn(`[Orchestrator] ⚠️  ${report.severitySummary.issues.critical} critical issues found`)
      }
      
    } catch (error) {
      console.error("[Orchestrator] 💥 Audit error:", error)
    }
  }
  
  /**
   * Run periodic system tests
   */
  private async runPeriodicTests(): Promise<void> {
    if (this.status !== "running") return
    
    console.log("[Orchestrator] Running periodic system tests...")
    
    try {
      const report = await this.tester.runComprehensiveTests()
      
      console.log(`[Orchestrator] ✅ Tests completed: ${report.passRate}% pass rate`)
      
      if (report.failed > 0) {
        console.warn(`[Orchestrator] ⚠️  ${report.failed} tests failed`)
      }
      
    } catch (error) {
      console.error("[Orchestrator] 💥 Test error:", error)
    }
  }
  
  /**
   * Analyze performance and suggest improvements
   */
  private async analyzePerformanceAndImprove(): Promise<{ improvements: string[] }> {
    const improvements: string[] = []
    
    // Analyze core performance
    const stats = this.core.getStats()
    if (stats.errorRate > 0.05) {
      improvements.push("Reduce API errors - consider retry logic or fallback providers")
    }
    
    // Analyze revenue performance
    const revenueReport = this.revenueBrainstem.getPerformanceReport()
    if (!revenueReport.mrr.onTrack) {
      improvements.push("MRR below target - review revenue strategies and pipeline")
    }
    
    if (revenueReport.cac.current > revenueReport.cac.target * 1.2) {
      improvements.push("CAC too high - optimize customer acquisition channels")
    }
    
    // Analyze learning performance
    const learningStats = this.learningSystem.getLearningStats()
    if (learningStats.successRate < 80) {
      improvements.push("Learning success rate low - review training data and algorithms")
    }
    
    return { improvements }
  }
  
  /**
   * Find revenue opportunities
   */
  private async findRevenueOpportunities(): Promise<RevenueOpportunity[]> {
    const opportunities: RevenueOpportunity[] = []
    
    // Analyze current performance
    const performance = this.revenueBrainstem.getRevenueDashboard().currentPerformance
    
    // Check for upsell opportunities
    if (performance.customerCount > 100) {
      opportunities.push({
        type: "upsell",
        description: "Upsell premium features to existing customers",
        potentialValue: performance.mrr * 0.2, // 20% potential upsell
        riskLevel: "low",
      })
    }
    
    // Check for new market opportunities
    if (performance.closeRate > 30) {
      opportunities.push({
        type: "expansion",
        description: "Expand to new customer segments with proven close rate",
        potentialValue: performance.mrr * 0.3, // 30% expansion potential
        riskLevel: "medium",
      })
    }
    
    // Check for retention opportunities
    if (performance.churnRate > 3) {
      opportunities.push({
        type: "retention",
        description: "Implement retention programs to reduce churn",
        potentialValue: performance.mrr * performance.churnRate * 0.01,
        riskLevel: "low",
      })
    }
    
    return opportunities
  }
  
  /**
   * Generate monthly report
   */
  private generateMonthlyReport(): MonthlyReport {
    const coreStats = this.core.getStats()
    const revenueStats = this.revenueBrainstem.getRevenueDashboard()
    const learningStats = this.learningSystem.getLearningStats()
    
    return {
      period: new Date().toISOString().substring(0, 7), // YYYY-MM
      totalRevenue: revenueStats.currentPerformance.mrr,
      newCustomers: revenueStats.currentPerformance.customerCount,
      totalAICalls: coreStats.totalCalls,
      errorRate: coreStats.errorRate,
      learningExperiences: learningStats.totalExperiences,
      systemHealth: this.status === "running" ? "healthy" : this.status,
    }
  }
  
  /**
   * Calculate next run time for a task
   */
  private calculateNextRun(frequency: string): Date {
    const now = new Date()
    
    // Simple implementation - in production use a proper cron parser
    if (frequency === "5m") {
      return new Date(now.getTime() + 5 * 60 * 1000)
    } else if (frequency === "30m") {
      return new Date(now.getTime() + 30 * 60 * 1000)
    } else if (frequency === "1h") {
      return new Date(now.getTime() + 60 * 60 * 1000)
    } else if (frequency === "6h") {
      return new Date(now.getTime() + 6 * 60 * 60 * 1000)
    } else if (frequency === "12h") {
      return new Date(now.getTime() + 12 * 60 * 60 * 1000)
    } else if (frequency === "24h") {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    }
    
    return now
  }
  
  /**
   * Calculate next run for scheduler task
   */
  private calculateNextRunForTask(task: SchedulerTask): Date {
    return this.calculateNextRun(task.frequency)
  }
  
  /**
   * Calculate next run from cron schedule
   */
  private calculateNextRun(schedule: string): Date {
    const now = new Date()
    
    // Very simplified cron parsing - in production use a proper library
    // This handles basic cases like "0 0 * * *" (midnight)
    // "0 0 * * 1" (Monday midnight), "0 0 1 * *" (1st of month)
    
    if (schedule === "0 0 * * *") {
      // Midnight tonight/tomorrow
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      return midnight
    } else if (schedule === "0 0 * * 1") {
      // Next Monday at midnight
      const nextMonday = new Date(now)
      nextMonday.setDate(now.getDate() + ((7 - now.getDay() + 1) % 7))
      nextMonday.setHours(24, 0, 0, 0)
      return nextMonday
    } else if (schedule === "0 0 1 * *") {
      // Next 1st of month at midnight
      const nextMonth = new Date(now)
      if (now.getDate() === 1) {
      }
      nextMonth.setDate(1)
      nextMonth.setHours(24, 0, 0, 0)
      return nextMonth
    }
    
    // Default to 5 minutes from now
    return new Date(now.getTime() + 5 * 60 * 1000)
  }
  
  /**
   * Add a scheduler task
   */
  addSchedulerTask(task: Omit<SchedulerTask, "lastRun" | "nextRun">): void {
    const newTask: SchedulerTask = {
      ...task,
      lastRun: null,
      nextRun: this.calculateNextRunForTask(task as SchedulerTask),
    }
    this.schedulerTasks.push(newTask)
  }
  
  /**
   * Add a dream task
   */
  addDreamTask(task: Omit<DreamTask, "lastRun">): void {
    this.dreamQueue.push(task)
  }
  
  /**
   * Add a cron job
   */
  addCronJob(job: Omit<CronJob, "lastRun" | "nextRun">): void {
    const newJob: CronJob = {
      ...job,
      lastRun: null,
      nextRun: this.calculateNextRun(job.schedule),
    }
    this.cronJobs.push(newJob)
  }
  
  /**
   * Get all scheduler tasks
   */
  getSchedulerTasks(): SchedulerTask[] {
    return this.schedulerTasks
  }
  
  /**
   * Get all dream tasks
   */
  getDreamQueue(): DreamTask[] {
    return this.dreamQueue
  }
  
  /**
   * Get all cron jobs
   */
  getCronJobs(): CronJob[] {
    return this.cronJobs
  }
}

// Types and Interfaces
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
  schedule: string // Cron expression
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

export interface RevenueOpportunity {
  type: "upsell" | "expansion" | "retention" | "new_market"
  description: string
  potentialValue: number
  riskLevel: "low" | "medium" | "high"
}

export interface MonthlyReport {
  period: string // YYYY-MM
  totalRevenue: number
  newCustomers: number
  totalAICalls: number
  errorRate: number
  learningExperiences: number
  systemHealth: string
}