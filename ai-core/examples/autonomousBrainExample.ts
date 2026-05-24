import { AutonomousBrain } from "../src/autonomous/AutonomousBrain"

/**
 * Example: Autonomous Brain System
 * Demonstrates self-configuring, self-improving, revenue-generating AI
 */

async function main() {
  console.log("🧠 Starting Autonomous Brain Example...\n")
  
  // Initialize autonomous brain with API keys
  const brain = new AutonomousBrain({
    providers: {
      gemini: { apiKey: process.env.GEMINI_API_KEY || "" },
      openai: process.env.OPENAI_API_KEY
        ? { apiKey: process.env.OPENAI_API_KEY }
        : undefined,
      deepseek: process.env.DEEPSEEK_API_KEY
        ? { apiKey: process.env.DEEPSEEK_API_KEY }
        : undefined,
    },
    costTracking: {
      enabled: true,
      budgetLimitUsd: 100, // $100 monthly budget
    },
  })
  
  // Example 1: Generate AI response with autonomous capabilities
  console.log("Example 1: AI Response with Autonomous Features")
  console.log("=" .repeat(50))
  
  const response = await brain.generate(
    "Analyze the current AI market and suggest 3 high-potential business opportunities for an autonomous AI system.",
    {
      taskType: "business_logic",
      temperature: 0.7,
    }
  )
  
  console.log(`\n🤖 AI Response:`)
  console.log(response.text)
  console.log(`\n📊 Autonomous Metadata:`)
  console.log(`- System Status: ${response.autonomousMetadata.systemStatus}`)
  console.log(`- Learning Enabled: ${response.autonomousMetadata.learningEnabled}`)
  console.log(`- Revenue Generation: ${response.autonomousMetadata.revenueGenerationEnabled}`)
  console.log(`- Self-Improvement: ${response.autonomousMetadata.selfImprovementActive}`)
  
  // Example 2: Check system status
  console.log("\n" + "=".repeat(50))
  console.log("Example 2: System Status")
  console.log("=" .repeat(50))
  
  const status = brain.getSystemStatus()
  console.log(`\n📋 System Status:`)
  console.log(`- Status: ${status.systemStatus}`)
  console.log(`- Uptime: ${status.uptimeHours.toFixed(1)} hours`)
  console.log(`- Total AI Calls: ${status.coreConfig.coreConfig.getStats().totalCalls}`)
  console.log(`- Total Revenue: $${status.revenueStats.totalRevenue}`)
  console.log(`- Learning Experiences: ${status.learningStats.totalExperiences}`)
  
  // Example 3: Generate revenue opportunities
  console.log("\n" + "=".repeat(50))
  console.log("Example 3: Revenue Generation")
  console.log("=" .repeat(50))
  
  // This would be called automatically by the revenue engine
  // but we can demonstrate it manually
  const revenueOpportunity = {
    type: "consulting",
    description: "AI strategy consultation for enterprise clients",
    potentialValue: 5000,
    riskLevel: "medium",
    costToExecute: 500,
    estimatedTime: "2 weeks",
  }
  
  console.log(`\n💰 Evaluating revenue opportunity: ${revenueOpportunity.description}`)
  console.log(`- Potential Value: $${revenueOpportunity.potentialValue}`)
  console.log(`- Risk Level: ${revenueOpportunity.riskLevel}`)
  
  const revenueResult = await brain.getSystemStatus().coreConfig.coreConfig.generateRevenue(revenueOpportunity)
  
  console.log(`\n📈 Revenue Result:`)
  console.log(`- Success: ${revenueResult.success ? "✅ Yes" : "❌ No"}`)
  console.log(`- Revenue Generated: $${revenueResult.revenueGenerated}`)
  console.log(`- Analysis: ${JSON.stringify(revenueResult.analysis?.recommendations || [], null, 2)}`)
  
  // Example 4: Performance report
  console.log("\n" + "=".repeat(50))
  console.log("Example 4: Performance Report")
  console.log("=" .repeat(50))
  
  const report = brain.getPerformanceReport()
  console.log(`\n📊 Performance Summary:`)
  console.log(`- System Status: ${report.systemStatus}`)
  console.log(`- Uptime: ${report.uptimeHours.toFixed(1)} hours`)
  console.log(`\n🧠 Core Performance:`)
  console.log(`  - Total Calls: ${report.coreStats.totalCalls}`)
  console.log(`  - Success Rate: ${(100 - report.coreStats.errorRate * 100).toFixed(1)}%`)
  console.log(`  - Avg Latency: ${report.coreStats.avgLatencyMs}ms`)
  console.log(`\n💰 Revenue Performance:`)
  console.log(`  - Total Revenue: $${report.revenueStats.totalRevenue}`)
  console.log(`  - Success Rate: ${report.revenueStats.successRate.toFixed(1)}%`)
  console.log(`\n📚 Learning Performance:`)
  console.log(`  - Total Experiences: ${report.learningStats.totalExperiences}`)
  console.log(`  - Success Rate: ${report.learningStats.successRate.toFixed(1)}%`)
  
  // Keep the system running for demonstration
  console.log("\n" + "=".repeat(50))
  console.log("🚀 Autonomous Brain is now running in the background")
  console.log("=" .repeat(50))
  console.log("\nThe system will:")
  console.log("✅ Self-configure based on performance")
  console.log("✅ Continuously learn from experiences")
  console.log("✅ Generate revenue opportunities")
  console.log("✅ Optimize its own performance")
  console.log("\nPress Ctrl+C to shutdown...\n")
  
  // Wait for shutdown
  process.on("SIGINT", () => {
    console.log("\n🧠 Shutting down Autonomous Brain...")
    brain.shutdown()
    process.exit(0)
  })
}

// Run the example
main().catch(console.error)
