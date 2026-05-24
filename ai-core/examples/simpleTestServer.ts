/**
 * Simple Test Server
 * Basic Express server for testing API functionality
 */

import express from "express"
import cors from "cors"

async function main() {
  console.log("🚀 Starting Simple Test Server")
  console.log("=" .repeat(60))
  
  // Initialize Express app
  const app = express()
  const PORT = process.env.PORT || 3000
  
  // Middleware
  app.use(cors())
  app.use(express.json())
  
  // API Endpoints
  app.get("/api/status", (req, res) => {
    res.json({
      success: true,
      status: "running",
      message: "Simple test server is running"
    })
  })
  
  app.get("/api/data", (req, res) => {
    res.json({
      success: true,
      data: "Test data from simple server"
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
  
  // Test API client endpoint
  app.get("/api/test-client", (req, res) => {
    res.json({
      success: true,
      message: "API client test endpoint working"
    })
  })
  
  // Start server
  app.listen(PORT, () => {
    console.log(`✅ Simple test server running on http://localhost:${PORT}`)
    console.log("\nAvailable endpoints:")
    console.log(`   GET  /api/status - System status`)
    console.log(`   GET  /api/data - Sample data`)
    console.log(`   POST /api/users - Create user`)
    console.log(`   GET  /api/test-client - API client test`)
    console.log(`   GET  /health - Health check`)
    console.log("\nPress Ctrl+C to stop the server")
  })
}

// Run the server
main().catch(console.error)

export {}
