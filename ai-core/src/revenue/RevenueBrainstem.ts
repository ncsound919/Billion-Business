import { AICore } from "../AICore"
import { AutoConfig } from "../autonomous/AutoConfig"
import { ContinuousLearning } from "../learning/ContinuousLearning"
import type { RevenueDataSource } from "./RevenueData"

/**
 * Revenue Brainstem - Chief Revenue Officer in Code
 * Single mandate: Maximize profitable, sustainable revenue across all channels
 */
export class RevenueBrainstem {
  private core: AICore
  private autoConfig: AutoConfig
  private learningSystem: ContinuousLearning
  private agents: RevenueAgent[] = []
  private currentPlan: RevenuePlan | null = null
  private performanceHistory: RevenuePerformance[] = []
  private dataSources: RevenueDataSource[] = []
  
  // Revenue targets and constraints
  private targets: RevenueTargets
  
  constructor(core: AICore, autoConfig: AutoConfig, learningSystem: ContinuousLearning, targets: RevenueTargets) {
    this.core = core
    this.autoConfig = autoConfig
    this.learningSystem = learningSystem
    this.targets = targets
    
    // Initialize revenue agents
    this.initializeAgents()
    
    // Start revenue loop
    this.startRevenueLoop()
    
    console.log("💰 Revenue Brainstem initialized - CRO in code")
  }
  
  /**
   * Initialize specialized revenue agents
   */
  private initializeAgents() {
    this.agents = [
      new MarketIntelligenceAgent(this.core, this.learningSystem),
      new OutboundSalesAgent(this.core, this.learningSystem),
      new InboundConversionAgent(this.core, this.learningSystem),
      new ContentFunnelAgent(this.core, this.learningSystem),
      new PricingOfferAgent(this.core, this.learningSystem),
      new RetentionExpansionAgent(this.core, this.learningSystem),
    ]
    
    console.log(`🤖 Initialized ${this.agents.length} specialized revenue agents`)
  }
  
  /**
   * Start the revenue generation loop
   */
  private startRevenueLoop() {
    // Weekly planning cycle
    setInterval(() => this.planWeeklyRevenue(), 7 * 24 * 60 * 60 * 1000)
    
    // Daily execution cycle
    setInterval(() => this.executeDailyActions(), 24 * 60 * 60 * 1000)
    
    // Hourly monitoring
    setInterval(() => this.monitorPerformance(), 60 * 60 * 1000)
    
    // Initial planning
    this.planWeeklyRevenue()
  }
  
  /**
   * Plan weekly revenue strategy
   */
  private async planWeeklyRevenue() {
    console.log("📅 Planning weekly revenue strategy...")
    
    // Get current performance
    const currentPerformance = this.getCurrentPerformance()
    
    // Analyze what's working and what's not
    const analysis = await this.analyzePerformance(currentPerformance)
    
    // Create revenue plan
    this.currentPlan = this.createRevenuePlan(analysis)
    
    // Log the plan
    console.log(`🎯 Weekly Revenue Plan Created:`)
    console.log(`- Target: $${this.currentPlan.targetRevenue}`)
    console.log(`- Focus Channels: ${this.currentPlan.focusChannels.join(", ")}`)
    console.log(`- Key Initiatives: ${this.currentPlan.keyInitiatives.length} actions`)
    
    // Record in learning system
    this.learningSystem.recordExperience({
      type: "system",
      task: "revenue_planning",
      input: JSON.stringify(currentPerformance),
      output: JSON.stringify(this.currentPlan),
      success: true,
      metrics: {
        targetRevenue: this.currentPlan.targetRevenue,
        confidence: analysis.confidenceScore,
      },
    })
  }
  
  /**
   * Analyze current revenue performance
   */
  private async analyzePerformance(performance: RevenuePerformance): Promise<RevenueAnalysis> {
    const prompt = `
      Analyze current revenue performance:
      - MRR: $${performance.mrr}
      - New MRR last 30 days: $${performance.newMrr30}
      - Churn MRR last 30 days: $${performance.churnMrr30}
      - Net New MRR: $${performance.netNewMrr}
      - CAC: $${performance.cac}
      - LTV: $${performance.ltv}
      - Close Rate: ${performance.closeRate}%
      - Pipeline: ${performance.pipelineValue}
      
      Compare against targets:
      - MRR Target: $${this.targets.mrrTarget}
      - CAC Limit: $${this.targets.maxCac}
      - Payback Period Target: ${this.targets.maxPaybackMonths} months
      
      Provide analysis in JSON format:
      {
        "performanceScore": number, // 0-100
        "strengths": string[],
        "weaknesses": string[],
        "opportunities": string[],
        "threats": string[],
        "recommendations": string[],
        "channelPerformance": {
          "outbound": "poor" | "fair" | "good" | "excellent",
          "inbound": "poor" | "fair" | "good" | "excellent",
          "content": "poor" | "fair" | "good" | "excellent",
          "pricing": "poor" | "fair" | "good" | "excellent",
          "retention": "poor" | "fair" | "good" | "excellent"
        },
        "confidenceScore": number // 0-100
      }
    `
    
    try {
      const result = await this.core.generate(prompt, {
        taskType: "business_logic",
        responseFormat: "json",
        temperature: 0.3,
      })
      
      return JSON.parse(result.text)
    } catch (error) {
      console.error("Performance analysis failed:", error)
      return {
        performanceScore: 70,
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
        recommendations: ["Maintain current approach"],
        channelPerformance: {
          outbound: "fair",
          inbound: "fair",
          content: "fair",
          pricing: "fair",
          retention: "fair",
        },
        confidenceScore: 50,
      }
    }
  }
  
  /**
   * Create revenue plan based on analysis
   */
  private createRevenuePlan(analysis: RevenueAnalysis): RevenuePlan {
    // Calculate target based on performance
    const baseTarget = this.targets.mrrTarget
    const adjustment = (analysis.performanceScore - 70) * 10 // $10 per point above/below 70
    const targetRevenue = baseTarget + adjustment
    
    // Determine focus channels based on performance
    const focusChannels: RevenueChannel[] = []
    Object.entries(analysis.channelPerformance).forEach(([channel, performance]) => {
      if (performance === "excellent" || performance === "good") {
        focusChannels.push(channel as RevenueChannel)
      }
    })
    
    // If no channels are performing well, default to balanced approach
    if (focusChannels.length === 0) {
      focusChannels.push("outbound", "inbound", "content")
    }
    
    // Create key initiatives
    const keyInitiatives: RevenueInitiative[] = analysis.recommendations.map(rec => ({
      id: `init_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      description: rec,
      owner: this.determineAgentOwner(rec),
      status: "planned",
      targetImpact: this.estimateImpact(rec),
    }))
    
    return {
      weekStarting: new Date(),
      targetRevenue,
      focusChannels,
      keyInitiatives,
      analysisSummary: {
        performanceScore: analysis.performanceScore,
        confidenceScore: analysis.confidenceScore,
      },
    }
  }
  
  private determineAgentOwner(initiative: string): string {
    const lower = initiative.toLowerCase()
    if (lower.includes("market") || lower.includes("competitor") || lower.includes("icp")) {
      return "market_intelligence"
    } else if (lower.includes("outbound") || lower.includes("email") || lower.includes("sequence")) {
      return "outbound_sales"
    } else if (lower.includes("inbound") || lower.includes("chat") || lower.includes("website")) {
      return "inbound_conversion"
    } else if (lower.includes("content") || lower.includes("landing") || lower.includes("funnel")) {
      return "content_funnel"
    } else if (lower.includes("price") || lower.includes("offer") || lower.includes("bundle")) {
      return "pricing_offer"
    } else if (lower.includes("retention") || lower.includes("churn") || lower.includes("upsell")) {
      return "retention_expansion"
    }
    return "market_intelligence"
  }
  
  private estimateImpact(initiative: string): "low" | "medium" | "high" {
    const lower = initiative.toLowerCase()
    if (lower.includes("major") || lower.includes("campaign") || lower.includes("launch")) {
      return "high"
    } else if (lower.includes("test") || lower.includes("experiment") || lower.includes("tweak")) {
      return "low"
    }
    return "medium"
  }
  
  /**
   * Execute daily revenue actions
   */
  private async executeDailyActions() {
    if (!this.currentPlan) {
      console.log("⚠️ No active revenue plan - skipping daily execution")
      return
    }
    
    console.log("⚡ Executing daily revenue actions...")
    
    // Execute initiatives
    for (const initiative of this.currentPlan.keyInitiatives) {
      if (initiative.status === "planned") {
        await this.executeInitiative(initiative)
      }
    }
    
    // Run agent-specific daily tasks
    for (const agent of this.agents) {
      await agent.executeDailyTasks(this.currentPlan)
    }
  }
  
  /**
   * Execute a specific revenue initiative
   */
  private async executeInitiative(initiative: RevenueInitiative) {
    console.log(`🔧 Executing initiative: ${initiative.description}`)
    
    // Find the owning agent
    const agent = this.agents.find(a => a.getType() === initiative.owner)
    
    if (agent) {
      try {
        const result = await agent.executeInitiative(initiative, this.currentPlan!)
        
        // Update initiative status
        initiative.status = result.success ? "completed" : "failed"
        initiative.actualImpact = result.impact
        initiative.completedAt = new Date()
        
        console.log(`✅ Initiative ${result.success ? "completed" : "failed"}: ${initiative.description}`)
        
        // Record in learning system
        this.learningSystem.recordExperience({
          type: "system",
          task: "revenue_initiative",
          input: initiative.description,
          output: result.summary,
          success: result.success,
          error: result.success ? undefined : result.error,
          metrics: {
            impact: result.impact,
            confidence: result.confidence,
          },
        })
        
      } catch (error) {
        console.error(`❌ Initiative failed: ${initiative.description}`, error)
        initiative.status = "failed"
        initiative.error = error instanceof Error ? error.message : "Unknown error"
      }
    } else {
      console.warn(`⚠️ No agent found for initiative: ${initiative.description}`)
      initiative.status = "failed"
      initiative.error = "No owning agent found"
    }
  }
  
  /**
   * Monitor performance hourly
   */
  private monitorPerformance() {
    console.log("📊 Monitoring revenue performance...")
    
    const currentPerformance = this.getCurrentPerformance()
    this.performanceHistory.push(currentPerformance)
    
    // Keep history manageable
    if (this.performanceHistory.length > 90) {
      this.performanceHistory = this.performanceHistory.slice(-90)
    }
    
    // Check if we're on track
    this.checkPerformanceAgainstPlan(currentPerformance)
  }
  
  /**
   * Check if performance is on track with plan
   */
  private checkPerformanceAgainstPlan(performance: RevenuePerformance) {
    if (!this.currentPlan) return
    
    // Calculate progress toward weekly target
    const daysInWeek = 7
    const daysElapsed = (Date.now() - this.currentPlan.weekStarting.getTime()) / (1000 * 60 * 60 * 24)
    const progress = daysElapsed / daysInWeek
    const expectedMrr = this.currentPlan.targetRevenue * progress
    
    const onTrack = performance.netNewMrr >= expectedMrr * 0.8 // 80% of expected
    
    if (!onTrack) {
      console.warn(`⚠️ Off track: Expected $${expectedMrr.toFixed(0)} MRR, have $${performance.netNewMrr}`)
      this.triggerCorrectiveActions(performance)
    } else {
      console.log(`🎯 On track: $${performance.netNewMrr.toFixed(0)}/$${expectedMrr.toFixed(0)} MRR (${(progress * 100).toFixed(0)}% through week)`)
    }
  }
  
  /**
   * Trigger corrective actions when off track
   */
  private async triggerCorrectiveActions(performance: RevenuePerformance) {
    console.log("🚨 Triggering corrective actions...")
    
    const prompt = `
      Revenue is off track. Current performance:
      - MRR: $${performance.mrr}
      - New MRR: $${performance.newMrr30}
      - Churn MRR: $${performance.churnMrr30}
      - Net New MRR: $${performance.netNewMrr}
      - Pipeline: $${performance.pipelineValue}
      - Close Rate: ${performance.closeRate}%
      
      Current focus channels: ${this.currentPlan?.focusChannels.join(", ") || "none"}
      
      Propose 3 immediate corrective actions in JSON format:
      [
        {
          "action": "string",
          "expectedImpact": "low|medium|high",
          "owner": "market_intelligence|outbound_sales|inbound_conversion|content_funnel|pricing_offer|retention_expansion",
          "urgency": "low|medium|high"
        }
      ]
    `
    
    try {
      const result = await this.core.generate(prompt, {
        taskType: "business_logic",
        responseFormat: "json",
        temperature: 0.7,
      })
      
      const actions = JSON.parse(result.text)
      
      // Add to current plan as high-priority initiatives
      actions.forEach((action: any) => {
        this.currentPlan?.keyInitiatives.push({
          id: `corrective_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          description: action.action,
          owner: action.owner,
          status: "planned",
          targetImpact: action.expectedImpact,
          priority: "high",
        })
      })
      
      console.log(`✅ Added ${actions.length} corrective actions to plan`)
      
    } catch (error) {
      console.error("Failed to generate corrective actions:", error)
    }
  }
  
  /**
   * Get current revenue performance (simulated - connect to real data sources)
   */
  private getCurrentPerformance(): RevenuePerformance {
    // In production, this would pull from your data sources
    // For now, we'll simulate based on system activity
    
    const baseMrr = 50000
    const growthFactor = 1 + (Math.random() * 0.05 - 0.025) // -2.5% to +5%
    const churnFactor = 0.02 + (Math.random() * 0.03 - 0.015) // 0.5% to 4.5%
    
    return {
      timestamp: new Date(),
      mrr: baseMrr * growthFactor,
      newMrr30: baseMrr * growthFactor * 0.1, // 10% growth
      churnMrr30: baseMrr * churnFactor,
      netNewMrr: baseMrr * growthFactor * 0.1 - baseMrr * churnFactor,
      cac: 1500 + Math.random() * 1000, // $1500-$2500
      ltv: 12000 + Math.random() * 8000, // $12k-$20k
      closeRate: 15 + Math.random() * 10, // 15-25%
      pipelineValue: 20000 + Math.random() * 30000, // $20k-$50k
      customerCount: 100 + Math.floor(Math.random() * 50),
    }
  }
  
  /**
   * Get comprehensive revenue dashboard
   */
  getRevenueDashboard(): RevenueDashboard {
    return {
      currentPlan: this.currentPlan,
      currentPerformance: this.getCurrentPerformance(),
      performanceHistory: this.performanceHistory.slice(-7), // Last 7 days
      agentStatus: this.agents.map(agent => agent.getStatus()),
      targets: this.targets,
      lastUpdated: new Date(),
    }
  }
  
  /**
   * Get performance against targets
   */
  getPerformanceReport(): RevenuePerformanceReport {
    const current = this.getCurrentPerformance()
    
    return {
      mrr: {
        current: current.mrr,
        target: this.targets.mrrTarget,
        variance: current.mrr - this.targets.mrrTarget,
        onTrack: current.mrr >= this.targets.mrrTarget * 0.9,
      },
      cac: {
        current: current.cac,
        target: this.targets.maxCac,
        variance: current.cac - this.targets.maxCac,
        onTrack: current.cac <= this.targets.maxCac,
      },
      paybackPeriod: {
        current: current.cac / (current.mrr / current.customerCount),
        target: this.targets.maxPaybackMonths,
        onTrack: (current.cac / (current.mrr / current.customerCount)) <= this.targets.maxPaybackMonths,
      },
      closeRate: {
        current: current.closeRate,
        target: this.targets.targetCloseRate,
        variance: current.closeRate - this.targets.targetCloseRate,
        onTrack: current.closeRate >= this.targets.targetCloseRate * 0.9,
      },
      generatedAt: new Date(),
    }
  }
  
  /**
   * Shutdown revenue brainstem
   */
  shutdown() {
    console.log("💰 Shutting down Revenue Brainstem...")
    this.agents.forEach(agent => agent.shutdown())
    console.log("✅ Revenue Brainstem shutdown complete")
  }
}

// Base Revenue Agent class
abstract class RevenueAgent {
  protected core: AICore
  protected learningSystem: ContinuousLearning
  
  constructor(core: AICore, learningSystem: ContinuousLearning) {
    this.core = core
    this.learningSystem = learningSystem
  }
  
  abstract getType(): string
  abstract executeDailyTasks(plan: RevenuePlan): Promise<void>
  abstract executeInitiative(initiative: RevenueInitiative, plan: RevenuePlan): Promise<InitiativeResult>
  
  getStatus(): AgentStatus {
    return {
      type: this.getType(),
      status: "operational",
      lastActivity: new Date(),
    }
  }
  
  shutdown() {
    // Base shutdown - can be overridden
  }
}

// Market Intelligence Agent
class MarketIntelligenceAgent extends RevenueAgent {
  getType(): string { return "market_intelligence" }
  
  async executeDailyTasks(plan: RevenuePlan): Promise<void> {
    console.log("🔍 Market Intelligence Agent executing daily tasks")
    // Analyze competitors, identify trends, update ICP
  }
  
  async executeInitiative(initiative: RevenueInitiative, plan: RevenuePlan): Promise<InitiativeResult> {
    console.log(`🔍 Market Intelligence executing: ${initiative.description}`)
    
    // Simulate market research
    const success = Math.random() > 0.3 // 70% success rate
    
    return {
      success,
      summary: success 
        ? `Completed market analysis: ${initiative.description}`
        : `Market analysis failed: ${initiative.description}`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.85,
      data: {
        insights: success ? ["Competitor weakness identified", "New ICP segment found"] : [],
      },
    }
  }
}

// Outbound Sales Agent
class OutboundSalesAgent extends RevenueAgent {
  getType(): string { return "outbound_sales" }
  
  async executeDailyTasks(plan: RevenuePlan): Promise<void> {
    console.log("📧 Outbound Sales Agent executing daily tasks")
    // Send sequences, follow up, log activities
  }
  
  async executeInitiative(initiative: RevenueInitiative, plan: RevenuePlan): Promise<InitiativeResult> {
    console.log(`📧 Outbound Sales executing: ${initiative.description}`)
    
    // Simulate outbound campaign
    const success = Math.random() > 0.4 // 60% success rate
    const meetingsBooked = success ? Math.floor(Math.random() * 10) + 5 : 0
    
    return {
      success,
      summary: success 
        ? `Outbound campaign completed: ${meetingsBooked} meetings booked`
        : `Outbound campaign failed`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.75,
      data: {
        meetingsBooked,
        emailsSent: success ? Math.floor(Math.random() * 100) + 50 : 0,
      },
    }
  }
}

// Inbound Conversion Agent
class InboundConversionAgent extends RevenueAgent {
  getType(): string { return "inbound_conversion" }
  
  async executeDailyTasks(plan: RevenuePlan): Promise<void> {
    console.log("💬 Inbound Conversion Agent executing daily tasks")
    // Monitor chat, qualify leads, book calls
  }
  
  async executeInitiative(initiative: RevenueInitiative, plan: RevenuePlan): Promise<InitiativeResult> {
    console.log(`💬 Inbound Conversion executing: ${initiative.description}`)
    
    // Simulate inbound optimization
    const success = Math.random() > 0.5 // 50% success rate
    const conversionIncrease = success ? 5 + Math.random() * 10 : 0 // 5-15% increase
    
    return {
      success,
      summary: success 
        ? `Inbound conversion improved: +${conversionIncrease.toFixed(1)}%`
        : `Inbound conversion test failed`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.7,
      data: {
        conversionRateBefore: 15.0,
        conversionRateAfter: success ? 15.0 + conversionIncrease : 15.0,
      },
    }
  }
}

// Content & Funnel Agent
class ContentFunnelAgent extends RevenueAgent {
  getType(): string { return "content_funnel" }
  
  async executeDailyTasks(plan: RevenuePlan): Promise<void> {
    console.log("📝 Content & Funnel Agent executing daily tasks")
    // Generate content, test variations, optimize funnels
  }
  
  async executeInitiative(initiative: RevenueInitiative, plan: RevenuePlan): Promise<InitiativeResult> {
    console.log(`📝 Content & Funnel executing: ${initiative.description}`)
    
    // Simulate content creation
    const success = Math.random() > 0.6 // 40% success rate
    const assetsCreated = success ? Math.floor(Math.random() * 5) + 3 : 0
    
    return {
      success,
      summary: success 
        ? `Created ${assetsCreated} new assets: landing pages, emails, ads`
        : `Content creation failed`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.65,
      data: {
        assetsCreated,
        testVariations: success ? Math.floor(Math.random() * 3) + 1 : 0,
      },
    }
  }
}

// Pricing & Offer Agent
class PricingOfferAgent extends RevenueAgent {
  getType(): string { return "pricing_offer" }
  
  async executeDailyTasks(plan: RevenuePlan): Promise<void> {
    console.log("💰 Pricing & Offer Agent executing daily tasks")
    // Analyze pricing, test offers, propose bundles
  }
  
  async executeInitiative(initiative: RevenueInitiative, plan: RevenuePlan): Promise<InitiativeResult> {
    console.log(`💰 Pricing & Offer executing: ${initiative.description}`)
    
    // Simulate pricing test
    const success = Math.random() > 0.5 // 50% success rate
    const revenueImpact = success ? (Math.random() * 20 - 5) : 0 // -5% to +15% impact
    
    return {
      success,
      summary: success 
        ? `Pricing test completed: ${revenueImpact > 0 ? "+" : ""}${revenueImpact.toFixed(1)}% revenue impact`
        : `Pricing test failed`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.7,
      data: {
        pricePointsTested: success ? Math.floor(Math.random() * 3) + 2 : 0,
        winningPrice: success ? `$${(99 + Math.random() * 200).toFixed(0)}/mo` : null,
      },
    }
  }
}

// Retention & Expansion Agent
class RetentionExpansionAgent extends RevenueAgent {
  getType(): string { return "retention_expansion" }
  
  async executeDailyTasks(plan: RevenuePlan): Promise<void> {
    console.log("🔄 Retention & Expansion Agent executing daily tasks")
    // Monitor churn signals, trigger save sequences, propose upsells
  }
  
  async executeInitiative(initiative: RevenueInitiative, plan: RevenuePlan): Promise<InitiativeResult> {
    console.log(`🔄 Retention & Expansion executing: ${initiative.description}`)
    
    // Simulate retention program
    const success = Math.random() > 0.7 // 30% success rate
    const churnReduction = success ? 1 + Math.random() * 3 : 0 // 1-4% reduction
    
    return {
      success,
      summary: success 
        ? `Retention program implemented: -${churnReduction.toFixed(1)}% churn`
        : `Retention program failed`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.6,
      data: {
        customersSaved: success ? Math.floor(Math.random() * 10) + 3 : 0,
        expansionRevenue: success ? Math.floor(Math.random() * 5000) + 2000 : 0,
      },
    }
  }
}

// Types and Interfaces
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
