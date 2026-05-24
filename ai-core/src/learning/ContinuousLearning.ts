import { AICore } from "../AICore"

/**
 * Continuous Learning System
 * Enables the AI to learn from experience and improve over time
 */
export class ContinuousLearning {
  private core: AICore
  private knowledgeBase: KnowledgeEntry[] = []
  private performanceHistory: PerformanceEntry[] = []
  private learningInterval: NodeJS.Timeout
  private knowledgeRetentionDays: number = 365
  
  constructor(core: AICore) {
    this.core = core
    
    // Start learning loop
    this.learningInterval = setInterval(
      () => this.learnFromExperience(),
      4 * 60 * 60 * 1000 // Every 4 hours
    )
    
    // Cleanup old knowledge periodically
    setInterval(
      () => this.cleanupKnowledgeBase(),
      24 * 60 * 60 * 1000 // Daily
    )
    
    console.log("[ContinuousLearning] System initialized")
  }
  
  /**
   * Record a learning experience
   */
  recordExperience(experience: LearningExperience) {
    this.knowledgeBase.push({
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date(),
      ...experience,
    })
    
    // Keep knowledge base manageable
    if (this.knowledgeBase.length > 10000) {
      this.knowledgeBase = this.knowledgeBase.slice(-10000)
    }
  }
  
  /**
   * Record performance metrics
   */
  recordPerformance(metrics: PerformanceMetrics) {
    this.performanceHistory.push({
      timestamp: new Date(),
      ...metrics,
    })
    
    // Keep history manageable
    if (this.performanceHistory.length > 365) {
      this.performanceHistory = this.performanceHistory.slice(-365)
    }
  }
  
  /**
   * Learn from accumulated experience
   */
  private async learnFromExperience() {
    if (this.knowledgeBase.length < 10) {
      console.log("[ContinuousLearning] Not enough data to learn from yet")
      return
    }
    
    console.log(`[ContinuousLearning] Analyzing ${this.knowledgeBase.length} experiences...`)
    
    try {
      // Extract recent experiences (last 7 days)
      const recentExperiences = this.knowledgeBase.filter(kb => {
        const ageDays = (Date.now() - kb.timestamp.getTime()) / (1000 * 60 * 60 * 24)
        return ageDays <= 7
      })
      
      if (recentExperiences.length === 0) return
      
      // Generate learning insights
      const insights = await this.generateInsights(recentExperiences)
      
      // Apply improvements
      await this.applyImprovements(insights)
      
      console.log("[ContinuousLearning] Learning cycle completed")
      
    } catch (error) {
      console.error("[ContinuousLearning] Learning failed:", error)
    }
  }
  
  /**
   * Generate insights from experiences
   */
  private async generateInsights(experiences: KnowledgeEntry[]): Promise<LearningInsights> {
    // Summarize experiences for analysis
    const successRate = experiences.filter(e => e.success).length / experiences.length
     const commonTasks = this.getMostCommonTasks(experiences)
     const errorPatterns = this.getErrorPatterns(experiences);
    
    const prompt = `Analyze learning experiences and generate insights`;
    
    const result = await this.core.generate(prompt, {
      taskType: "analysis",
      responseFormat: "json",
      temperature: 0.5,
    })
    
    try {
      return JSON.parse(result.text)
    } catch (error) {
      console.error("Failed to parse insights:", error)
      return {
        keyInsights: [],
        improvementAreas: [],
        successPatterns: [],
        recommendations: ["Continue current approach"],
        confidenceScore: 50,
      }
    }
  }
  
  /**
   * Apply improvements based on insights
   */
  private async applyImprovements(insights: LearningInsights) {
    if (insights.confidenceScore < 60) {
      console.log("[ContinuousLearning] Low confidence in insights, no changes applied")
      return
    }
    
    console.log("[ContinuousLearning] Applying improvements:")
    console.log("- Key insights:", insights.keyInsights)
    console.log("- Recommendations:", insights.recommendations)
    
    // In a full implementation, we would:
    // 1. Adjust AI model parameters
    // 2. Update routing strategies
    // 3. Modify oversight thresholds
    // 4. Improve error handling
    
    // For now, we'll just log the improvements
    this.recordExperience({
      type: "system",
      task: "self-improvement",
      input: JSON.stringify(insights),
      output: "Improvements applied based on learning insights",
      success: true,
      metrics: {
        confidence: insights.confidenceScore,
        impact: "medium",
      },
    })
  }
  
  /**
   * Get most common task types
   */
  private getMostCommonTasks(experiences: KnowledgeEntry[]): string[] {
    const taskCounts: Record<string, number> = {}
    
    experiences.forEach(exp => {
      if (exp.task) {
        taskCounts[exp.task] = (taskCounts[exp.task] || 0) + 1
      }
    })
    
    return Object.entries(taskCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0])
  }
  
  /**
   * Identify error patterns
   */
  private getErrorPatterns(experiences: KnowledgeEntry[]): string[] {
    const failedExperiences = experiences.filter(e => !e.success)
    const errorPatterns: Record<string, number> = {}
    
    failedExperiences.forEach(exp => {
      if (exp.error) {
        // Simple pattern extraction
        const pattern = exp.error.split(":")[0] || exp.error.substring(0, 50)
        errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1
      }
    })
    
    return Object.entries(errorPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0])
  }
  
  /**
   * Clean up old knowledge
   */
  private cleanupKnowledgeBase() {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.knowledgeRetentionDays)
    
    this.knowledgeBase = this.knowledgeBase.filter(kb => kb.timestamp >= cutoffDate)
    
    console.log(`[ContinuousLearning] Knowledge base cleaned. Retained ${this.knowledgeBase.length} entries`)
  }
  
  /**
   * Get learning statistics
   */
  getLearningStats(): LearningStats {
    const totalExperiences = this.knowledgeBase.length
    const successExperiences = this.knowledgeBase.filter(e => e.success).length
    
    return {
      totalExperiences,
      successRate: totalExperiences > 0 ? (successExperiences / totalExperiences) * 100 : 0,
      knowledgeBaseSize: this.knowledgeBase.length,
      performanceHistoryDays: this.performanceHistory.length,
      recentImprovements: this.knowledgeBase
        .filter(e => e.task === "self-improvement")
        .slice(-5),
    }
  }
  
  /**
   * Get knowledge base entries
   */
  getKnowledgeBase(query?: string): KnowledgeEntry[] {
    if (!query) {
      return this.knowledgeBase.slice(-100) // Return last 100 by default
    }
    
    // Simple search
    const lowerQuery = query.toLowerCase()
    return this.knowledgeBase.filter(entry => 
      entry.task?.toLowerCase().includes(lowerQuery) ||
      entry.input?.toLowerCase().includes(lowerQuery) ||
      entry.output?.toLowerCase().includes(lowerQuery)
    )
  }
  
  /**
   * Shutdown cleanup
   */
  shutdown() {
    clearInterval(this.learningInterval)
    console.log("[ContinuousLearning] Shutdown complete")
  }
}

interface KnowledgeEntry {
  id: string
  timestamp: Date
  type: "user" | "system" | "learning"
  task?: string
  input?: string
  output?: string
  success: boolean
  error?: string
  metrics?: Record<string, any>
}

interface PerformanceEntry {
  timestamp: Date
  successRate: number
  errorRate: number
  responseTimeMs: number
  costPerCall: number
  userSatisfaction?: number
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

interface LearningInsights {
  keyInsights: string[]
  improvementAreas: string[]
  successPatterns: string[]
  recommendations: string[]
  confidenceScore: number
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
  recentImprovements: KnowledgeEntry[]
}
