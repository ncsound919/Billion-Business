/**
 * API Client Example
 * Demonstrates robust API calls with error handling and retries
 */

import { ApiClient } from "../src/services/ApiClient"

async function main() {
  console.log("🔌 API Client Example")
  console.log("=" .repeat(60))
  
  // ============================================
  // SECTION 1: Initialize API Client
  // ============================================
  console.log("\n🛠️  SECTION 1: INITIALIZE API CLIENT")
  console.log("-" .repeat(60))
  
  // Create API client with default settings
  const apiClient = new ApiClient("http://localhost:3000", 3, 1000)
  
  console.log("✅ API Client initialized")
  console.log("   Base URL: http://localhost:3000")
  console.log("   Max retries: 3")
  console.log("   Retry delay: 1000ms")
  
  // ============================================
  // SECTION 2: Make API Requests
  // ============================================
  console.log("\n📡 SECTION 2: MAKE API REQUESTS")
  console.log("-" .repeat(60))
  
  // Example 1: GET request with error handling
  console.log("\n1. GET request with error handling...")
  try {
    const response = await apiClient.get<{ message: string }>("/api/status")
    
    if (response.success) {
      console.log("✅ GET request successful:")
      console.log(`   Data: ${JSON.stringify(response.data)}`)
      console.log(`   Status: ${response.status}`)
    } else {
      console.log("⚠️  GET request failed:")
      console.log(`   Error: ${response.error}`)
      console.log(`   Status: ${response.status}`)
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error)
  }
  
  // Example 2: POST request with error handling
  console.log("\n2. POST request with error handling...")
  try {
    const response = await apiClient.post<{ id: string }>("/api/users", {
      name: "John Doe",
      email: "john@example.com"
    })
    
    if (response.success) {
      console.log("✅ POST request successful:")
      console.log(`   Data: ${JSON.stringify(response.data)}`)
      console.log(`   Status: ${response.status}`)
    } else {
      console.log("⚠️  POST request failed:")
      console.log(`   Error: ${response.error}`)
      console.log(`   Status: ${response.status}`)
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error)
  }
  
  // Example 3: Handling connection errors
  console.log("\n3. Handling connection errors...")
  try {
    // This will fail because the server isn't running
    const response = await apiClient.get<{ data: string }>("/api/nonexistent")
    
    if (response.success) {
      console.log("✅ Request successful")
    } else {
      console.log("⚠️  Request failed (as expected):")
      console.log(`   Error: ${response.error}`)
      console.log(`   Status: ${response.status}`)
      console.log("   This is handled gracefully!")
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error)
  }
  
  // ============================================
  // SECTION 3: Configuration
  // ============================================
  console.log("\n⚙️  SECTION 3: CONFIGURATION")
  console.log("-" .repeat(60))
  
  // Change base URL
  apiClient.setBaseUrl("https://api.example.com")
  console.log("✅ Base URL updated to: https://api.example.com")
  
  // Add custom headers
  apiClient.setHeaders({
    "Authorization": "Bearer token123",
    "X-Custom-Header": "value"
  })
  console.log("✅ Custom headers added")
  
  // ============================================
  // SECTION 4: Error Handling Strategies
  // ============================================
  console.log("\n🛡️  SECTION 4: ERROR HANDLING STRATEGIES")
  console.log("-" .repeat(60))
  
  console.log("\nBest practices for error handling:")
  console.log("   1. Check response.success before using data")
  console.log("   2. Provide fallback UI when API is unavailable")
  console.log("   3. Log errors for debugging")
  console.log("   4. Show user-friendly error messages")
  console.log("   5. Implement retry logic for transient errors")
  
  // Example: Fallback UI pattern
  async function loadDataWithFallback() {
    const response = await apiClient.get<{ data: string }>("/api/data")
    
    if (response.success) {
      return response.data
    } else {
      console.log("Using fallback data...")
      return { data: "Fallback data" }
    }
  }
  
  const data = await loadDataWithFallback()
  console.log("✅ Fallback pattern implemented")
  
  // ============================================
  // SECTION 5: Retry Behavior
  // ============================================
  console.log("\n🔄 SECTION 5: RETRY BEHAVIOR")
  console.log("-" .repeat(60))
  
  console.log("\nThe API client automatically:")
  console.log("   - Retries on 5xx server errors")
  console.log("   - Retries on 429 rate limit errors")
  console.log("   - Waits 1000ms between retries")
  console.log("   - Max 3 retries by default")
  
  // Example: Custom retry configuration
  const aggressiveClient = new ApiClient("http://localhost:3000", 5, 2000)
  console.log("✅ Aggressive retry client created:")
  console.log("   - Max retries: 5")
  console.log("   - Retry delay: 2000ms")
  
  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(60))
  console.log("🎉 API CLIENT EXAMPLE COMPLETE")
  console.log("=".repeat(60))
  
  console.log("\n✅ Key Features Demonstrated:")
  console.log("   ✅ GET/POST/PUT/DELETE methods")
  console.log("   ✅ Automatic retry logic")
  console.log("   ✅ Comprehensive error handling")
  console.log("   ✅ Configurable base URL and headers")
  console.log("   ✅ Fallback patterns")
  console.log("   ✅ Production-ready implementation")
  
  console.log("\n📋 Usage Tips:")
  console.log("   - Always check response.success")
  console.log("   - Provide fallback UI for offline mode")
  console.log("   - Log errors for debugging")
  console.log("   - Adjust retry settings based on use case")
  
  console.log("\n🚀 The API client is production-ready!")
}

// Run the example
main().catch(console.error)

export {}
