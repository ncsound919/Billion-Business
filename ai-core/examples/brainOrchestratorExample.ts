/**
 * Brain Orchestrator Example
 * Demonstrates the complete autonomous brain system with scheduler, dreams, and crons
 */

import { AICore } from "../src/AICore"
import { AutonomousBrain } from "../src/autonomous/AutonomousBrain"
import { RevenueBrainstem } from "../src/revenue/RevenueBrainstem"
import { ContinuousLearning } from "../src/learning/ContinuousLearning"
import { BrainOrchestrator } from "../src/autonomous/BrainOrchestrator"

async function main() {
  console.log("🧠 Brain Orchestrator Example")
  console.log("=" .repeat(60))
  
  // Initialize all subsystems
  const core = new AICore({
    providers: {
      gemini: { apiKey: process.env.GEMINI_API_KEY || "test-key" },
      ollama: { baseUrl: "http://localhost:11434" },
    },
  })
  
  const learningSystem = new ContinuousLearning(core)
  
  const revenueBrainstem = new RevenueBrainstem(core, new AutoConfig(), learningSystem, {
    mrrTarget: 100000,
    maxCac: 2500,
    maxPaybackMonths: 12,
    targetCloseRate: 25,
    targetChurnRate: 3,
  })
  
  const autonomousBrain = new AutonomousBrain({
    providers: {
      gemini: { apiKey: process.env.GEMINI_API_KEY || "test-key" },
    },
  })
  
  // Initialize the orchestrator
  const orchestrator = new BrainOrchestrator(core, revenueBrainstem, learningSystem)
  
  // ============================================
  // SECTION 1: Start the Orchestrator
  // ============================================
  console.log("\n🚀 SECTION 1: STARTING THE ORCHESTRATOR")
  console.log("-" .repeat(60))
  
  // Start all systems
  orchestrator.start()
  
  // Check status
  const status = orchestrator.getStatus()
  console.log("\n✅ Orchestrator Status:")
  console.log(`   Status: ${status.status}`)
  console.log(`   Scheduler: ${status.schedulerActive ? "Active" : "Inactive"}`)
  console.log(`   Dream Processor: ${status.dreamProcessorActive ? "Active" : "Inactive"}`)
  console.log(`   Cron Monitor: ${status.cronMonitorActive ? "Active" : "Inactive"}`)
  console.log(`   Scheduled Tasks: ${status.schedulerTasks}`)
  console.log(`   Dream Queue: ${status.dreamQueueSize}`)
  console.log(`   Cron Jobs: ${status.cronJobsScheduled}`)
  
  // ============================================
  // SECTION 2: Scheduler Tasks
  // ============================================
  console.log("\n⏰ SECTION 2: SCHEDULER TASKS")
  console.log("-" .repeat(60))
  
  const schedulerTasks = orchestrator.getSchedulerTasks()
  console.log(`\n📋 ${schedulerTasks.length} Scheduler Tasks:`)
  schedulerTasks.forEach(task => {
    console.log(`   - ${task.name} (every ${task.frequency})`)
  })
  
  // ============================================
  // SECTION 3: Dream Queue
  // ============================================
  console.log("\n💭 SECTION 3: DREAM QUEUE")
  console.log("-" .repeat(60))
  
  const dreamQueue = orchestrator.getDreamQueue()
  console.log(`\n📋 ${dreamQueue.length} Dream Tasks:`)
  dreamQueue.forEach(dream => {
    console.log(`   - ${dream.name} (priority: ${dream.priority})`)
  })
  
  // ============================================
  // SECTION 4: Cron Jobs
  // ============================================
  console.log("\n🕐 SECTION 4: CRON JOBS")
  console.log("-" .repeat(60))
  
  const cronJobs = orchestrator.getCronJobs()
  console.log(`\n📋 ${cronJobs.length} Cron Jobs:`)
  cronJobs.forEach(job => {
    console.log(`   - ${job.name} (${job.schedule})`)
    if (job.nextRun) {
      console.log(`     Next: ${job.nextRun.toLocaleString()}`)
    }
  })
  
  // ============================================
  // SECTION 5: Control the Orchestrator
  // ============================================
  console.log("\n🎛️  SECTION 5: ORCHESTRATOR CONTROLS")
  console.log("-" .repeat(60))
  
  // Pause the orchestrator
  console.log("\n1. Pausing orchestrator...")
  orchestrator.pause()
  console.log("✅ Orchestrator paused")
  console.log("   - All scheduled tasks paused")
  console.log("   - Current operations will complete")
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Resume the orchestrator
  console.log("\n2. Resuming orchestrator...")
  orchestrator.resume()
  console.log("✅ Orchestrator resumed")
  console.log("   - All systems operational")
  console.log("   - Scheduled tasks continuing")
  
  // ============================================
  // SECTION 6: Add Custom Tasks
  // ============================================
  console.log("\n➕ SECTION 6: ADDING CUSTOM TASKS")
  console.log("-" .repeat(60))
  
  // Add a custom scheduler task
  orchestrator.addSchedulerTask({
    id: "custom-monitoring",
    name: "Custom Performance Monitoring",
    frequency: "30m",
    handler: async () => {
      console.log("[Custom] Running performance monitoring...")
      return { success: true }
    },
  })
  
  console.log("✅ Added custom scheduler task")
  
  // Add a custom dream task
  orchestrator.addDreamTask({
    id: "custom-optimization",
    name: "Custom Optimization Dream",
    priority: "high",
    handler: async () => {
      console.log("[Custom] Running optimization dream...")
      return { success: true }
    },
  })
  
  console.log("✅ Added custom dream task")
  
  // Add a custom cron job
  orchestrator.addCronJob({
    id: "custom-backup",
    name: "Custom Data Backup",
    schedule: "0 2 * * *", // 2 AM daily
    handler: async () => {
      console.log("[Custom] Running data backup...")
      return { success: true }
    },
  })
  
  console.log("✅ Added custom cron job")
  
  // Verify additions
  console.log(`\nUpdated counts:`)
  console.log(`   Scheduler: ${orchestrator.getSchedulerTasks().length} tasks`)
  console.log(`   Dreams: ${orchestrator.getDreamQueue().length} tasks`)
  console.log(`   Cron: ${orchestrator.getCronJobs().length} jobs`)
  
  // ============================================
  // SECTION 7: System Integration
  // ============================================
  console.log("\n🔗 SECTION 7: SYSTEM INTEGRATION")
  console.log("-" .repeat(60))
  
  // The orchestrator automatically integrates with all subsystems:
  
  // 1. Core AI operations
  const coreStatus = autonomousBrain.getSystemStatus()
  console.log(`\n1. Core AI System:`)
  console.log(`   Status: ${coreStatus.systemStatus}`)
  console.log(`   Uptime: ${coreStatus.uptimeHours.toFixed(1)} hours`)
  
  // 2. Revenue brainstem
  const revenueStatus = revenueBrainstem.getRevenueDashboard()
  console.log(`\n2. Revenue Brainstem:`)
  console.log(`   MRR: $${Math.floor(revenueStatus.currentPerformance.mrr).toLocaleString()}`)
  console.log(`   Pipeline: $${Math.floor(revenueStatus.currentPerformance.pipelineValue).toLocaleString()}`)
  
  // 3. Learning system
  const learningStatus = learningSystem.getLearningStats()
  console.log(`\n3. Learning System:`)
  console.log(`   Experiences: ${learningStatus.totalExperiences}`)
  console.log(`   Success Rate: ${learningStatus.successRate.toFixed(1)}%`)
  
  console.log("\n✅ All subsystems integrated and operational")
  
  // ============================================
  // SECTION 8: Stop the Orchestrator
  // ============================================
  console.log("\n🛑 SECTION 8: STOPPING THE ORCHESTRATOR")
  console.log("-" .repeat(60))
  
  orchestrator.stop()
  console.log("✅ Orchestrator stopped")
  console.log("   - All intervals cleared")
  console.log("   - All subsystems stopped")
  console.log("   - Ready for restart")
  
  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("🎉 BRAIN ORCHESTRATOR EXAMPLE COMPLETE")
  console.log("=".repeat(60))
  
  console.log("\n✅ Key Features Demonstrated:")
  console.log("   ✅ Centralized control of all brain components")
  console.log("   ✅ Scheduler for regular tasks (5m, 30m, 1h, etc.)")
  console.log("   ✅ Dream queue for background processing")
  console.log("   ✅ Cron jobs for scheduled operations")
  console.log("   ✅ Start/Stop/Pause controls")
  console.log("   ✅ Automatic integration with all subsystems")
  console.log("   ✅ Custom task addition")
  console.log("   ✅ Status monitoring and reporting")
  
  console.log("\n📊 Orchestrator Benefits:")
  console.log("   • Centralized control of complex AI operations")
  console.log("   • Automated scheduling and task management")
  console.log("   • Background processing with dream queue")
  console.log("   • Scheduled operations with cron jobs")
  console.log("   • Seamless integration with all brain components")
  console.log("   • Comprehensive monitoring and reporting")
  
  console.log("\n🚀 The brain orchestrator provides complete control")
  console.log("   over the autonomous system, ensuring all")
  console.log("   components work together harmoniously!")
}

// Run the example
main().catch(console.error)

export {}
