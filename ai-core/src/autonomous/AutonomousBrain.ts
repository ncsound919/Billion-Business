import { AICore, type AICoreConfig } from "../AICore"
import { AutoConfig } from "./AutoConfig"
import { RevenueEngine } from "../revenue/RevenueEngine"
import { ContinuousLearning } from "../learning/ContinuousLearning"

/**
 * Autonomous Brain System
 * Self-configuring, self-improving, revenue-generating AI core
 */
export class AutonomousBrain {
  private core: AICore
  private autoConfig: AutoConfig
  private revenueEngine: RevenueEngine
  private learningSystem: ContinuousLearning
  private systemStatus: SystemStatus = "initializing"
  private startupTime: Date
  
  constructor(config: Partial<AICoreConfig> = {}) {
    this.startupTime = new Date()
    
    console.log("🧠 Initializing Autonomous Brain System...")
    
    // Initialize core components
    this.core = new AICore(config as AICoreConfig)
    this.autoConfig = new AutoConfig(config)
    this.revenueEngine = new RevenueEngine(this.autoConfig)
    this.learningSystem = new ContinuousLearning(this.core)
    
    // Set system status
    this.systemStatus = "operational"
    
    // Start monitoring
    this.startSystemMonitoring()
    
    console.log("🚀 Autonomous Brain System operational")
    console.log(`📅 Started at: ${this.startupTime.toISOString()}`)
  }
  
  /**
   * Start system monitoring
   */
  private startSystemMonitoring() {
    // System health check every 5 minutes
    setInterval(() => this.checkSystemHealth(), 5 * 60 * 1000)
    
    // Performance reporting every hour
    setInterval(() => this.reportPerformance(), 60 * 60 * 1000)
  }
  
  /**
   * Check system health
   */
  private checkSystemHealth() {
    const uptime = Date.now() - this.startupTime.getTime()
    const hoursUp = uptime / (1000 * 60 * 60)
    
    // Get system metrics
    const coreStats = this.core.getStats()
    const revenueStats = this.revenueEngine.getRevenueStats()
    const learningStats = this.learningSystem.getLearningStats()
    
    const healthStatus: SystemHealth = {
      status: "healthy",
      uptimeHours: hoursUp,
      corePerformance: {
        totalCalls: coreStats.totalCalls,
        errorRate: coreStats.errorCount / Math.max(1, coreStats.totalCalls),
        avgLatencyMs: coreStats.averageLatencyMs,
      },
      revenuePerformance: {
        totalRevenue: revenueStats.totalRevenue,
        successRate: revenueStats.successRate,
        activeOpportunities: revenueStats.activeOpportunities,
      },
      learningPerformance: {
        totalExperiences: learningStats.totalExperiences,
        successRate: learningStats.successRate,
      },
      timestamp: new Date(),
    }
    
    // Detect potential issues
    if (healthStatus.corePerformance.errorRate > 0.1) {
      healthStatus.status = "degraded"
      healthStatus.issues = ["High error rate detected"]
    }
    
    if (hoursUp > 24 && revenueStats.totalRevenue === 0) {
      healthStatus.status = "warning"
      healthStatus.issues = healthStatus.issues || []
      healthStatus.issues.push("No revenue generated in 24 hours")
    }
    
    console.log(`[AutonomousBrain] Health Check: ${healthStatus.status}`)
    
    return healthStatus
  }
  
  /**
   * Report system performance
   */
  private reportPerformance() {
    const report = this.getPerformanceReport()
    
    console.log("\n=== AUTONOMOUS BRAIN PERFORMANCE REPORT ===")
    console.log(`📊 System Status: ${report.systemStatus}`)
    console.log(`⏱️  Uptime: ${report.uptimeHours.toFixed(1)} hours`)
    console.log(`\n🧠 CORE PERFORMANCE:`)
    console.log(`   - Total Calls: ${report.coreStats.totalCalls}`)
    console.log(`   - Success Rate: ${(100 - report.coreStats.errorRate * 100).toFixed(1)}%`)
    console.log(`   - Avg Latency: ${report.coreStats.avgLatencyMs}ms`)
    console.log(`\n💰 REVENUE PERFORMANCE:`)
    console.log(`   - Total Revenue: $${report.revenueStats.totalRevenue}`)
    console.log(`   - Success Rate: ${report.revenueStats.successRate.toFixed(1)}%`)
    console.log(`   - Active Opportunities: ${report.revenueStats.activeOpportunities}`)
    console.log(`\n📚 LEARNING PERFORMANCE:`)
    console.log(`   - Total Experiences: ${report.learningStats.totalExperiences}`)
    console.log(`   - Learning Success Rate: ${report.learningStats.successRate.toFixed(1)}%`)
    console.log("===========================================\n")
    
    // Record performance for learning
    this.learningSystem.recordPerformance({
      successRate: 100 - report.coreStats.errorRate * 100,
      errorRate: report.coreStats.errorRate * 100,
      responseTimeMs: report.coreStats.avgLatencyMs,
      costPerCall: report.coreStats.totalCostUsd / Math.max(1, report.coreStats.totalCalls),
      userSatisfaction: 85, // Simulated for now
    })
  }
  
  /**
   * Generate AI responses with full autonomous capabilities
   */
  async generate(prompt: string, options: any = {}): Promise<AutonomousResponse> {
    const startTime = Date.now()
    
    try {
      // Generate response using core
      const coreResponse = await this.core.generate(prompt, options)
      
      // Create autonomous response wrapper
      const response: AutonomousResponse = {
        text: coreResponse.text,
        provider: coreResponse.provider,
        model: coreResponse.model,
        latencyMs: Date.now() - startTime,
        tokensUsed: coreResponse.tokensUsed,
        costUsd: coreResponse.costUsd,
        confidence: coreResponse.confidence,
        flagged: coreResponse.flagged,
        flagReason: coreResponse.flagReason,
        autonomousMetadata: {
          systemStatus: this.systemStatus,
          learningEnabled: true,
          revenueGenerationEnabled: true,
          selfImprovementActive: true,
          timestamp: new Date(),
        },
      }
      
      // Record experience for learning
      this.learningSystem.recordExperience({
        type: "user",
        task: options.taskType || "general",
        input: prompt,
        output: response.text,
        success: !response.flagged,
        error: response.flagged ? response.flagReason : undefined,
        metrics: {
          latencyMs: response.latencyMs,
          tokensUsed: response.tokensUsed,
          costUsd: response.costUsd,
        },
      })
      
      return response
      
    } catch (error) {
      console.error("Autonomous generation failed:", error)
      
      // Record failure for learning
      this.learningSystem.recordExperience({
        type: "user",
        task: options.taskType || "general",
        input: prompt,
        output: "Error",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      
      throw error
    }
  }
  
  /**
   * Get comprehensive system status
   */
  getSystemStatus(): ComprehensiveSystemStatus {
    return {
      systemStatus: this.systemStatus,
      startupTime: this.startupTime,
      uptimeHours: (Date.now() - this.startupTime.getTime()) / (1000 * 60 * 60),
      coreConfig: this.autoConfig.getConfig(),
      revenueStats: this.revenueEngine.getRevenueStats(),
      learningStats: this.learningSystem.getLearningStats(),
      currentOpportunities: this.revenueEngine.getCurrentOpportunities(),
    }
  }
  
  /**
   * Get performance report
   */
  getPerformanceReport(): PerformanceReport {
    const coreStats = this.core.getStats()
    const revenueStats = this.revenueEngine.getRevenueStats()
    const learningStats = this.learningSystem.getLearningStats()
    
    return {
      systemStatus: this.systemStatus,
      uptimeHours: (Date.now() - this.startupTime.getTime()) / (1000 * 60 * 60),
      coreStats: {
        totalCalls: coreStats.totalCalls,
        errorRate: coreStats.totalCalls > 0 ? coreStats.errorCount / coreStats.totalCalls : 0,
        avgLatencyMs: coreStats.averageLatencyMs,
        totalCostUsd: coreStats.totalCostUsd,
        callsByProvider: coreStats.callsByProvider,
      },
      revenueStats: {
        totalRevenue: revenueStats.totalRevenue,
        totalOpportunities: revenueStats.totalOpportunities,
        successfulOpportunities: revenueStats.successfulOpportunities,
        successRate: revenueStats.successRate,
        activeOpportunities: revenueStats.activeOpportunities,
        pipelineSize: revenueStats.pipelineSize,
      },
      learningStats: {
        totalExperiences: learningStats.totalExperiences,
        successRate: learningStats.successRate,
        knowledgeBaseSize: learningStats.knowledgeBaseSize,
        performanceHistoryDays: learningStats.performanceHistoryDays,
      },
      timestamp: new Date(),
    }
  }
  
  /**
   * Shutdown system gracefully
   */
  shutdown() {
    console.log("🧠 Shutting down Autonomous Brain System...")
    
    this.systemStatus = "shutting_down"
    
    // Shutdown components
    this.revenueEngine.shutdown()
    this.learningSystem.shutdown()
    
    // Final performance report
    const finalReport = this.getPerformanceReport()
    console.log("📊 Final Performance Report:")
    console.log(`   - Uptime: ${finalReport.uptimeHours.toFixed(1)} hours`)
    console.log(`   - Total Revenue: $${finalReport.revenueStats.totalRevenue}`)
    console.log(`   - Total AI Calls: ${finalReport.coreStats.totalCalls}`)
    console.log(`   - Learning Experiences: ${finalReport.learningStats.totalExperiences}`)
    
    this.systemStatus = "offline"
    console.log("✅ Autonomous Brain System shutdown complete")
  }
}

interface SystemHealth {
  status: "healthy" | "degraded" | "warning" | "critical"
  uptimeHours: number
  corePerformance: {
    totalCalls: number
    errorRate: number
    avgLatencyMs: number
  }
  revenuePerformance: {
    totalRevenue: number
    successRate: number
    activeOpportunities: number
  }
  learningPerformance: {
    totalExperiences: number
    successRate: number
  }
  timestamp: Date
  issues?: string[]
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

type SystemStatus = "initializing" | "operational" | "degraded" | "shutting_down" | "offline"
