import { AICore } from "../src/AICore"
import { AutonomousBrain } from "../src/autonomous/AutonomousBrain"
import { RevenueBrainstem } from "../src/revenue/RevenueBrainstem"
import { RevenueData } from "../src/revenue/RevenueData"
import { ContinuousLearning } from "../src/learning/ContinuousLearning"
import { SystemAuditor } from "../src/audit/SystemAuditor"
import { SystemTester } from "../src/audit/SystemTester"

/**
 * Comprehensive Audit and Testing Example
 * Demonstrates full system auditing, testing, and quality assurance
 */

async function main() {
  console.log("🔍 Starting Comprehensive Audit and Testing Example...\n")
  
  // Initialize core system
  const core = new AICore({
    providers: {
      gemini: { apiKey: process.env.GEMINI_API_KEY || "test-key" },
    },
    costTracking: {
      enabled: true,
      budgetLimitUsd: 100,
    },
  })
  
  // Initialize subsystems
  const autoConfig = new AutoConfig()
  const learningSystem = new ContinuousLearning(core)
  const revenueData = new RevenueData(core)
  
  const revenueTargets = {
    mrrTarget: 100000,
    maxCac: 2500,
    maxPaybackMonths: 12,
    targetCloseRate: 25,
    targetChurnRate: 3,
  }
  
  const revenueBrainstem = new RevenueBrainstem(core, autoConfig, learningSystem, revenueTargets)
  const autonomousBrain = new AutonomousBrain({
    providers: {
      gemini: { apiKey: process.env.GEMINI_API_KEY || "test-key" },
    },
  })
  
  // Initialize audit and testing systems
  const auditor = new SystemAuditor(core)
  const tester = new SystemTester(core)
  
  // ============================================
  // PHASE 1: COMPREHENSIVE SYSTEM AUDIT
  // ============================================
  console.log("=" .repeat(60))
  console.log("PHASE 1: COMPREHENSIVE SYSTEM AUDIT")
  console.log("=" .repeat(60))
  
  try {
    const auditReport = await auditor.runFullAudit(autonomousBrain, revenueBrainstem, learningSystem)
    
    console.log("\n" + auditor.generateAuditSummary(auditReport))
    
    // Check for critical issues
    if (auditReport.severitySummary.issues.critical > 0) {
      console.log("\n⚠️  CRITICAL ISSUES FOUND:")
      auditReport.issues
        .filter(issue => issue.severity === "critical")
        .forEach(issue => {
          console.log(`  - [${issue.category}] ${issue.description}`)
        })
    }
    
    // Check for high severity issues
    if (auditReport.severitySummary.issues.high > 0) {
      console.log("\n⚠️  HIGH SEVERITY ISSUES FOUND:")
      auditReport.issues
        .filter(issue => issue.severity === "high")
        .forEach(issue => {
          console.log(`  - [${issue.category}] ${issue.description}`)
        })
    }
    
    // Generate E2E test cases from audit findings
    const e2eTests = auditor.generateE2ETests()
    console.log(`\n📋 Generated ${e2eTests.length} E2E test cases from audit findings`)
    
  } catch (error) {
    console.error("❌ Audit failed:", error)
  }
  
  // ============================================
  // PHASE 2: COMPREHENSIVE SYSTEM TESTING
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("PHASE 2: COMPREHENSIVE SYSTEM TESTING")
  console.log("=".repeat(60))
  
  try {
    const testReport = await tester.runComprehensiveTests()
    
    console.log("\n" + tester.generateTestReportSummary(testReport))
    
    // Detailed results by category
    console.log("\n📊 DETAILED RESULTS BY CATEGORY:")
    Object.entries(testReport.byCategory).forEach(([category, stats]) => {
      const total = stats.passed + stats.failed + stats.errors
      const passRate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : 0
      console.log(`  ${category}: ${passRate}% pass rate (${stats.passed}✅ ${stats.failed}❌ ${stats.errors}💥)`)
    })
    
    // List failed tests
    if (testReport.failed > 0) {
      console.log("\n❌ FAILED TESTS:")
      testReport.tests
        .filter(test => test.status === "failed")
        .slice(0, 5)
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.message}`)
        })
    }
    
    // List errored tests
    if (testReport.errors > 0) {
      console.log("\n💥 ERROR TESTS:")
      testReport.tests
        .filter(test => test.status === "error")
        .slice(0, 5)
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.message}`)
        })
    }
    
  } catch (error) {
    console.error("❌ Testing failed:", error)
  }
  
  // ============================================
  // PHASE 3: SYSTEM HEALTH ASSESSMENT
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("PHASE 3: SYSTEM HEALTH ASSESSMENT")
  console.log("=".repeat(60))
  
  // Get current system status
  const brainStatus = autonomousBrain.getSystemStatus()
  const revenueStatus = revenueBrainstem.getRevenueDashboard()
  const learningStatus = learningSystem.getLearningStats()
  
  console.log("\n🧠 AUTONOMOUS BRAIN STATUS:")
  console.log(`  - Status: ${brainStatus.systemStatus}`)
  console.log(`  - Uptime: ${brainStatus.uptimeHours.toFixed(1)} hours`)
  console.log(`  - AI Calls: ${brainStatus.coreConfig.coreConfig.getStats().totalCalls}`)
  console.log(`  - Learning Experiences: ${learningStatus.totalExperiences}`)
  
  console.log("\n💰 REVENUE BRAINSTEM STATUS:")
  console.log(`  - Current MRR: $${Math.floor(revenueStatus.currentPerformance.mrr).toLocaleString()}`)
  console.log(`  - Target MRR: $${revenueStatus.targets.mrrTarget.toLocaleString()}`)
  console.log(`  - Net New MRR: $${Math.floor(revenueStatus.currentPerformance.netNewMrr).toLocaleString()}`)
  console.log(`  - Pipeline: $${Math.floor(revenueStatus.currentPerformance.pipelineValue).toLocaleString()}`)
  console.log(`  - CAC: $${Math.floor(revenueStatus.currentPerformance.cac).toLocaleString()}`)
  console.log(`  - LTV: $${Math.floor(revenueStatus.currentPerformance.ltv).toLocaleString()}`)
  console.log(`  - LTV/CAC: ${(revenueStatus.currentPerformance.ltv / Math.max(1, revenueStatus.currentPerformance.cac)).toFixed(1)}x`)
  
  // Calculate overall health score
  const healthScore = calculateOverallHealthScore(brainStatus, revenueStatus, learningStatus)
  console.log(`\n📊 OVERALL HEALTH SCORE: ${healthScore}/100`)
  
  if (healthScore >= 90) {
    console.log("🟢 System health: EXCELLENT")
  } else if (healthScore >= 80) {
    console.log("🟡 System health: GOOD")
  } else if (healthScore >= 70) {
    console.log("🟠 System health: FAIR")
  } else {
    console.log("🔴 System health: POOR")
  }
  
  // ============================================
  // PHASE 4: RECOMMENDATIONS
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("PHASE 4: RECOMMENDATIONS")
  console.log("=".repeat(60))
  
  const recommendations = []
  
  // Based on test results
  const testReport = tester.getTestResults()
  const failedTests = testReport.filter(t => t.status === "failed")
  const errorTests = testReport.filter(t => t.status === "error")
  
  if (failedTests.length > 0) {
    recommendations.push({
      priority: "high",
      description: `Fix ${failedTests.length} failed tests`,
      details: failedTests.map(t => t.name).join(", "),
    })
  }
  
  if (errorTests.length > 0) {
    recommendations.push({
      priority: "critical",
      description: `Investigate ${errorTests.length} test errors`,
      details: errorTests.map(t => t.name).join(", "),
    })
  }
  
  // Based on revenue performance
  const performanceReport = revenueBrainstem.getPerformanceReport()
  
  if (!performanceReport.mrr.onTrack) {
    recommendations.push({
      priority: "high",
      description: "MRR below target",
      details: `Current: $${performanceReport.mrr.current.toLocaleString()}, Target: $${performanceReport.mrr.target.toLocaleString()}`,
    })
  }
  
  if (!performanceReport.cac.onTrack) {
    recommendations.push({
      priority: "medium",
      description: "CAC above target",
      details: `Current: $${performanceReport.cac.current.toLocaleString()}, Target: $${performanceReport.cac.target.toLocaleString()}`,
    })
  }
  
  if (!performanceReport.paybackPeriod.onTrack) {
    recommendations.push({
      priority: "high",
      description: "Payback period too long",
      details: `Current: ${performanceReport.paybackPeriod.current.toFixed(1)} months, Target: ${performanceReport.paybackPeriod.target.toFixed(1)} months`,
    })
  }
  
  if (!performanceReport.closeRate.onTrack) {
    recommendations.push({
      priority: "medium",
      description: "Close rate below target",
      details: `Current: ${performanceReport.closeRate.current.toFixed(1)}%, Target: ${performanceReport.closeRate.target.toFixed(1)}%`,
    })
  }
  
  // Display recommendations
  if (recommendations.length > 0) {
    console.log("\n📋 TOP RECOMMENDATIONS:")
    recommendations
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
      })
      .forEach(rec => {
        console.log(`  [${rec.priority.toUpperCase()}] ${rec.description}`)
        if (rec.details) {
          console.log(`     ${rec.details}`)
        }
      })
  } else {
    console.log("\n✅ No major recommendations - system is healthy!")
  }
  
  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("FINAL AUDIT & TESTING SUMMARY")
  console.log("=".repeat(60))
  
  console.log("\n📋 EXECUTIVE SUMMARY:")
  console.log(`  - Audit Score: ${auditor.getTestResults().length > 0 ? "Pending" : "N/A"}`)
  console.log(`  - Test Pass Rate: ${testReport.passRate.toFixed(1)}%`)
  console.log(`  - System Health: ${healthScore}/100`)
  console.log(`  - Critical Issues: ${testReport.errors}`)
  console.log(`  - Failed Tests: ${testReport.failed}`)
  console.log(`  - Recommendations: ${recommendations.length}`)
  
  if (healthScore >= 85 && testReport.passRate >= 90) {
    console.log("\n🎉 SYSTEM STATUS: PRODUCTION READY")
    console.log("   All major systems are operational and performing well.")
  } else if (healthScore >= 70 && testReport.passRate >= 75) {
    console.log("\n🟡 SYSTEM STATUS: STAGING READY")
    console.log("   System is functional but requires attention to some issues.")
  } else {
    console.log("\n🔴 SYSTEM STATUS: DEVELOPMENT ONLY")
    console.log("   Significant issues need to be addressed before deployment.")
  }
  
  console.log("\n✅ Audit and testing complete!")
}

// Helper function to calculate overall health score
function calculateOverallHealthScore(
  brainStatus: any,
  revenueStatus: any,
  learningStatus: any
): number {
  let score = 100
  
  // System status (20 points)
  if (brainStatus.systemStatus !== "operational") score -= 20
  
  // Revenue performance (30 points)
  const mrrRatio = revenueStatus.currentPerformance.mrr / revenueStatus.targets.mrrTarget
  if (mrrRatio < 0.9) score -= Math.min(30, (0.9 - mrrRatio) * 300)
  
  const cacRatio = revenueStatus.currentPerformance.cac / revenueStatus.targets.maxCac
  if (cacRatio > 1.1) score -= Math.min(15, (cacRatio - 1.1) * 150)
  
  // Learning performance (10 points)
  if (learningStatus.totalExperiences > 0 && learningStatus.successRate < 80) {
    score -= Math.min(10, (80 - learningStatus.successRate) * 0.5)
  }
  
  // Agent health (20 points)
  const unhealthyAgents = revenueStatus.agentStatus.filter((a: any) => a.status !== "operational").length
  if (unhealthyAgents > 0) {
    score -= Math.min(20, unhealthyAgents * 10)
  }
  
  // Performance metrics (20 points)
  const performance = revenueStatus.currentPerformance
  const ltvToCac = performance.ltv / Math.max(1, performance.cac)
  if (ltvToCac < 3) score -= Math.min(10, (3 - ltvToCac) * 20)
  
  if (performance.churnRate > revenueStatus.targets.targetChurnRate * 1.5) {
    score -= Math.min(10, (performance.churnRate - revenueStatus.targets.targetChurnRate) * 5)
  }
  
  return Math.max(0, Math.min(100, Math.round(score)))
}

// Run the example
main().catch(console.error)
