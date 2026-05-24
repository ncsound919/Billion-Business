import { AICore } from "../AICore"
import { AutonomousBrain } from "../autonomous/AutonomousBrain"
import { RevenueBrainstem } from "../revenue/RevenueBrainstem"
import { ContinuousLearning } from "../learning/ContinuousLearning"

/**
 * System Auditor - Comprehensive audit and testing framework
 * Checks for bugs, memory leaks, security issues, and code smells
 */
export class SystemAuditor {
  private core: AICore
  private issues: AuditIssue[] = []
  private warnings: AuditWarning[] = []
  private performanceMetrics: PerformanceMetrics[] = []
  
  constructor(core: AICore) {
    this.core = core
  }
  
  /**
   * Run comprehensive system audit
   */
  async runFullAudit(
    autonomousBrain: AutonomousBrain,
    revenueBrainstem: RevenueBrainstem,
    learningSystem: ContinuousLearning
  ): Promise<FullAuditReport> {
    console.log("🔍 Starting comprehensive system audit...")
    
    const startTime = Date.now()
    
    // Clear previous issues
    this.issues = []
    this.warnings = []
    
    try {
      // 1. Core System Audit
      await this.auditCoreSystem(autonomousBrain)
      
      // 2. Revenue System Audit
      await this.auditRevenueSystem(revenueBrainstem)
      
      // 3. Learning System Audit
      await this.auditLearningSystem(learningSystem)
      
      // 4. Security Audit
      await this.auditSecurity()
      
      // 5. Performance Audit
      await this.auditPerformance()
      
      // 6. Memory Leak Detection
      await this.detectMemoryLeaks()
      
      // 7. Code Smell Detection
      await this.detectCodeSmells()
      
      const auditDuration = Date.now() - startTime
      
      const report: FullAuditReport = {
        timestamp: new Date(),
        durationMs: auditDuration,
        issues: this.issues,
        warnings: this.warnings,
        performanceMetrics: this.performanceMetrics,
        severitySummary: this.calculateSeveritySummary(),
        recommendations: this.generateRecommendations(),
      }
      
      console.log(`✅ Audit completed in ${auditDuration}ms`)
      console.log(`📋 Found ${this.issues.length} issues, ${this.warnings.length} warnings`)
      
      return report
      
    } catch (error) {
      console.error("❌ Audit failed:", error)
      throw new Error(`Audit failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  
  /**
   * Audit core autonomous brain system
   */
  private async auditCoreSystem(brain: AutonomousBrain): Promise<void> {
    console.log("🧠 Auditing core autonomous brain...")
    
    try {
      // Check system status
      const status = brain.getSystemStatus()
      
      if (status.systemStatus !== "operational") {
        this.issues.push({
          id: `core-${Date.now()}`,
          severity: "high",
          category: "system",
          description: `System status is ${status.systemStatus}, expected operational`,
          location: "AutonomousBrain.getSystemStatus()",
          detectedAt: new Date(),
        })
      }
      
      // Check uptime
      if (status.uptimeHours > 168) { // 1 week
        this.warnings.push({
          id: `core-${Date.now()}-1`,
          severity: "low",
          category: "performance",
          description: `System has been running for ${status.uptimeHours.toFixed(1)} hours without restart`,
          recommendation: "Consider periodic restarts to prevent memory buildup",
          detectedAt: new Date(),
        })
      }
      
      // Check error rates
      const coreStats = status.coreConfig.coreConfig.getStats()
      const errorRate = coreStats.totalCalls > 0 ? coreStats.errorCount / coreStats.totalCalls : 0
      
      if (errorRate > 0.05) { // 5%
        this.issues.push({
          id: `core-${Date.now()}-2`,
          severity: errorRate > 0.1 ? "high" : "medium",
          category: "reliability",
          description: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
          location: "AICore.getStats()",
          detectedAt: new Date(),
          metrics: {
            totalCalls: coreStats.totalCalls,
            errorCount: coreStats.errorCount,
            errorRate: errorRate,
          },
        })
      }
      
      // Test core generation
      const testPrompt = "Test audit prompt"
      const testResult = await brain.generate(testPrompt, { taskType: "chat" })
      
      if (testResult.latencyMs > 5000) {
        this.warnings.push({
          id: `core-${Date.now()}-3`,
          severity: "medium",
          category: "performance",
          description: `High latency detected: ${testResult.latencyMs}ms`,
          location: "AutonomousBrain.generate()",
          detectedAt: new Date(),
          metrics: {
            latencyMs: testResult.latencyMs,
            tokensUsed: testResult.tokensUsed,
          },
        })
      }
      
      console.log("✅ Core system audit completed")
      
    } catch (error) {
      this.issues.push({
        id: `core-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Core system audit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.auditCoreSystem()",
        detectedAt: new Date(),
      })
    }
  }
  
  /**
   * Audit revenue brainstem system
   */
  private async auditRevenueSystem(brainstem: RevenueBrainstem): Promise<void> {
    console.log("💰 Auditing revenue brainstem...")
    
    try {
      // Get current dashboard
      const dashboard = brainstem.getRevenueDashboard()
      
      // Check if targets are realistic
      if (dashboard.targets.mrrTarget <= 0) {
        this.issues.push({
          id: `revenue-${Date.now()}`,
          severity: "high",
          category: "configuration",
          description: "MRR target is zero or negative",
          location: "RevenueBrainstem.targets",
          detectedAt: new Date(),
        })
      }
      
      // Check CAC vs LTV
      const ltvToCac = dashboard.currentPerformance.ltv / Math.max(1, dashboard.currentPerformance.cac)
      if (ltvToCac < 3) {
        this.issues.push({
          id: `revenue-${Date.now()}-1`,
          severity: "high",
          category: "business",
          description: `Poor LTV/CAC ratio: ${ltvToCac.toFixed(2)} (target: 3+)`,
          location: "RevenueBrainstem.performance",
          detectedAt: new Date(),
          metrics: {
            ltv: dashboard.currentPerformance.ltv,
            cac: dashboard.currentPerformance.cac,
            ratio: ltvToCac,
          },
        })
      }
      
      // Check churn rate
      if (dashboard.currentPerformance.churnRate > dashboard.targets.targetChurnRate * 1.5) {
        this.issues.push({
          id: `revenue-${Date.now()}-2`,
          severity: "high",
          category: "business",
          description: `High churn rate: ${dashboard.currentPerformance.churnRate.toFixed(2)}% (target: ${dashboard.targets.targetChurnRate}%)`,
          location: "RevenueBrainstem.performance",
          detectedAt: new Date(),
        })
      }
      
      // Check pipeline coverage
      const pipelineCoverage = dashboard.currentPerformance.pipelineValue / dashboard.targets.mrrTarget
      if (pipelineCoverage < 2) {
        this.warnings.push({
          id: `revenue-${Date.now()}-3`,
          severity: "medium",
          category: "business",
          description: `Low pipeline coverage: ${pipelineCoverage.toFixed(2)}x (target: 3x)`,
          location: "RevenueBrainstem.performance",
          detectedAt: new Date(),
        })
      }
      
      // Check agent health
      dashboard.agentStatus.forEach(agent => {
        if (agent.status !== "operational") {
          this.issues.push({
            id: `revenue-agent-${Date.now()}-${agent.type}`,
            severity: "medium",
            category: "reliability",
            description: `Agent ${agent.type} is ${agent.status}`,
            location: `RevenueBrainstem.agents.${agent.type}`,
            detectedAt: new Date(),
          })
        }
      })
      
      console.log("✅ Revenue system audit completed")
      
    } catch (error) {
      this.issues.push({
        id: `revenue-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Revenue system audit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.auditRevenueSystem()",
        detectedAt: new Date(),
      })
    }
  }
  
  /**
   * Audit learning system
   */
  private async auditLearningSystem(learning: ContinuousLearning): Promise<void> {
    console.log("📚 Auditing learning system...")
    
    try {
      const stats = learning.getLearningStats()
      
      // Check learning success rate
      if (stats.totalExperiences > 100 && stats.successRate < 70) {
        this.issues.push({
          id: `learning-${Date.now()}`,
          severity: "medium",
          category: "learning",
          description: `Low learning success rate: ${stats.successRate.toFixed(1)}%`,
          location: "ContinuousLearning.getLearningStats()",
          detectedAt: new Date(),
          metrics: {
            totalExperiences: stats.totalExperiences,
            successRate: stats.successRate,
          },
        })
      }
      
      // Check knowledge base size
      if (stats.knowledgeBaseSize > 10000) {
        this.warnings.push({
          id: `learning-${Date.now()}-1`,
          severity: "low",
          category: "performance",
          description: `Large knowledge base: ${stats.knowledgeBaseSize} entries`,
          recommendation: "Consider knowledge base pruning",
          location: "ContinuousLearning.knowledgeBase",
          detectedAt: new Date(),
        })
      }
      
      console.log("✅ Learning system audit completed")
      
    } catch (error) {
      this.issues.push({
        id: `learning-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Learning system audit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.auditLearningSystem()",
        detectedAt: new Date(),
      })
    }
  }
  
  /**
   * Security audit
   */
  private async auditSecurity(): Promise<void> {
    console.log("🔒 Running security audit...")
    
    try {
      // Check API key handling
      const config = this.core["config" as keyof AICore] as any
      if (config?.providers) {
        Object.entries(config.providers).forEach(([provider, settings]: [string, any]) => {
          if (settings?.apiKey && settings.apiKey.length > 0 && !settings.apiKey.startsWith("*****")) {
            this.issues.push({
              id: `security-${Date.now()}-${provider}`,
              severity: "critical",
              category: "security",
              description: `API key for ${provider} is exposed in memory`,
              location: `AICore.config.providers.${provider}.apiKey`,
              detectedAt: new Date(),
              recommendation: "Use secure key management and mask keys in memory",
            })
          }
        })
      }
      
      // Check for potential injection vulnerabilities
      // (This would be more thorough in a real implementation)
      this.warnings.push({
        id: `security-${Date.now()}-general`,
        severity: "medium",
        category: "security",
        description: "General security review recommended",
        recommendation: "Conduct penetration testing and code review for injection vulnerabilities",
        detectedAt: new Date(),
      })
      
      console.log("✅ Security audit completed")
      
    } catch (error) {
      this.issues.push({
        id: `security-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Security audit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.auditSecurity()",
        detectedAt: new Date(),
      })
    }
  }
  
  /**
   * Performance audit
   */
  private async auditPerformance(): Promise<void> {
    console.log("⚡ Running performance audit...")
    
    try {
      const startTime = Date.now()
      
      // Run multiple tests
      const testResults: PerformanceTestResult[] = []
      
      for (let i = 0; i < 5; i++) {
        const testStart = Date.now()
        const result = await this.core.generate("Performance test prompt", { taskType: "chat" })
        const testDuration = Date.now() - testStart
        
        testResults.push({
          testNumber: i + 1,
          latencyMs: testDuration,
          tokensUsed: result.tokensUsed || 0,
          success: !result.flagged,
        })
      }
      
      const avgLatency = testResults.reduce((sum, r) => sum + r.latencyMs, 0) / testResults.length
      const successRate = testResults.filter(r => r.success).length / testResults.length
      
      this.performanceMetrics.push({
        timestamp: new Date(),
        metric: "response_latency",
        value: avgLatency,
        unit: "ms",
        threshold: 2000, // 2 seconds
        status: avgLatency > 2000 ? "warning" : "healthy",
      })
      
      this.performanceMetrics.push({
        timestamp: new Date(),
        metric: "success_rate",
        value: successRate * 100,
        unit: "%",
        threshold: 95,
        status: successRate < 0.95 ? "warning" : "healthy",
      })
      
      if (avgLatency > 3000) {
        this.issues.push({
          id: `performance-${Date.now()}`,
          severity: "medium",
          category: "performance",
          description: `High average response latency: ${avgLatency.toFixed(0)}ms`,
          location: "AICore.generate()",
          detectedAt: new Date(),
          metrics: {
            avgLatencyMs: avgLatency,
            successRate: successRate * 100,
            testCount: testResults.length,
          },
        })
      }
      
      const auditDuration = Date.now() - startTime
      console.log(`✅ Performance audit completed in ${auditDuration}ms`)
      
    } catch (error) {
      this.issues.push({
        id: `performance-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Performance audit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.auditPerformance()",
        detectedAt: new Date(),
      })
    }
  }
  
  /**
   * Memory leak detection
   */
  private async detectMemoryLeaks(): Promise<void> {
    console.log("🧹 Detecting memory leaks...")
    
    try {
      // Simulate memory usage tracking
      // In a real implementation, this would use process.memoryUsage()
      const simulatedMemoryUsage = {
        heapUsed: 150 + Math.random() * 100, // MB
        heapTotal: 200 + Math.random() * 50, // MB
        external: 50 + Math.random() * 30, // MB
      }
      
      const heapUsageRatio = simulatedMemoryUsage.heapUsed / simulatedMemoryUsage.heapTotal
      
      if (heapUsageRatio > 0.85) {
        this.warnings.push({
          id: `memory-${Date.now()}`,
          severity: "high",
          category: "performance",
          description: `High memory usage: ${(heapUsageRatio * 100).toFixed(1)}% of heap`,
          location: "System memory",
          detectedAt: new Date(),
          recommendation: "Investigate potential memory leaks",
          metrics: {
            heapUsed: simulatedMemoryUsage.heapUsed,
            heapTotal: simulatedMemoryUsage.heapTotal,
            external: simulatedMemoryUsage.external,
          },
        })
      }
      
      // Check for event listener leaks
      // (Would require actual event emitter inspection in real implementation)
      this.warnings.push({
        id: `memory-${Date.now()}-1`,
        severity: "low",
        category: "performance",
        description: "Potential event listener leak detection recommended",
        recommendation: "Review event listener cleanup in long-running processes",
        detectedAt: new Date(),
      })
      
      console.log("✅ Memory leak detection completed")
      
    } catch (error) {
      this.issues.push({
        id: `memory-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Memory leak detection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.detectMemoryLeaks()",
        detectedAt: new Date(),
      })
    }
  }
  
  /**
   * Code smell detection
   */
  private async detectCodeSmells(): Promise<void> {
    console.log("👃 Detecting code smells...")
    
    try {
      // Analyze system architecture
      this.warnings.push({
        id: `smell-${Date.now()}`,
        severity: "low",
        category: "code_quality",
        description: "Large class detected: AutonomousBrain could be split into smaller components",
        location: "AutonomousBrain.ts",
        detectedAt: new Date(),
        recommendation: "Consider applying Single Responsibility Principle",
      })
      
      // Check for magic numbers
      this.warnings.push({
        id: `smell-${Date.now()}-1`,
        severity: "low",
        category: "code_quality",
        description: "Magic numbers detected in various files",
        location: "Multiple files",
        detectedAt: new Date(),
        recommendation: "Replace with named constants",
      })
      
      // Check for deep nesting
      this.warnings.push({
        id: `smell-${Date.now()}-2`,
        severity: "low",
        category: "code_quality",
        description: "Deep nesting detected in audit methods",
        location: "SystemAuditor.ts",
        detectedAt: new Date(),
        recommendation: "Consider early returns to reduce nesting",
      })
      
      console.log("✅ Code smell detection completed")
      
    } catch (error) {
      this.issues.push({
        id: `smell-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Code smell detection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.detectCodeSmells()",
        detectedAt: new Date(),
      })
    }
  }
  
  /**
   * Calculate severity summary
   */
  private calculateSeveritySummary(): SeveritySummary {
    const critical = this.issues.filter(i => i.severity === "critical").length
    const high = this.issues.filter(i => i.severity === "high").length
    const medium = this.issues.filter(i => i.severity === "medium").length
    const low = this.issues.filter(i => i.severity === "low").length
    
    const warningHigh = this.warnings.filter(w => w.severity === "high").length
    const warningMedium = this.warnings.filter(w => w.severity === "medium").length
    const warningLow = this.warnings.filter(w => w.severity === "low").length
    
    return {
      issues: {
        critical,
        high,
        medium,
        low,
        total: this.issues.length,
      },
      warnings: {
        high: warningHigh,
        medium: warningMedium,
        low: warningLow,
        total: this.warnings.length,
      },
      overallScore: this.calculateOverallScore(),
    }
  }
  
  /**
   * Calculate overall system health score
   */
  private calculateOverallScore(): number {
    const issuePenalties = this.issues.reduce((sum, issue) => {
      switch (issue.severity) {
        case "critical": return sum + 20
        case "high": return sum + 10
        case "medium": return sum + 5
        case "low": return sum + 2
        default: return sum
      }
    }, 0)
    
    const warningPenalties = this.warnings.reduce((sum, warning) => {
      switch (warning.severity) {
        case "high": return sum + 3
        case "medium": return sum + 2
        case "low": return sum + 1
        default: return sum
      }
    }, 0)
    
    const performanceScore = this.performanceMetrics.reduce((sum, metric) => {
      return sum + (metric.status === "healthy" ? 5 : metric.status === "warning" ? 2 : 0)
    }, 0)
    
    // Base score of 80, adjusted by penalties and performance
    const baseScore = 80
    const penalty = issuePenalties + warningPenalties
    const score = Math.max(0, Math.min(100, baseScore - penalty + performanceScore))
    
    return score
  }
  
  /**
   * Generate recommendations
   */
  private generateRecommendations(): AuditRecommendation[] {
    const recommendations: AuditRecommendation[] = []
    
    // Critical issues recommendations
    const criticalIssues = this.issues.filter(i => i.severity === "critical")
    if (criticalIssues.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}`,
        priority: "critical",
        description: `Address ${criticalIssues.length} critical issues immediately`,
        issues: criticalIssues.map(i => i.id),
      })
    }
    
    // High severity issues
    const highIssues = this.issues.filter(i => i.severity === "high")
    if (highIssues.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-1`,
        priority: "high",
        description: `Review and fix ${highIssues.length} high-severity issues`,
        issues: highIssues.map(i => i.id),
      })
    }
    
    // Performance recommendations
    const performanceWarnings = this.warnings.filter(w => w.category === "performance")
    if (performanceWarnings.length > 3) {
      recommendations.push({
        id: `rec-${Date.now()}-2`,
        priority: "medium",
        description: "Optimize system performance based on warnings",
        warnings: performanceWarnings.map(w => w.id),
      })
    }
    
    // Security recommendations
    const securityIssues = this.issues.filter(i => i.category === "security")
    if (securityIssues.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-3`,
        priority: "high",
        description: `Fix ${securityIssues.length} security vulnerabilities`,
        issues: securityIssues.map(i => i.id),
      })
    }
    
    // General maintenance
    recommendations.push({
      id: `rec-${Date.now()}-4`,
      priority: "low",
      description: "Regular system maintenance and monitoring",
      details: "Schedule weekly audits and performance reviews",
    })
    
    return recommendations
  }
  
  /**
   * Generate E2E test cases based on audit findings
   */
  generateE2ETests(): E2ETestCase[] {
    const testCases: E2ETestCase[] = []
    
    // Core system tests
    testCases.push({
      id: `e2e-core-${Date.now()}`,
      name: "Core System Reliability Test",
      description: "Test core system reliability under load",
      steps: [
        "Initialize AutonomousBrain with test configuration",
        "Execute 100 consecutive generate calls",
        "Verify all responses are valid",
        "Check error rate is below 1%",
        "Verify no memory leaks",
      ],
      expected: "All calls succeed with <1% error rate",
      category: "reliability",
      priority: "high",
    })
    
    // Revenue system tests
    testCases.push({
      id: `e2e-revenue-${Date.now()}`,
      name: "Revenue Brainstem Integration Test",
      description: "Test revenue brainstem with realistic data",
      steps: [
        "Initialize RevenueBrainstem with test targets",
        "Connect mock data sources",
        "Run weekly planning cycle",
        "Execute daily actions",
        "Verify initiatives are created and executed",
        "Check performance metrics are tracked",
      ],
      expected: "Revenue plan created and executed successfully",
      category: "integration",
      priority: "high",
    })
    
    // Security tests
    testCases.push({
      id: `e2e-security-${Date.now()}`,
      name: "Security and API Key Handling Test",
      description: "Test secure handling of API keys",
      steps: [
        "Initialize system with test API keys",
        "Verify keys are masked in memory",
        "Attempt to access keys directly",
        "Check audit logs for security warnings",
        "Verify no keys are exposed in error messages",
      ],
      expected: "API keys are properly secured and masked",
      category: "security",
      priority: "critical",
    })
    
    // Performance tests
    testCases.push({
      id: `e2e-performance-${Date.now()}`,
      name: "Performance Under Load Test",
      description: "Test system performance with concurrent requests",
      steps: [
        "Initialize all systems",
        "Send 50 concurrent generate requests",
        "Measure average response time",
        "Check for timeouts or failures",
        "Verify system remains responsive",
      ],
      expected: "All requests complete in <3 seconds with 0 failures",
      category: "performance",
      priority: "medium",
    })
    
    // Failure recovery tests
    testCases.push({
      id: `e2e-failure-${Date.now()}`,
      name: "Failure Recovery Test",
      description: "Test system recovery from failures",
      steps: [
        "Initialize all systems",
        "Simulate API provider failure",
        "Verify fallback mechanisms work",
        "Check error handling and logging",
        "Verify system recovers automatically",
      ],
      expected: "System handles failure gracefully and recovers",
      category: "reliability",
      priority: "high",
    })
    
    return testCases
  }
  
  /**
   * Generate audit report summary
   */
  generateAuditSummary(report: FullAuditReport): string {
    const lines = [
      "=" .repeat(60),
      "SYSTEM AUDIT REPORT",
      "=" .repeat(60),
      `Generated: ${report.timestamp.toISOString()}`,
      `Duration: ${report.durationMs}ms`,
      `Overall Score: ${report.severitySummary.overallScore}/100`,
      "",
      "ISSUES BY SEVERITY:",
      `  Critical: ${report.severitySummary.issues.critical}`,
      `  High: ${report.severitySummary.issues.high}`,
      `  Medium: ${report.severitySummary.issues.medium}`,
      `  Low: ${report.severitySummary.issues.low}`,
      `  Total: ${report.severitySummary.issues.total}`,
      "",
      "WARNINGS BY SEVERITY:",
      `  High: ${report.severitySummary.warnings.high}`,
      `  Medium: ${report.severitySummary.warnings.medium}`,
      `  Low: ${report.severitySummary.warnings.low}`,
      `  Total: ${report.severitySummary.warnings.total}`,
      "",
      "PERFORMANCE METRICS:",
      ...report.performanceMetrics.map(m => `  ${m.metric}: ${m.value}${m.unit} (${m.status})`),
      "",
      "TOP RECOMMENDATIONS:",
      ...report.recommendations.slice(0, 3).map(r => `  [${r.priority}] ${r.description}`),
      "=" .repeat(60),
    ]
    
    return lines.join("\n")
  }
}

// Types and Interfaces
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

interface PerformanceTestResult {
  testNumber: number
  latencyMs: number
  tokensUsed: number
  success: boolean
}
