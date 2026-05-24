import { AICore } from "../src/AICore"
import { LocalProvider } from "../src/proiders/local"

/**
 * Brain Controls and Local Model Example
 * Demonstrates start/stop/pause controls and local model integration
 */

async function main() {
  console.log("🧠 Brain Controls and Local Model Example")
  console.log("=" .repeat(50))
  
  // Example 1: Basic Controls
  console.log("\n📋 Example 1: Basic Brain Controls")
  console.log("-" .repeat(50))
  
  const core = new AICore({
    providers: {
      gemini: { apiKey: process.env.GEMINI_API_KEY || "" },
      ollama: { baseUrl: "http://localhost:11434" }, // Local Ollama server
    },
  })
  
  // Check initial status
  const initialStatus = core.getStatus()
  console.log(`Initial status:`, initialStatus)
  
  // Start the brain
  core.start()
  console.log(`✅ Brain started:`, core.getStatus())
  
  // Generate some content
  const result = await core.generate("Hello, world!", { taskType: "chat" })
  console.log(`🤖 Generated: ${result.text.substring(0, 50)}...`)
  
  // Pause the brain
  core.pause()
  console.log(`⏸️  Brain paused:`, core.getStatus())
  
  // Resume the brain
  core.resume()
  console.log(`▶️  Brain resumed:`, core.getStatus())
  
  // Stop the brain
  core.stop()
  console.log(`⏹️  Brain stopped:`, core.getStatus())
  
  // Example 2: Local Model Integration
  console.log("\n💻 Example 2: Local Model Integration")
  console.log("-" .repeat(50))
  
  // Check if local model is available
  const hasLocalModel = await core.checkLocalModel()
  console.log(`Local model available: ${hasLocalModel ? "✅ Yes" : "❌ No"}`)
  
  if (hasLocalModel) {
    // List available models
    const models = await core.listLocalModels()
    console.log(`Available local models: ${models.join(", ")}`)
    
    // Use local model for generation
    try {
      const localResult = await core.generate("Explain quantum computing simply", {
        taskType: "chat",
        model: "llama3", // Use local model
      })
      
      console.log(`🤖 Local model response: ${localResult.text.substring(0, 100)}...`)
      console.log(`   Provider: ${localResult.provider}`)
      console.log(`   Model: ${localResult.model}`)
      console.log(`   Cost: $${localResult.costUsd} (local models are free!)`)
      console.log(`   Latency: ${localResult.latencyMs}ms`)
      
    } catch (error) {
      console.error(`❌ Local model error:`, error)
    }
  } else {
    console.log("⚠️  Local model not available. Make sure Ollama is running.")
    console.log("   Try: ollama run llama3")
  }
  
  // Example 3: Fallback to Cloud Models
  console.log("\n☁️  Example 3: Cloud Model Fallback")
  console.log("-" .repeat(50))
  
  core.start() // Restart for cloud usage
  
  try {
    const cloudResult = await core.generate("What's the weather in San Francisco?", {
      taskType: "chat",
    })
    
    console.log(`🤖 Cloud model response: ${cloudResult.text.substring(0, 100)}...`)
    console.log(`   Provider: ${cloudResult.provider}`)
    console.log(`   Model: ${cloudResult.model}`)
    console.log(`   Cost: $${cloudResult.costUsd}`)
    
  } catch (error) {
    console.error(`❌ Cloud model error:`, error)
  }
  
  // Example 4: Hybrid Approach
  console.log("\n🔄 Example 4: Hybrid Local + Cloud")
  console.log("-" .repeat(50))
  
  // Add a custom route that prefers local models for certain tasks
  core.addRoute({
    taskType: "summarization",
    provider: "ollama", // Try local first
    model: "llama3",
    fallback: {
      provider: "gemini", // Fall back to cloud
      model: "gemini-2.0-flash",
    },
  })
  
  console.log("✅ Added hybrid route for summarization tasks")
  console.log("   - Primary: Local Llama3 model")
  console.log("   - Fallback: Gemini cloud model")
  
  try {
    const hybridResult = await core.generate(
      "Summarize the benefits of renewable energy in 3 sentences.",
      { taskType: "summarization" }
    )
    
    console.log(`🤖 Hybrid result: ${hybridResult.text}`)
    console.log(`   Used ${hybridResult.provider} ${hybridResult.model}`)
    
  } catch (error) {
    console.error(`❌ Hybrid approach error:`, error)
  }
  
  // Final status
  console.log("\n" + "=".repeat(50))
  console.log("📊 FINAL SYSTEM STATUS")
  console.log("=" .repeat(50))
  
  const finalStats = core.getStats()
  const finalStatus = core.getStatus()
  
  console.log(`Status: ${finalStatus.isRunning ? "Running" : "Stopped"}`)
  console.log(`Total calls: ${finalStats.totalCalls}`)
  console.log(`Error rate: ${finalStats.errorRate}%`)
  console.log(`Providers used: ${Object.keys(finalStats.callsByProvider).join(", ")}`)
  
  console.log("\n✅ Brain controls and local model example complete!")
  console.log("\nKey Features Demonstrated:")
  console.log("  ✅ Start/Stop/Pause brain controls")
  console.log("  ✅ Local model integration (Ollama)")
  console.log("  ✅ Cloud model fallback")
  console.log("  ✅ Hybrid routing (local → cloud)")
  console.log("  ✅ Cost optimization (local models are free)")
}

// Run the example
main().catch(console.error)
