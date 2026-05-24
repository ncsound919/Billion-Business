/**
 * Development Server
 * Simple Express server for testing the autonomous brain system
 */

import express from "express"
import cors from "cors"
import { AICore } from "../src/AICore"
import { AutonomousBrain } from "../src/autonomous/AutonomousBrain"
import { RevenueBrainstem } from "../src/revenue/RevenueBrainstem"
import { ContinuousLearning } from "../src/learning/ContinuousLearning"
import { BrainOrchestrator } from "../src/autonomous/BrainOrchestrator"

async function main() {
  console.log("🚀 Starting Development Server")
  console.log("=" .repeat(60))
  
  // Initialize Express app
  const app = express()
  const PORT = process.env.PORT || 3000
  
  // Middleware
  app.use(cors())
  app.use(express.json())
  
  // Initialize AI systems
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
  
  const orchestrator = new BrainOrchestrator(core, revenueBrainstem, learningSystem)
  
  // API Endpoints
  app.get("/api/status", (req, res) => {
    const status = orchestrator.getStatus()
    res.json({
      success: true,
      status,
      message: "System is running"
    })
  })
  
  app.get("/api/data", (req, res) => {
    res.json({
      success: true,
      data: "Sample data from development server"
    })
  })
  
  app.post("/api/users", (req, res) => {
    console.log("Creating user:", req.body)
    res.json({
      success: true,
      id: "user-" + Math.random().toString(36).substring(2, 9),
      ...req.body
    })
  })
  
  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok" })
  })
  
  // Start server
  app.listen(PORT, () => {
    console.log(`✅ Development server running on http://localhost:${PORT}`)
    console.log("\nAvailable endpoints:")
    console.log(`   GET  /api/status - System status`)
    console.log(`   GET  /api/data - Sample data`)
    console.log(`   POST /api/users - Create user`)
    console.log(`   GET  /health - Health check`)
    console.log("\nPress Ctrl+C to stop the server")
  })
}

// Run the server
main().catch(console.error)

export {}
