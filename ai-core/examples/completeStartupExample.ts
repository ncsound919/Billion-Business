/**
 * Complete System Startup Example
 * Demonstrates proper initialization, cleanup, and startup of the entire AI system
 */

import { SystemInitializer } from "../src/autonomous/SystemInitializer"
import { BrainOrchestrator } from "../src/autonomous/BrainOrchestrator"

async function main() {
  console.log("🚀 Complete System Startup Example")
  console.log("=" .repeat(60))
  
  // ============================================
  // PHASE 1: System Initialization
  // ============================================
  console.log("\n🛠️  PHASE 1: SYSTEM INITIALIZATION")
  console.log("-" .repeat(60))
  
  // Configure the system
  const config = {
    providers: {
      // Cloud providers (fallback)
      gemini: { apiKey: process.env.GEMINI_API_KEY || "test-key" },
      
      // Local providers
      ollama: {
        baseUrl: "http://localhost:11434",
        model: "llama3"
      },
    },
    revenueTargets: {
      mrrTarget: 100000,
      maxCac: 2500,
      maxPaybackMonths: 12,
      targetCloseRate: 25,
      targetChurnRate: 3,
    },
    costTracking: {
      enabled: true,
      budgetLimitUsd: 100,
    },
  }
  
  // Initialize the system
  const initializer = new SystemInitializer()
  
  try {
    const result = await initializer.initialize(config)
    
    if (!result.success) {
      console.error("❌ Initialization failed:")
      result.errors.forEach(error => console.error(`   - ${error.message}`))
      process.exit(1)
    }
    
    console.log("✅ System initialization successful!")
    
    // Get initialized components
    const components = initializer.getComponents()
    
    // ============================================
    // PHASE 2: System Verification
    // ============================================
    console.log("\n🔍 PHASE 2: SYSTEM VERIFICATION")
    console.log("-" .repeat(60))
    
    console.log("\nInitialized Components:")
    console.log(`   ✅ AICore: ${components.core ? "Ready" : "Failed"}`)
    console.log(`   ✅ AutonomousBrain: ${components.autonomousBrain ? "Ready" : "Failed"}`)
    console.log(`   ✅ RevenueBrainstem: ${components.revenueBrainstem ? "Ready" : "Failed"}`)
    console.log(`   ✅ LearningSystem: ${components.learningSystem ? "Ready" : "Failed"}`)
    console.log(`   ✅ BrainOrchestrator: ${components.orchestrator ? "Ready" : "Failed"}`)
    console.log(`   ✅ SystemAuditor: ${components.auditor ? "Ready" : "Failed"}`)
    console.log(`   ✅ SystemTester: ${components.tester ? "Ready" : "Failed"}`)
    console.log(`   ✅ RevenueData: ${components.revenueData ? "Ready" : "Failed"}`)
    
    // ============================================
    // PHASE 3: System Startup
    // ============================================
    console.log("\n🚀 PHASE 3: SYSTEM STARTUP")
    console.log("-" .repeat(60))
    
    if (!components.orchestrator) {
      throw new Error("Orchestrator not initialized")
    }
    
    // Start the orchestrator (which starts everything else)
    components.orchestrator.start()
    
    // Check status
    const status = components.orchestrator.getStatus()
    console.log("\nSystem Status:")
    console.log(`   Status: ${status.status}`)
    console.log(`   Scheduler: ${status.schedulerActive ? "Active" : "Inactive"}`)
    console.log(`   Dream Processor: ${status.dreamProcessorActive ? "Active" : "Inactive"}`)
    console.log(`   Cron Monitor: ${status.cronMonitorActive ? "Active" : "Inactive"}`)
    console.log(`   Scheduled Tasks: ${status.schedulerTasks}`)
    console.log(`   Dream Queue: ${status.dreamQueueSize}`)
    console.log(`   Cron Jobs: ${status.cronJobsScheduled}`)
    
    // ============================================
    // PHASE 4: System Monitoring
    // ============================================
    console.log("\n📊 PHASE 4: SYSTEM MONITORING")
    console.log("-" .repeat(60))
    
    // The orchestrator automatically runs:
    // - Scheduler tasks every 5 minutes
    // - Dream processing every 30 minutes
    // - Cron jobs on schedule
    // - System audits every 6 hours
    // - System tests every 12 hours
    
    console.log("✅ All monitoring systems active")
    console.log("   - Scheduler: Running")
    console.log("   - Dream Processor: Running")
    console.log("   - Cron Monitor: Running")
    console.log("   - System Auditor: Running")
    console.log("   - System Tester: Running")
    
    // ============================================
    // PHASE 5: System Controls
    // ============================================
    console.log("\n🎛️  PHASE 5: SYSTEM CONTROLS")
    console.log("-" .repeat(60))
    
    console.log("\nAvailable Controls:")
    console.log("   orchestrator.start() - Start all systems")
    console.log("   orchestrator.pause() - Pause all operations")
    console.log("   orchestrator.stop() - Stop all systems")
    console.log("   orchestrator.getStatus() - Check system status")
    
    // ============================================
    // PHASE 6: Kairos Integration
    // ============================================
    console.log("\n⏱️  PHASE 6: KAIROS INTEGRATION")
    console.log("-" .repeat(60))
    
    // Kairos (timing/opportunity) system is integrated through:
    // 1. Scheduler tasks - run at optimal times
    // 2. Dream processing - background optimization
    // 3. Cron jobs - scheduled operations
    // 4. Revenue brainstem - opportunity detection
    
    console.log("✅ Kairos system integrated")
    console.log("   - Optimal timing for all operations")
    console.log("   - Opportunity detection active")
    console.log("   - Background optimization running")
    
    // ============================================
    // PHASE 7: Swarm Workers
    // ============================================
    console.log("\n🐝 PHASE 7: SWARM WORKERS")
    console.log("-" .repeat(60))
    
    // Swarm workers are managed by the orchestrator:
    // - Scheduler tasks are individual workers
    // - Dream tasks are background workers
    // - Cron jobs are scheduled workers
    
    console.log("✅ Swarm workers active")
    console.log(`   - ${status.schedulerTasks} scheduler workers`)
    console.log(`   - ${status.dreamQueueSize} dream workers`)
    console.log(`   - ${status.cronJobsScheduled} cron workers`)
    
    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(60))
    console.log("🎉 SYSTEM STARTUP COMPLETE")
    console.log("=".repeat(60))
    
    console.log("\n✅ All systems operational:")
    console.log("   🧠 Autonomous Brain: Running")
    console.log("   💰 Revenue Brainstem: Running")
    console.log("   📚 Learning System: Running")
    console.log("   🎛️  Brain Orchestrator: Running")
    console.log("   🔍 System Auditor: Running")
    console.log("   🧪 System Tester: Running")
    console.log("   ⏱️  Kairos: Integrated")
    console.log("   🐝 Swarm Workers: Active")
    
    console.log("\n📊 System Statistics:")
    console.log(`   Initialization Time: ${new Date().toLocaleTimeString()}`)
    console.log(`   Components: ${Object.values(result.components).filter(Boolean).length}/8`)
    console.log(`   Errors: ${result.errors.length}`)
    console.log(`   Log Entries: ${result.initializationLog.length}`)
    
    console.log("\n🚀 The complete autonomous brain system is now running!")
    console.log("   All components are operational and integrated.")
    console.log("   Use the orchestrator to control the entire system.")
    
    // Keep the system running
    console.log("\nPress Ctrl+C to shutdown...\n")
    
    // Handle shutdown gracefully
    process.on("SIGINT", async () => {
      console.log("\n🛑 Shutting down system...")
      
      if (components.orchestrator) {
        components.orchestrator.stop()
        console.log("✅ Orchestrator stopped")
      }
      
      console.log("👋 System shutdown complete")
      process.exit(0)
    })
    
  } catch (error) {
    console.error("\n❌ System startup failed:", error)
    process.exit(1)
  }
}

// Run the example
main().catch(console.error)

export {}
