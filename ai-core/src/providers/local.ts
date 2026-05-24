import { GenerateOptions, GenerateResult } from "../types"

/**
 * Local Provider - Ollama/Local LLM Integration
 * Supports running local models for privacy and cost savings
 */
export class LocalProvider {
  private baseUrl: string
  private defaultModel: string
  
  constructor(baseUrl: string, defaultModel: string = "llama3") {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
    this.defaultModel = defaultModel
    
    // Auto-detect server type
    this.serverType = this.detectServerType(baseUrl)
  }
  
  private serverType: "ollama" | "llamacpp" | "unknown" = "unknown"
  
  private detectServerType(baseUrl: string): "ollama" | "llamacpp" | "unknown" {
    // Simple heuristic based on common ports
    if (baseUrl.includes(":11434")) return "ollama"
    if (baseUrl.includes(":8080")) return "llamacpp"
    return "unknown"
  }
  
  /**
   * Generate text using local model
   */
  async generate(prompt: string, options: GenerateOptions & { model?: string } = {}): Promise<GenerateResult> {
    const model = options.model || this.defaultModel
    const startTime = Date.now()
    
    try {
      let endpoint = ""
      let requestBody = {}
      
      // Different endpoints for different server types
      if (this.serverType === "ollama") {
        endpoint = `${this.baseUrl}/api/generate`
        requestBody = {
          model: model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 2048,
          },
        }
      } else if (this.serverType === "llamacpp") {
        endpoint = `${this.baseUrl}/completion`
        requestBody = {
          prompt: prompt,
          temperature: options.temperature || 0.7,
          n_predict: options.maxTokens || 2048,
          stop: ["\n", "<|im_end|>"],
        }
      } else {
        // Default to Ollama API
        endpoint = `${this.baseUrl}/api/generate`
        requestBody = {
          model: model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 2048,
          },
        }
      }
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        throw new Error(`${this.serverType} model error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      const endTime = Date.now()
      
      // Extract response based on server type
      let responseText = ""
      if (this.serverType === "ollama") {
        responseText = data.response || ""
      } else if (this.serverType === "llamacpp") {
        responseText = data.content || ""
      } else {
        responseText = data.response || data.content || ""
      }
      
      return {
        text: responseText,
        provider: "ollama",
        model: model,
        tokensUsed: this.estimateTokens(responseText),
        costUsd: 0, // Local models have no cost
        latencyMs: endTime - startTime,
        confidence: 0.9, // Estimated confidence for local models
      }
      
    } catch (error) {
      const endTime = Date.now()
      throw new Error(`Local model generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  
  /**
   * Chat with local model
   */
  async chat(messages: Array<{ role: string; content: string }>, options: GenerateOptions & { model?: string } = {}): Promise<GenerateResult> {
    const model = options.model || this.defaultModel
    const startTime = Date.now()
    
    try {
      let endpoint = ""
      let requestBody = {}
      
      // Format messages appropriately for each server type
      const formattedMessages = messages.map(m => ({
        role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }))
      
      if (this.serverType === "ollama") {
        endpoint = `${this.baseUrl}/api/chat`
        requestBody = {
          model: model,
          messages: formattedMessages,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
          },
        }
      } else if (this.serverType === "llamacpp") {
        endpoint = `${this.baseUrl}/chat`
        requestBody = {
          messages: formattedMessages,
          temperature: options.temperature || 0.7,
          n_predict: options.maxTokens || 2048,
        }
      } else {
        // Default to Ollama API
        endpoint = `${this.baseUrl}/api/chat`
        requestBody = {
          model: model,
          messages: formattedMessages,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
          },
        }
      }
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        throw new Error(`${this.serverType} model chat error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      const endTime = Date.now()
      
      // Extract response based on server type
      let responseText = ""
      if (this.serverType === "ollama") {
        responseText = data.message?.content || ""
      } else if (this.serverType === "llamacpp") {
        responseText = data.choices?.[0]?.message?.content || data.message?.content || ""
      } else {
        responseText = data.message?.content || data.choices?.[0]?.message?.content || ""
      }
      
      return {
        text: responseText,
        provider: "ollama",
        model: model,
        tokensUsed: this.estimateTokens(responseText),
        costUsd: 0, // Local models have no cost
        latencyMs: endTime - startTime,
        confidence: 0.9, // Estimated confidence for local models
      }
      
    } catch (error) {
      const endTime = Date.now()
      throw new Error(`Local model chat failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  
  /**
   * Estimate token count (simplified)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: approximately 4 characters per token
    return Math.ceil(text.length / 4)
  }
  
  /**
   * List available local models
   */
  async listModels(): Promise<{ models: Array<{ name: string; modified_at: string; size: number; digest: string }> }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status} ${response.statusText}`)
      }
      
      return await response.json()
      
    } catch (error) {
      throw new Error(`Failed to list models: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  
  /**
   * Check if local model is available
   */
  async checkModelAvailability(model: string = this.defaultModel): Promise<boolean> {
    try {
      const models = await this.listModels()
      return models.models.some(m => m.name === model)
    } catch (error) {
      return false
    }
  }
  
  /**
   * Test server connectivity
   */
  async testConnectivity(): Promise<{ 
    success: boolean
    serverType: string
    latencyMs: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      // Simple GET request to test connectivity
      const response = await fetch(this.baseUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      const latency = Date.now() - startTime
      
      if (response.ok) {
        return {
          success: true,
          serverType: this.serverType,
          latencyMs: latency,
        }
      } else {
        return {
          success: false,
          serverType: this.serverType,
          latencyMs: latency,
          error: `Server responded with ${response.status}`,
        }
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        success: false,
        serverType: this.serverType,
        latencyMs: latency,
        error: error instanceof Error ? error.message : "Connection failed",
      }
    }
  }
  
  /**
   * Get current provider status
   */
   getStatus(): { 
    baseUrl: string
    defaultModel: string
    serverType: string
    isConfigured: boolean
  } {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      serverType: this.serverType,
      isConfigured: true,
    }
  }
}
