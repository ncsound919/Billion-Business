/**
 * Local Server Setup Example
 * Complete guide to setting up and using local model servers with the AI system
 */

import { AICore } from "../src/AICore"
import { LocalProvider } from "../src/providers/local"

async function main() {
  console.log("🚀 Local Model Server Setup Guide")
  console.log("=" .repeat(60))
  
  // ============================================
  // SECTION 1: Server Setup Instructions
  // ============================================
  console.log("\n📋 SECTION 1: SERVER SETUP INSTRUCTIONS")
  console.log("-" .repeat(60))
  
  console.log("\n1. OLLAMA SERVER (Recommended)")
  console.log("   Install: https://ollama.ai")
  console.log("   Start server: ollama serve")
  console.log("   Pull models:")
  console.log("     ollama pull llama3")
  console.log("     ollama pull gemma:4b")
  console.log("     ollama pull mistral")
  console.log("   Default URL: http://localhost:11434")
  
  console.log("\n2. LLAMA.CPP SERVER")
  console.log("   Install: https://github.com/ggerganov/llama.cpp")
  console.log("   Start server:")
  console.log("     ./server -m gemma-4b.gguf -c 4096 --host 0.0.0.0 --port 8080")
  console.log("   Example URLs:")
  console.log("     Gemma-4: http://localhost:8080")
  console.log("     Hermes: http://localhost:9119")
  
  console.log("\n3. VLLM SERVER (for multiple GPUs)")
  console.log("   Install: pip install vllm")
  console.log("   Start server:")
  console.log("     python -m vllm.entrypoints.openai.api_server \\")
  console.log("       --model gemma-4b \\")
  console.log("       --host 0.0.0.0 \\")
  console.log("       --port 8000")
  console.log("   Default URL: http://localhost:8000/v1")
  
  // ============================================
  // SECTION 2: Connect to Local Servers
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("🔌 SECTION 2: CONNECT TO LOCAL SERVERS")
  console.log("-" .repeat(60))
  
  // Example 1: Ollama Connection
  console.log("\n1. Connecting to Ollama...")
  const ollamaProvider = new LocalProvider("http://localhost:11434", "llama3")
  
  try {
    const ollamaStatus = await ollamaProvider.testConnectivity()
    if (ollamaStatus.success) {
      console.log("✅ Ollama connected successfully!")
      console.log(`   Latency: ${ollamaStatus.latencyMs}ms`)
      console.log(`   Server type: ${ollamaStatus.serverType}`)
    } else {
      console.log("❌ Ollama connection failed:", ollamaStatus.error)
      console.log("   Try: ollama serve")
    }
  } catch (error) {
    console.log("❌ Ollama test error:", error)
  }
  
  // Example 2: Llama.cpp Connection
  console.log("\n2. Connecting to llama.cpp...")
  const llamacppProvider = new LocalProvider("http://localhost:8080", "gemma-4b")
  
  try {
    const llamacppStatus = await llamacppProvider.testConnectivity()
    if (llamacppStatus.success) {
      console.log("✅ llama.cpp connected successfully!")
      console.log(`   Latency: ${llamacppStatus.latencyMs}ms`)
      console.log(`   Server type: ${llamacppStatus.serverType}`)
    } else {
      console.log("❌ llama.cpp connection failed:", llamacppStatus.error)
      console.log("   Try: ./server -m gemma-4b.gguf -c 4096 --port 8080")
    }
  } catch (error) {
    console.log("❌ llama.cpp test error:", error)
  }
  
  // ============================================
  // SECTION 3: Initialize AI Core with Local Models
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("🤖 SECTION 3: INITIALIZE AI CORE")
  console.log("-" .repeat(60))
  
  // Configure AI Core with multiple local providers
  const core = new AICore({
    providers: {
      // Cloud providers (fallback)
      gemini: { apiKey: process.env.GEMINI_API_KEY || "" },
      
      // Local providers
      ollama: {
        baseUrl: "http://localhost:11434",
        model: "llama3"
      },
      llamacpp: {
        baseUrl: "http://localhost:8080",
        model: "gemma-4b"
      }
    },
    costTracking: {
      enabled: true,
      budgetLimitUsd: 100,
    },
  })
  
  console.log("✅ AI Core initialized with local model support")
  
  // Check which local models are available
  console.log("\n3. Checking local model availability...")
  
  const modelsAvailable = []
  
  // Check Ollama
  if (await core.checkLocalModel("llama3")) {
    modelsAvailable.push("Ollama: llama3")
  }
  
  // Check llama.cpp
  try {
    const llamacpp = new LocalProvider("http://localhost:8080", "gemma-4b")
    if (await llamacpp.testConnectivity().then(r => r.success)) {
      modelsAvailable.push("llama.cpp: gemma-4b")
    }
  } catch (error) {
    // Server not running
  }
  
  if (modelsAvailable.length > 0) {
    console.log("✅ Available local models:")
    modelsAvailable.forEach(model => console.log(`   - ${model}`))
  } else {
    console.log("⚠️  No local models detected. Starting cloud-only mode.")
  }
  
  // ============================================
  // SECTION 4: Using Local Models
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("📝 SECTION 4: USING LOCAL MODELS")
  console.log("-" .repeat(60))
  
  if (modelsAvailable.length > 0) {
    // Example 1: Direct local model usage
    console.log("\n1. Direct local model usage...")
    try {
      const result = await core.generate("Explain quantum computing in simple terms", {
        taskType: "chat",
        model: "llama3", // Specify local model
      })
      
      console.log("✅ Local model response:")
      console.log(`   "${result.text.substring(0, 100)}...`)
      console.log(`   Provider: ${result.provider}`)
      console.log(`   Model: ${result.model}`)
      console.log(`   Cost: $${result.costUsd} (local models are free!)`)
      console.log(`   Latency: ${result.latencyMs}ms`)
      
    } catch (error) {
      console.log("❌ Local generation error:", error)
    }
    
    // Example 2: Hybrid routing (local first, cloud fallback)
    console.log("\n2. Setting up hybrid routing...")
    
    core.addRoute({
      taskType: "summarization",
      provider: "ollama", // Try local first
      model: "llama3",
      fallback: {
        provider: "gemini", // Fall back to cloud
        model: "gemini-2.0-flash",
      },
    })
    
    console.log("✅ Hybrid route configured:")
    console.log("   - Primary: Local llama3 model")
    console.log("   - Fallback: Gemini cloud model")
    
    try {
      const hybridResult = await core.generate(
        "Summarize the benefits of renewable energy in 3 bullet points.",
        { taskType: "summarization" }
      )
      
      console.log("✅ Hybrid result:")
      console.log(hybridResult.text)
      console.log(`   Used: ${hybridResult.provider} ${hybridResult.model}`)
      
    } catch (error) {
      console.log("❌ Hybrid generation error:", error)
    }
  } else {
    console.log("⚠️  Skipping local model examples (no servers running)")
  }
  
  // ============================================
  // SECTION 5: Advanced Configuration
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("⚙️  SECTION 5: ADVANCED CONFIGURATION")
  console.log("-" .repeat(60))
  
  console.log("\n1. Custom Model Routing")
  console.log("   Route different tasks to different models:")
  
  // Coding tasks to local model
  core.addRoute({
    taskType: "coding",
    provider: "ollama",
    model: "llama3",
    fallback: {
      provider: "openai",
      model: "gpt-4o",
    },
  })
  
  // Creative tasks to cloud model
  core.addRoute({
    taskType: "creative",
    provider: "gemini",
    model: "gemini-2.5-pro",
  })
  
  console.log("✅ Custom routes configured")
  
  console.log("\n2. Model-Specific Settings")
  console.log("   Configure different parameters per model:")
  
  // Local model with high creativity
  const creativeResult = await core.generate("Write a haiku about autumn", {
    taskType: "creative",
    temperature: 0.9, // High creativity
    model: "llama3",
  })
  
  console.log("✅ Creative generation:")
  console.log(creativeResult.text)
  
  // Local model with precise answers
  const preciseResult = await core.generate("What is 42 * 157?", {
    taskType: "chat",
    temperature: 0.1, // Low creativity, precise
    model: "llama3",
  })
  
  console.log("✅ Precise generation:")
  console.log(preciseResult.text)
  
  // ============================================
  // SECTION 6: Monitoring and Management
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("📊 SECTION 6: MONITORING AND MANAGEMENT")
  console.log("-" .repeat(60))
  
  // Get system status
  const status = core.getStatus()
  console.log("\n1. System Status:")
  console.log(`   Running: ${status.isRunning}`)
  console.log(`   Paused: ${status.isPaused}`)
  console.log(`   Can generate: ${status.canGenerate}`)
  
  // Get usage statistics
  const stats = core.getStats()
  console.log("\n2. Usage Statistics:")
  console.log(`   Total calls: ${stats.totalCalls}`)
  console.log(`   Error rate: ${stats.errorRate}%`)
  console.log(`   Providers used: ${Object.keys(stats.callsByProvider).join(", ")}`)
  
  // List available models
  try {
    const models = await core.listLocalModels()
    console.log(`\n3. Available Models: ${models.length}`)
    models.forEach(model => console.log(`   - ${model}`))
  } catch (error) {
    console.log("\n3. Available Models: Could not retrieve")
  }
  
  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("🎉 SETUP COMPLETE!")
  console.log("=".repeat(60))
  
  console.log("\n✅ Configuration Summary:")
  console.log(`   Local models: ${modelsAvailable.length > 0 ? "Connected" : "Not detected"}`)
  console.log(`   Cloud fallback: ${core.getStats().callsByProvider.gemini || 0} calls`)
  console.log(`   Hybrid routing: Configured`)
  console.log(`   System status: ${status.isRunning ? "Running" : "Stopped"}`)
  
  console.log("\n📋 Quick Reference:")
  console.log("   Start Ollama: ollama serve")
  console.log("   Start llama.cpp: ./server -m model.gguf -c 4096 --port 8080")
  console.log("   List models: ollama list")
  console.log("   Pull model: ollama pull llama3")
  
  console.log("\n🚀 Your AI system is ready to use!")
  console.log("   - Local models for privacy and cost savings")
  console.log("   - Cloud fallback for reliability")
  console.log("   - Hybrid routing for optimal performance")
}

// Run the example
main().catch(console.error)

export {}
