import { GeminiProvider } from "./providers/gemini"
import { OpenAIProvider } from "./providers/openai"
import { DeepSeekProvider } from "./providers/deepseek"
import { LocalProvider } from "./providers/local"
import {
  AICoreConfig,
  GenerateOptions,
  GenerateResult,
  ModelRoute,
  TaskType,
  ProviderType,
  UsageStats,
  EscalationPayload,
  OversightMode,
} from "./types"
export type { AICoreConfig }

const DEFAULT_ROUTES: ModelRoute[] = [
  { taskType: "coding", provider: "openai", model: "o3", fallback: { provider: "openai", model: "gpt-4o" } },
  { taskType: "business_logic", provider: "openai", model: "gpt-4o", fallback: { provider: "gemini", model: "gemini-2.0-flash" } },
  { taskType: "agent_brain", provider: "openai", model: "gpt-4o", fallback: { provider: "gemini", model: "gemini-2.0-flash" } },
  { taskType: "cross_domain", provider: "gemini", model: "gemini-2.5-pro", fallback: { provider: "gemini", model: "gemini-2.0-flash" } },
  { taskType: "creative", provider: "gemini", model: "gemini-2.0-flash", fallback: { provider: "deepseek", model: "deepseek-chat" } },
  { taskType: "analysis", provider: "gemini", model: "gemini-2.0-flash", fallback: { provider: "deepseek", model: "deepseek-chat" } },
  { taskType: "summarization", provider: "deepseek", model: "deepseek-chat", fallback: { provider: "gemini", model: "gemini-2.0-flash" } },
  { taskType: "chat", provider: "gemini", model: "gemini-2.0-flash", fallback: { provider: "deepseek", model: "deepseek-chat" } },
]

export class AICore {
  private config: AICoreConfig
  private gemini: GeminiProvider | null = null
  private openai: OpenAIProvider | null = null
  private deepseek: DeepSeekProvider | null = null
  private local: LocalProvider | null = null
  private routes: ModelRoute[]
  private stats: UsageStats
  private callLog: Array<{ timestamp: number; provider: ProviderType; tokens: number; cost: number; latency: number }> = []
  private isRunning: boolean = true
  private isPaused: boolean = false

  constructor(config: AICoreConfig) {
    this.config = config
    this.routes = config.routes || DEFAULT_ROUTES
    this.stats = {
      totalCalls: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      callsByProvider: {} as Record<ProviderType, number>,
      callsByTask: {} as Record<TaskType, number>,
      averageLatencyMs: 0,
      errorCount: 0,
    }

     if (config.providers.gemini?.apiKey) {
      this.gemini = new GeminiProvider(config.providers.gemini.apiKey)
    }
    if (config.providers.openai?.apiKey) {
      this.openai = new OpenAIProvider(config.providers.openai.apiKey, config.providers.openai.baseUrl)
    }
    if (config.providers.deepseek?.apiKey) {
      this.deepseek = new DeepSeekProvider(config.providers.deepseek.apiKey)
    }
    // Initialize local providers (Ollama, llama.cpp, etc.)
    if (config.providers.ollama?.baseUrl) {
      this.local = new LocalProvider(
        config.providers.ollama.baseUrl,
        config.providers.ollama.model || "llama3"
      )
    }
    
    // Support multiple local endpoints
    if (config.providers.local) {
      config.providers.local.forEach((localConfig: any) => {
        // You can extend this to support multiple local providers
        if (localConfig.baseUrl) {
          this.local = new LocalProvider(
            localConfig.baseUrl,
            localConfig.model || "llama3"
          )
        }
      })
    }
  }

  async generate(
    prompt: string,
    options: GenerateOptions & { taskType?: TaskType } = {}
  ): Promise<GenerateResult> {
    const taskType = options.taskType || this.detectTaskType(prompt)
    const route = this.findRoute(taskType)

    if (!route) {
      throw new Error(`No route found for task type: ${taskType}`)
    }

    const oversightResult = await this.checkOversight({
      action: "generate",
      provider: route.provider,
      model: route.model,
      prompt,
      confidence: 1.0,
      risk: this.assessRisk(taskType),
      metadata: options.metadata,
    })

    if (!oversightResult) {
      return {
        text: "Action blocked by human oversight.",
        provider: route.provider,
        model: route.model,
        latencyMs: 0,
        flagged: true,
        flagReason: "Blocked by human oversight",
      }
    }

    if (this.config.costTracking?.enabled && this.config.costTracking.budgetLimitUsd) {
      if (this.stats.totalCostUsd >= this.config.costTracking.budgetLimitUsd) {
        throw new Error(`AI budget exceeded: $${this.stats.totalCostUsd.toFixed(2)} / $${this.config.costTracking.budgetLimitUsd.toFixed(2)}`)
      }
    }

    let result: GenerateResult | null = null
    let error: Error | null = null

    try {
      result = await this.executeProvider(route.provider, route.model, prompt, options)
    } catch (e) {
      error = e as Error
      console.warn(`Primary provider ${route.provider} failed: ${error.message}. Trying fallback...`)

      if (route.fallback) {
        try {
          result = await this.executeProvider(route.fallback.provider, route.fallback.model, prompt, options)
        } catch (fallbackError) {
          this.stats.errorCount += 2
          throw fallbackError
        }
      } else {
        this.stats.errorCount++
        throw error
      }
    }

    if (result) {
      this.updateStats(result, taskType)
    }

    return result!
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    options: GenerateOptions & { taskType?: TaskType } = {}
  ): Promise<GenerateResult> {
    const taskType = options.taskType || "chat"
    const route = this.findRoute(taskType)

    if (!route) {
      throw new Error(`No route found for task type: ${taskType}`)
    }

    let result: GenerateResult | null = null

    try {
      result = await this.executeProviderChat(route.provider, route.model, messages, options)
    } catch (e) {
      if (route.fallback) {
        result = await this.executeProviderChat(route.fallback.provider, route.fallback.model, messages, options)
      } else {
        throw e
      }
    }

    if (result) {
      this.updateStats(result, taskType)
    }

    return result!
  }

  private async executeProvider(
    provider: ProviderType,
    model: string,
    prompt: string,
    options: GenerateOptions
  ): Promise<GenerateResult> {
    switch (provider) {
      case "gemini":
        if (!this.gemini) throw new Error("Gemini provider not configured")
        return this.gemini.generate(prompt, { ...options, model })
      case "openai":
        if (!this.openai) throw new Error("OpenAI provider not configured")
        return this.openai.generate(prompt, { ...options, model })
       case "deepseek":
        if (!this.deepseek) throw new Error("DeepSeek provider not configured")
        return this.deepseek.generate(prompt, { ...options, model })
      case "ollama":
        if (!this.local) throw new Error("Local provider not configured")
        return this.local.generate(prompt, { ...options, model })
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  private async executeProviderChat(
    provider: ProviderType,
    model: string,
    messages: Array<{ role: string; content: string }>,
    options: GenerateOptions
  ): Promise<GenerateResult> {
    const formattedMessages = messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    }))

    switch (provider) {
      case "gemini":
        if (!this.gemini) throw new Error("Gemini provider not configured")
        return this.gemini.chat(formattedMessages, { ...options, model })
       case "openai":
        if (!this.openai) throw new Error("OpenAI provider not configured")
        return this.openai.chat(formattedMessages, { ...options, model })
      case "ollama":
        if (!this.local) throw new Error("Local provider not configured")
        return this.local.chat(formattedMessages, { ...options, model })
      default:
        throw new Error(`Chat not supported for provider: ${provider}`)
    }
  }

  private findRoute(taskType: TaskType): ModelRoute | null {
    return this.routes.find((r) => r.taskType === taskType) || null
  }

  private detectTaskType(prompt: string): TaskType {
    const p = prompt.toLowerCase()
    if (/\b(code|function|class|component|api|endpoint|query|schema)\b/.test(p)) return "coding"
    if (/\b(strategy|plan|analyze|forecast|budget|revenue|market)\b/.test(p)) return "business_logic"
    if (/\b(agent|autonomous|orchestrat|workflow|pipeline)\b/.test(p)) return "agent_brain"
    if (/\b(summarize|brief|overview|condense)\b/.test(p)) return "summarization"
    if (/\b(write|create|generate|story|copy|marketing)\b/.test(p)) return "creative"
    if (/\b(analyze|review|audit|evaluate|score)\b/.test(p)) return "analysis"
    return "chat"
  }

  private assessRisk(taskType: TaskType): "low" | "medium" | "high" | "critical" {
    if (taskType === "coding" || taskType === "business_logic") return "high"
    if (taskType === "agent_brain") return "medium"
    return "low"
  }

  private async checkOversight(payload: EscalationPayload): Promise<boolean> {
    const oversight = this.config.oversight
    if (!oversight) return true

    if (oversight.mode === "recovery") return false

    if (oversight.mode === "shadow") {
      if (payload.confidence >= oversight.confidenceThreshold && payload.risk !== "critical") {
        return true
      }
    }

    if (oversight.mode === "checkpoint") {
      if (oversight.onEscalate) {
        return await oversight.onEscalate(payload)
      }
    }

    return true
  }

  private updateStats(result: GenerateResult, taskType: TaskType) {
    this.stats.totalCalls++
    this.stats.totalTokens += result.tokensUsed || 0
    this.stats.totalCostUsd += result.costUsd || 0
    this.stats.callsByProvider[result.provider] = (this.stats.callsByProvider[result.provider] || 0) + 1
    this.stats.callsByTask[taskType] = (this.stats.callsByTask[taskType] || 0) + 1

    this.callLog.push({
      timestamp: Date.now(),
      provider: result.provider,
      tokens: result.tokensUsed || 0,
      cost: result.costUsd || 0,
      latency: result.latencyMs,
    })

    const totalLatency = this.callLog.reduce((sum, c) => sum + c.latency, 0)
    this.stats.averageLatencyMs = totalLatency / this.callLog.length
  }

  getStats(): UsageStats {
    return { ...this.stats }
  }

  addRoute(route: ModelRoute) {
    this.routes = this.routes.filter((r) => r.taskType !== route.taskType)
    this.routes.push(route)
  }

  setOversightMode(mode: OversightMode) {
    if (this.config.oversight) {
      this.config.oversight.mode = mode
    }
  }
  
  /**
   * Start the AI core
   */
  start(): void {
    this.isRunning = true
    this.isPaused = false
    console.log("🟢 AI Core started")
  }
  
  /**
   * Stop the AI core
   */
  stop(): void {
    this.isRunning = false
    this.isPaused = false
    console.log("🔴 AI Core stopped")
  }
  
  /**
   * Pause the AI core
   */
  pause(): void {
    this.isPaused = true
    console.log("🟠 AI Core paused")
  }
  
  /**
   * Resume the AI core
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false
      console.log("🟢 AI Core resumed")
    }
  }
  
  /**
   * Get current status
   */
  getStatus(): { 
    isRunning: boolean; 
    isPaused: boolean; 
    canGenerate: boolean 
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      canGenerate: this.isRunning && !this.isPaused,
    }
  }
  
  /**
   * Check if local model is available
   */
  async checkLocalModel(): Promise<boolean> {
    if (!this.local) return false
    return this.local.checkModelAvailability()
  }
  
  /**
   * List available local models
   */
  async listLocalModels(): Promise<string[]> {
    if (!this.local) return []
    try {
      const models = await this.local.listModels()
      return models.models.map(m => m.name)
    } catch (error) {
      return []
    }
  }
}
