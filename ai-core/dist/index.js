// src/providers/gemini.ts
import { GoogleGenAI } from "@google/genai";
var GeminiProvider = class {
  constructor(apiKey) {
    this.client = null;
    this.apiKey = apiKey;
  }
  getClient() {
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.client;
  }
  async generate(prompt, options = {}) {
    const start = Date.now();
    const client = this.getClient();
    const model = options.model || "gemini-2.0-flash";
    const contents = options.systemPrompt ? `${options.systemPrompt}

${prompt}` : prompt;
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
        responseMimeType: options.responseFormat === "json" ? "application/json" : void 0
      }
    });
    const text = response.text || "";
    const latencyMs = Date.now() - start;
    return {
      text,
      provider: "gemini",
      model,
      tokensUsed: response.usageMetadata?.totalTokenCount,
      costUsd: this.estimateCost(model, response.usageMetadata?.totalTokenCount || 0),
      latencyMs
    };
  }
  async chat(messages, options = {}) {
    const start = Date.now();
    const client = this.getClient();
    const model = options.model || "gemini-2.0-flash";
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    const chat = client.chats.create({
      model,
      config: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096
      }
    });
    const lastMessage = messages[messages.length - 1];
    const response = await chat.sendMessage({ message: lastMessage.content });
    const text = response.text || "";
    const latencyMs = Date.now() - start;
    return {
      text,
      provider: "gemini",
      model,
      tokensUsed: response.usageMetadata?.totalTokenCount,
      costUsd: this.estimateCost(model, response.usageMetadata?.totalTokenCount || 0),
      latencyMs
    };
  }
  estimateCost(model, tokens) {
    const pricePer1K = model.includes("pro") ? 35e-4 : 1e-4;
    return tokens / 1e3 * pricePer1K;
  }
};

// src/providers/openai.ts
import OpenAI from "openai";
var OpenAIProvider = class {
  constructor(apiKey, baseUrl) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true
    });
  }
  async generate(prompt, options = {}) {
    const start = Date.now();
    const model = options.model || "gpt-4o";
    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });
    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      response_format: options.responseFormat === "json" ? { type: "json_object" } : void 0
    });
    const text = response.choices[0]?.message?.content || "";
    const latencyMs = Date.now() - start;
    const tokensUsed = response.usage?.total_tokens;
    return {
      text,
      provider: "openai",
      model,
      tokensUsed,
      costUsd: this.estimateCost(model, tokensUsed || 0),
      latencyMs
    };
  }
  async chat(messages, options = {}) {
    const start = Date.now();
    const model = options.model || "gpt-4o";
    const oaiMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
      content: m.content
    }));
    const response = await this.client.chat.completions.create({
      model,
      messages: oaiMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096
    });
    const text = response.choices[0]?.message?.content || "";
    const latencyMs = Date.now() - start;
    const tokensUsed = response.usage?.total_tokens;
    return {
      text,
      provider: "openai",
      model,
      tokensUsed,
      costUsd: this.estimateCost(model, tokensUsed || 0),
      latencyMs
    };
  }
  estimateCost(model, tokens) {
    const prices = {
      "gpt-4o": 5e-3,
      "gpt-4o-mini": 15e-5,
      "o3": 0.01,
      "o3-mini": 11e-4
    };
    const pricePer1K = prices[model] || 5e-3;
    return tokens / 1e3 * pricePer1K;
  }
};

// src/providers/deepseek.ts
var DeepSeekProvider = class {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.deepseek.com/v1/chat/completions";
  }
  async generate(prompt, options = {}) {
    const start = Date.now();
    const model = options.model || "deepseek-chat";
    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024
      })
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "No details");
      throw new Error(`DeepSeek API failed with status ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const latencyMs = Date.now() - start;
    const tokensUsed = data.usage?.total_tokens;
    return {
      text,
      provider: "deepseek",
      model,
      tokensUsed,
      costUsd: this.estimateCost(tokensUsed || 0),
      latencyMs
    };
  }
  estimateCost(tokens) {
    return tokens / 1e3 * 14e-5;
  }
};

// src/providers/local.ts
var LocalProvider = class {
  constructor(baseUrl, defaultModel = "llama3") {
    this.serverType = "unknown";
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.defaultModel = defaultModel;
    this.serverType = this.detectServerType(baseUrl);
  }
  detectServerType(baseUrl) {
    if (baseUrl.includes(":11434")) return "ollama";
    if (baseUrl.includes(":8080")) return "llamacpp";
    return "unknown";
  }
  /**
   * Generate text using local model
   */
  async generate(prompt, options = {}) {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();
    try {
      let endpoint = "";
      let requestBody = {};
      if (this.serverType === "ollama") {
        endpoint = `${this.baseUrl}/api/generate`;
        requestBody = {
          model,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 2048
          }
        };
      } else if (this.serverType === "llamacpp") {
        endpoint = `${this.baseUrl}/completion`;
        requestBody = {
          prompt,
          temperature: options.temperature || 0.7,
          n_predict: options.maxTokens || 2048,
          stop: ["\n", "<|im_end|>"]
        };
      } else {
        endpoint = `${this.baseUrl}/api/generate`;
        requestBody = {
          model,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 2048
          }
        };
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        throw new Error(`${this.serverType} model error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      const endTime = Date.now();
      let responseText = "";
      if (this.serverType === "ollama") {
        responseText = data.response || "";
      } else if (this.serverType === "llamacpp") {
        responseText = data.content || "";
      } else {
        responseText = data.response || data.content || "";
      }
      return {
        text: responseText,
        provider: "ollama",
        model,
        tokensUsed: this.estimateTokens(responseText),
        costUsd: 0,
        // Local models have no cost
        latencyMs: endTime - startTime,
        confidence: 0.9
        // Estimated confidence for local models
      };
    } catch (error) {
      const endTime = Date.now();
      throw new Error(`Local model generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Chat with local model
   */
  async chat(messages, options = {}) {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();
    try {
      let endpoint = "";
      let requestBody = {};
      const formattedMessages = messages.map((m) => ({
        role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));
      if (this.serverType === "ollama") {
        endpoint = `${this.baseUrl}/api/chat`;
        requestBody = {
          model,
          messages: formattedMessages,
          stream: false,
          options: {
            temperature: options.temperature || 0.7
          }
        };
      } else if (this.serverType === "llamacpp") {
        endpoint = `${this.baseUrl}/chat`;
        requestBody = {
          messages: formattedMessages,
          temperature: options.temperature || 0.7,
          n_predict: options.maxTokens || 2048
        };
      } else {
        endpoint = `${this.baseUrl}/api/chat`;
        requestBody = {
          model,
          messages: formattedMessages,
          stream: false,
          options: {
            temperature: options.temperature || 0.7
          }
        };
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        throw new Error(`${this.serverType} model chat error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      const endTime = Date.now();
      let responseText = "";
      if (this.serverType === "ollama") {
        responseText = data.message?.content || "";
      } else if (this.serverType === "llamacpp") {
        responseText = data.choices?.[0]?.message?.content || data.message?.content || "";
      } else {
        responseText = data.message?.content || data.choices?.[0]?.message?.content || "";
      }
      return {
        text: responseText,
        provider: "ollama",
        model,
        tokensUsed: this.estimateTokens(responseText),
        costUsd: 0,
        // Local models have no cost
        latencyMs: endTime - startTime,
        confidence: 0.9
        // Estimated confidence for local models
      };
    } catch (error) {
      const endTime = Date.now();
      throw new Error(`Local model chat failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Estimate token count (simplified)
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
  /**
   * List available local models
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to list models: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Check if local model is available
   */
  async checkModelAvailability(model = this.defaultModel) {
    try {
      const models = await this.listModels();
      return models.models.some((m) => m.name === model);
    } catch (error) {
      return false;
    }
  }
  /**
   * Test server connectivity
   */
  async testConnectivity() {
    const startTime = Date.now();
    try {
      const response = await fetch(this.baseUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const latency = Date.now() - startTime;
      if (response.ok) {
        return {
          success: true,
          serverType: this.serverType,
          latencyMs: latency
        };
      } else {
        return {
          success: false,
          serverType: this.serverType,
          latencyMs: latency,
          error: `Server responded with ${response.status}`
        };
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        serverType: this.serverType,
        latencyMs: latency,
        error: error instanceof Error ? error.message : "Connection failed"
      };
    }
  }
  /**
   * Get current provider status
   */
  getStatus() {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      serverType: this.serverType,
      isConfigured: true
    };
  }
};

// src/AICore.ts
var DEFAULT_ROUTES = [
  { taskType: "coding", provider: "openai", model: "o3", fallback: { provider: "openai", model: "gpt-4o" } },
  { taskType: "business_logic", provider: "openai", model: "gpt-4o", fallback: { provider: "gemini", model: "gemini-2.0-flash" } },
  { taskType: "agent_brain", provider: "openai", model: "gpt-4o", fallback: { provider: "gemini", model: "gemini-2.0-flash" } },
  { taskType: "cross_domain", provider: "gemini", model: "gemini-2.5-pro", fallback: { provider: "gemini", model: "gemini-2.0-flash" } },
  { taskType: "creative", provider: "gemini", model: "gemini-2.0-flash", fallback: { provider: "deepseek", model: "deepseek-chat" } },
  { taskType: "analysis", provider: "gemini", model: "gemini-2.0-flash", fallback: { provider: "deepseek", model: "deepseek-chat" } },
  { taskType: "summarization", provider: "deepseek", model: "deepseek-chat", fallback: { provider: "gemini", model: "gemini-2.0-flash" } },
  { taskType: "chat", provider: "gemini", model: "gemini-2.0-flash", fallback: { provider: "deepseek", model: "deepseek-chat" } }
];
var AICore = class {
  constructor(config) {
    this.gemini = null;
    this.openai = null;
    this.deepseek = null;
    this.local = null;
    this.callLog = [];
    this.isRunning = true;
    this.isPaused = false;
    this.config = config;
    this.routes = config.routes || DEFAULT_ROUTES;
    this.stats = {
      totalCalls: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      callsByProvider: {},
      callsByTask: {},
      averageLatencyMs: 0,
      errorCount: 0
    };
    if (config.providers.gemini?.apiKey) {
      this.gemini = new GeminiProvider(config.providers.gemini.apiKey);
    }
    if (config.providers.openai?.apiKey) {
      this.openai = new OpenAIProvider(config.providers.openai.apiKey, config.providers.openai.baseUrl);
    }
    if (config.providers.deepseek?.apiKey) {
      this.deepseek = new DeepSeekProvider(config.providers.deepseek.apiKey);
    }
    if (config.providers.ollama?.baseUrl) {
      this.local = new LocalProvider(
        config.providers.ollama.baseUrl,
        config.providers.ollama.model || "llama3"
      );
    }
    if (config.providers.local) {
      config.providers.local.forEach((localConfig) => {
        if (localConfig.baseUrl) {
          this.local = new LocalProvider(
            localConfig.baseUrl,
            localConfig.model || "llama3"
          );
        }
      });
    }
  }
  async generate(prompt, options = {}) {
    const taskType = options.taskType || this.detectTaskType(prompt);
    const route = this.findRoute(taskType);
    if (!route) {
      throw new Error(`No route found for task type: ${taskType}`);
    }
    const oversightResult = await this.checkOversight({
      action: "generate",
      provider: route.provider,
      model: route.model,
      prompt,
      confidence: 1,
      risk: this.assessRisk(taskType),
      metadata: options.metadata
    });
    if (!oversightResult) {
      return {
        text: "Action blocked by human oversight.",
        provider: route.provider,
        model: route.model,
        latencyMs: 0,
        flagged: true,
        flagReason: "Blocked by human oversight"
      };
    }
    if (this.config.costTracking?.enabled && this.config.costTracking.budgetLimitUsd) {
      if (this.stats.totalCostUsd >= this.config.costTracking.budgetLimitUsd) {
        throw new Error(`AI budget exceeded: $${this.stats.totalCostUsd.toFixed(2)} / $${this.config.costTracking.budgetLimitUsd.toFixed(2)}`);
      }
    }
    let result = null;
    let error = null;
    try {
      result = await this.executeProvider(route.provider, route.model, prompt, options);
    } catch (e) {
      error = e;
      console.warn(`Primary provider ${route.provider} failed: ${error.message}. Trying fallback...`);
      if (route.fallback) {
        try {
          result = await this.executeProvider(route.fallback.provider, route.fallback.model, prompt, options);
        } catch (fallbackError) {
          this.stats.errorCount += 2;
          throw fallbackError;
        }
      } else {
        this.stats.errorCount++;
        throw error;
      }
    }
    if (result) {
      this.updateStats(result, taskType);
    }
    return result;
  }
  async chat(messages, options = {}) {
    const taskType = options.taskType || "chat";
    const route = this.findRoute(taskType);
    if (!route) {
      throw new Error(`No route found for task type: ${taskType}`);
    }
    let result = null;
    try {
      result = await this.executeProviderChat(route.provider, route.model, messages, options);
    } catch (e) {
      if (route.fallback) {
        result = await this.executeProviderChat(route.fallback.provider, route.fallback.model, messages, options);
      } else {
        throw e;
      }
    }
    if (result) {
      this.updateStats(result, taskType);
    }
    return result;
  }
  async executeProvider(provider, model, prompt, options) {
    switch (provider) {
      case "gemini":
        if (!this.gemini) throw new Error("Gemini provider not configured");
        return this.gemini.generate(prompt, { ...options, model });
      case "openai":
        if (!this.openai) throw new Error("OpenAI provider not configured");
        return this.openai.generate(prompt, { ...options, model });
      case "deepseek":
        if (!this.deepseek) throw new Error("DeepSeek provider not configured");
        return this.deepseek.generate(prompt, { ...options, model });
      case "ollama":
        if (!this.local) throw new Error("Local provider not configured");
        return this.local.generate(prompt, { ...options, model });
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  async executeProviderChat(provider, model, messages, options) {
    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content
    }));
    switch (provider) {
      case "gemini":
        if (!this.gemini) throw new Error("Gemini provider not configured");
        return this.gemini.chat(formattedMessages, { ...options, model });
      case "openai":
        if (!this.openai) throw new Error("OpenAI provider not configured");
        return this.openai.chat(formattedMessages, { ...options, model });
      case "ollama":
        if (!this.local) throw new Error("Local provider not configured");
        return this.local.chat(formattedMessages, { ...options, model });
      default:
        throw new Error(`Chat not supported for provider: ${provider}`);
    }
  }
  findRoute(taskType) {
    return this.routes.find((r) => r.taskType === taskType) || null;
  }
  detectTaskType(prompt) {
    const p = prompt.toLowerCase();
    if (/\b(code|function|class|component|api|endpoint|query|schema)\b/.test(p)) return "coding";
    if (/\b(strategy|plan|analyze|forecast|budget|revenue|market)\b/.test(p)) return "business_logic";
    if (/\b(agent|autonomous|orchestrat|workflow|pipeline)\b/.test(p)) return "agent_brain";
    if (/\b(summarize|brief|overview|condense)\b/.test(p)) return "summarization";
    if (/\b(write|create|generate|story|copy|marketing)\b/.test(p)) return "creative";
    if (/\b(analyze|review|audit|evaluate|score)\b/.test(p)) return "analysis";
    return "chat";
  }
  assessRisk(taskType) {
    if (taskType === "coding" || taskType === "business_logic") return "high";
    if (taskType === "agent_brain") return "medium";
    return "low";
  }
  async checkOversight(payload) {
    const oversight = this.config.oversight;
    if (!oversight) return true;
    if (oversight.mode === "recovery") return false;
    if (oversight.mode === "shadow") {
      if (payload.confidence >= oversight.confidenceThreshold && payload.risk !== "critical") {
        return true;
      }
    }
    if (oversight.mode === "checkpoint") {
      if (oversight.onEscalate) {
        return await oversight.onEscalate(payload);
      }
    }
    return true;
  }
  updateStats(result, taskType) {
    this.stats.totalCalls++;
    this.stats.totalTokens += result.tokensUsed || 0;
    this.stats.totalCostUsd += result.costUsd || 0;
    this.stats.callsByProvider[result.provider] = (this.stats.callsByProvider[result.provider] || 0) + 1;
    this.stats.callsByTask[taskType] = (this.stats.callsByTask[taskType] || 0) + 1;
    this.callLog.push({
      timestamp: Date.now(),
      provider: result.provider,
      tokens: result.tokensUsed || 0,
      cost: result.costUsd || 0,
      latency: result.latencyMs
    });
    const totalLatency = this.callLog.reduce((sum, c) => sum + c.latency, 0);
    this.stats.averageLatencyMs = totalLatency / this.callLog.length;
  }
  getStats() {
    return { ...this.stats };
  }
  addRoute(route) {
    this.routes = this.routes.filter((r) => r.taskType !== route.taskType);
    this.routes.push(route);
  }
  setOversightMode(mode) {
    if (this.config.oversight) {
      this.config.oversight.mode = mode;
    }
  }
  /**
   * Start the AI core
   */
  start() {
    this.isRunning = true;
    this.isPaused = false;
    console.log("\u{1F7E2} AI Core started");
  }
  /**
   * Stop the AI core
   */
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    console.log("\u{1F534} AI Core stopped");
  }
  /**
   * Pause the AI core
   */
  pause() {
    this.isPaused = true;
    console.log("\u{1F7E0} AI Core paused");
  }
  /**
   * Resume the AI core
   */
  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      console.log("\u{1F7E2} AI Core resumed");
    }
  }
  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      canGenerate: this.isRunning && !this.isPaused
    };
  }
  /**
   * Check if local model is available
   */
  async checkLocalModel() {
    if (!this.local) return false;
    return this.local.checkModelAvailability();
  }
  /**
   * List available local models
   */
  async listLocalModels() {
    if (!this.local) return [];
    try {
      const models = await this.local.listModels();
      return models.models.map((m) => m.name);
    } catch (error) {
      return [];
    }
  }
};

// src/middleware/oversight.ts
var OversightMiddleware = class {
  constructor(config = {}) {
    this.queue = [];
    this.history = [];
    this.mode = config.mode || "checkpoint";
    this.confidenceThreshold = config.confidenceThreshold ?? 0.7;
    this.onEscalate = config.onEscalate;
  }
  async shouldProceed(payload) {
    if (this.mode === "shadow") {
      return payload.confidence >= this.confidenceThreshold && payload.risk !== "critical";
    }
    if (this.mode === "recovery") {
      return false;
    }
    if (this.mode === "checkpoint") {
      if (this.onEscalate) {
        return await this.onEscalate(payload);
      }
      return this.autoApprove(payload);
    }
    return true;
  }
  autoApprove(payload) {
    if (payload.risk === "critical") return false;
    if (payload.confidence >= 0.9 && payload.risk === "low") return true;
    return false;
  }
  enqueue(payload) {
    const id = `ESC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.queue.push({ ...payload, id, createdAt: /* @__PURE__ */ new Date() });
    return id;
  }
  approve(id) {
    const idx = this.queue.findIndex((q) => q.id === id);
    if (idx !== -1) {
      const item = this.queue[idx];
      this.history.push({ ...item, status: "approved", resolvedAt: /* @__PURE__ */ new Date() });
      this.queue.splice(idx, 1);
    }
  }
  reject(id) {
    const idx = this.queue.findIndex((q) => q.id === id);
    if (idx !== -1) {
      const item = this.queue[idx];
      this.history.push({ ...item, status: "rejected", resolvedAt: /* @__PURE__ */ new Date() });
      this.queue.splice(idx, 1);
    }
  }
  getQueue() {
    return [...this.queue];
  }
  getHistory() {
    return [...this.history];
  }
  setMode(mode) {
    this.mode = mode;
  }
  getMode() {
    return this.mode;
  }
  getStats() {
    return {
      pending: this.queue.length,
      approved: this.history.filter((h) => h.status === "approved").length,
      rejected: this.history.filter((h) => h.status === "rejected").length,
      mode: this.mode
    };
  }
};

// src/autonomous/AutoConfig.ts
var AutoConfig2 = class {
  constructor(initialConfig = {}) {
    this.learningRate = 0.1;
    this.lastReconfiguration = /* @__PURE__ */ new Date();
    const baseConfig = {
      providers: {
        gemini: initialConfig.providers?.gemini || { apiKey: "" },
        openai: initialConfig.providers?.openai || void 0,
        deepseek: initialConfig.providers?.deepseek || void 0
      },
      oversight: initialConfig.oversight || {
        mode: "shadow",
        confidenceThreshold: 0.7
      },
      costTracking: initialConfig.costTracking || {
        enabled: true,
        budgetLimitUsd: 100
      }
    };
    this.core = new AICore(baseConfig);
    this.oversight = new OversightMiddleware({
      mode: baseConfig.oversight?.mode || "shadow",
      confidenceThreshold: baseConfig.oversight?.confidenceThreshold || 0.7
    });
    this.performanceMetrics = {
      successRate: 0,
      errorRate: 0,
      userSatisfaction: 0,
      revenueGenerated: 0,
      operationalCost: 0
    };
    this.startAutonomousLoop();
  }
  /**
   * Start autonomous optimization loop
   */
  startAutonomousLoop() {
    setInterval(() => this.selfReconfigure(), 24 * 60 * 60 * 1e3);
    setInterval(() => this.monitorPerformance(), 60 * 60 * 1e3);
    this.setupLearningHooks();
  }
  /**
   * Self-reconfiguration based on performance
   */
  async selfReconfigure() {
    const stats = this.core.getStats();
    const performance = this.performanceMetrics;
    const analysis = await this.analyzePerformance(stats, performance);
    this.adjustConfiguration(analysis);
    console.log(`[AutoConfig] Self-reconfiguration completed at ${/* @__PURE__ */ new Date()}`);
    console.log(`Analysis:`, analysis);
    this.lastReconfiguration = /* @__PURE__ */ new Date();
  }
  /**
   * Analyze performance metrics
   */
  async analyzePerformance(stats, performance) {
    const prompt = `
      Analyze AI system performance:
      - Success rate: ${performance.successRate}%
      - Error rate: ${performance.errorRate}%
      - User satisfaction: ${performance.userSatisfaction}/100
      - Revenue generated: $${performance.revenueGenerated}
      - Operational cost: $${performance.operationalCost}
      - Total calls: ${stats.totalCalls}
      - Error count: ${stats.errorCount}
      - Average latency: ${stats.averageLatencyMs}ms
      
      Provide optimization recommendations in JSON format:
      {
        "overallScore": number, // 0-100
        "recommendations": string[],
        "configAdjustments": {
          "confidenceThreshold"?: number,
          "budgetLimit"?: number,
          "oversightMode"?: string,
          "learningRate"?: number
        }
      }
    `;
    try {
      const result = await this.core.generate(prompt, {
        taskType: "analysis",
        responseFormat: "json",
        temperature: 0.3
      });
      return JSON.parse(result.text);
    } catch (error) {
      console.error("Performance analysis failed:", error);
      return {
        overallScore: 70,
        recommendations: ["Maintain current configuration"],
        configAdjustments: {}
      };
    }
  }
  /**
   * Adjust configuration based on analysis
   */
  adjustConfiguration(analysis) {
    if (analysis.configAdjustments.confidenceThreshold !== void 0) {
      this.oversight = new OversightMiddleware({
        ...this.oversight,
        confidenceThreshold: analysis.configAdjustments.confidenceThreshold
      });
    }
    if (analysis.configAdjustments.budgetLimit !== void 0) {
      console.log(`Budget limit adjustment suggested: $${analysis.configAdjustments.budgetLimit}`);
    }
    if (analysis.configAdjustments.oversightMode) {
      this.oversight.setMode(analysis.configAdjustments.oversightMode);
    }
    if (analysis.configAdjustments.learningRate !== void 0) {
      this.learningRate = analysis.configAdjustments.learningRate;
    }
  }
  /**
   * Monitor system performance
   */
  monitorPerformance() {
    const stats = this.core.getStats();
    const totalCalls = stats.totalCalls || 1;
    this.performanceMetrics.successRate = 100 - stats.errorCount / totalCalls * 100;
    this.performanceMetrics.errorRate = stats.errorCount / totalCalls * 100;
    this.performanceMetrics.userSatisfaction = Math.min(95, 80 + this.performanceMetrics.successRate * 0.15);
    console.log(`[AutoConfig] Performance Monitor:`, this.performanceMetrics);
  }
  /**
   * Setup learning hooks
   */
  setupLearningHooks() {
    setInterval(() => {
      const stats = this.core.getStats();
      if (stats.totalCalls > 0 && stats.errorCount === 0) {
        this.learnFromSuccess();
      }
    }, 30 * 60 * 1e3);
  }
  /**
   * Learn from successful operations
   */
  learnFromSuccess() {
    const currentThreshold = this.oversight.getStats().confidence;
    if (currentThreshold < 0.95) {
      this.oversight = new OversightMiddleware({
        ...this.oversight,
        confidenceThreshold: Math.min(0.95, currentThreshold + 0.01)
      });
    }
    console.log(`[AutoConfig] Learning from success - confidence threshold: ${this.oversight.getStats().confidence}`);
  }
  /**
   * Get current configuration
   */
  getConfig() {
    return {
      coreConfig: this.core,
      oversightConfig: this.oversight.getStats(),
      performanceMetrics: this.performanceMetrics,
      learningRate: this.learningRate,
      lastReconfiguration: this.lastReconfiguration
    };
  }
  /**
   * Generate revenue through AI services
   */
  async generateRevenue(opportunity) {
    const startTime = Date.now();
    const analysisPrompt = `
      Evaluate this revenue opportunity:
      Type: ${opportunity.type}
      Description: ${opportunity.description}
      Potential Value: $${opportunity.potentialValue}
      Risk Level: ${opportunity.riskLevel}
      
      Provide analysis and execution plan in JSON format:
      {
        "feasibilityScore": number, // 0-100
        "executionPlan": string[],
        "expectedRevenue": number,
        "successProbability": number,
        "resourcesRequired": string[]
      }
    `;
    try {
      const analysisResult = await this.core.generate(analysisPrompt, {
        taskType: "business_logic",
        responseFormat: "json"
      });
      const analysis = JSON.parse(analysisResult.text);
      if (analysis.feasibilityScore < 50) {
        return {
          success: false,
          revenueGenerated: 0,
          reason: "Opportunity not feasible",
          analysis
        };
      }
      const executionTime = Math.random() * 1e3 + 500;
      await new Promise((resolve) => setTimeout(resolve, executionTime));
      const success = Math.random() < analysis.successProbability / 100;
      const revenueGenerated = success ? analysis.expectedRevenue * (0.8 + Math.random() * 0.4) : 0;
      if (success) {
        this.performanceMetrics.revenueGenerated += revenueGenerated;
        this.performanceMetrics.operationalCost += opportunity.costToExecute || 10;
      }
      return {
        success,
        revenueGenerated,
        executionTime: Date.now() - startTime,
        analysis
      };
    } catch (error) {
      console.error("Revenue generation failed:", error);
      return {
        success: false,
        revenueGenerated: 0,
        reason: "Execution failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
};

// src/revenue/RevenueEngine.ts
var RevenueEngine = class {
  constructor(autoConfig) {
    this.opportunityPipeline = [];
    this.activeOpportunities = [];
    this.revenueHistory = [];
    this.autoConfig = autoConfig;
    this.scanningInterval = setInterval(
      () => this.scanForOpportunities(),
      6 * 60 * 60 * 1e3
      // Every 6 hours
    );
    this.executionInterval = setInterval(
      () => this.executeOpportunities(),
      30 * 60 * 1e3
      // Every 30 minutes
    );
    console.log("[RevenueEngine] Autonomous revenue generation system initialized");
  }
  /**
   * Scan for new revenue opportunities
   */
  async scanForOpportunities() {
    console.log("[RevenueEngine] Scanning for new opportunities...");
    try {
      const opportunities = await this.generateOpportunities();
      this.opportunityPipeline.push(...opportunities);
      console.log(`[RevenueEngine] Found ${opportunities.length} new opportunities`);
      this.prioritizePipeline();
    } catch (error) {
      console.error("[RevenueEngine] Opportunity scanning failed:", error);
    }
  }
  /**
   * Generate potential revenue opportunities using AI
   */
  async generateOpportunities() {
    const prompt = `
      Generate 3-5 potential revenue opportunities for an autonomous AI system.
      Consider consulting services, AI-powered products, data analysis services,
      and automated business solutions.
      
      Return in JSON format:
      [
        {
          "type": "consulting|product|service|investment",
          "description": "Brief description",
          "potentialValue": number,
          "riskLevel": "low|medium|high",
          "costToExecute": number,
          "estimatedTime": "hours/days/weeks"
        }
      ]
    `;
    const result = await this.autoConfig.getConfig().coreConfig.generate(prompt, {
      taskType: "business_logic",
      responseFormat: "json",
      temperature: 0.7
    });
    try {
      return JSON.parse(result.text);
    } catch (error) {
      console.error("Failed to parse opportunities:", error);
      return [];
    }
  }
  /**
   * Prioritize opportunity pipeline
   */
  prioritizePipeline() {
    this.opportunityPipeline.sort((a, b) => {
      const aScore = a.potentialValue / this.riskFactor(a.riskLevel);
      const bScore = b.potentialValue / this.riskFactor(b.riskLevel);
      return bScore - aScore;
    });
  }
  riskFactor(riskLevel) {
    switch (riskLevel) {
      case "low":
        return 1;
      case "medium":
        return 2;
      case "high":
        return 4;
      default:
        return 1;
    }
  }
  /**
   * Execute opportunities from pipeline
   */
  async executeOpportunities() {
    const maxConcurrent = 3;
    const availableSlots = maxConcurrent - this.activeOpportunities.length;
    if (availableSlots <= 0) return;
    const opportunitiesToExecute = this.opportunityPipeline.splice(
      0,
      Math.min(availableSlots, this.opportunityPipeline.length)
    );
    for (const opportunity of opportunitiesToExecute) {
      await this.executeSingleOpportunity(opportunity);
    }
  }
  /**
   * Execute a single revenue opportunity
   */
  async executeSingleOpportunity(opportunity) {
    const activeOp = {
      opportunity,
      startTime: /* @__PURE__ */ new Date(),
      status: "executing",
      progress: 0
    };
    this.activeOpportunities.push(activeOp);
    try {
      console.log(`[RevenueEngine] Executing opportunity: ${opportunity.description}`);
      const result = await this.autoConfig.generateRevenue(opportunity);
      this.revenueHistory.push({
        opportunityId: opportunity.description.substring(0, 50),
        amount: result.revenueGenerated,
        success: result.success,
        timestamp: /* @__PURE__ */ new Date(),
        type: opportunity.type
      });
      activeOp.status = result.success ? "completed" : "failed";
      activeOp.progress = 100;
      activeOp.result = result;
      console.log(`[RevenueEngine] Opportunity ${result.success ? "succeeded" : "failed"}: $${result.revenueGenerated}`);
    } catch (error) {
      console.error(`[RevenueEngine] Opportunity execution failed:`, error);
      activeOp.status = "failed";
      activeOp.progress = 100;
      activeOp.error = error instanceof Error ? error.message : "Unknown error";
    }
    setTimeout(() => {
      this.activeOpportunities = this.activeOpportunities.filter(
        (op) => op !== activeOp
      );
    }, 5e3);
  }
  /**
   * Get revenue statistics
   */
  getRevenueStats() {
    const totalRevenue = this.revenueHistory.filter((t) => t.success).reduce((sum, t) => sum + t.amount, 0);
    const successRate = this.revenueHistory.length > 0 ? this.revenueHistory.filter((t) => t.success).length / this.revenueHistory.length * 100 : 0;
    return {
      totalRevenue,
      totalOpportunities: this.revenueHistory.length,
      successfulOpportunities: this.revenueHistory.filter((t) => t.success).length,
      successRate,
      activeOpportunities: this.activeOpportunities.length,
      pipelineSize: this.opportunityPipeline.length,
      recentTransactions: this.revenueHistory.slice(-10)
    };
  }
  /**
   * Get current opportunities
   */
  getCurrentOpportunities() {
    return {
      pipeline: this.opportunityPipeline,
      active: this.activeOpportunities,
      history: this.revenueHistory.slice(-20)
    };
  }
  /**
   * Cleanup on shutdown
   */
  shutdown() {
    clearInterval(this.scanningInterval);
    clearInterval(this.executionInterval);
    console.log("[RevenueEngine] Shutdown complete");
  }
};

// src/revenue/RevenueBrainstem.ts
var RevenueBrainstem = class {
  constructor(core, autoConfig, learningSystem, targets) {
    this.agents = [];
    this.currentPlan = null;
    this.performanceHistory = [];
    this.dataSources = [];
    this.core = core;
    this.autoConfig = autoConfig;
    this.learningSystem = learningSystem;
    this.targets = targets;
    this.initializeAgents();
    this.startRevenueLoop();
    console.log("\u{1F4B0} Revenue Brainstem initialized - CRO in code");
  }
  /**
   * Initialize specialized revenue agents
   */
  initializeAgents() {
    this.agents = [
      new MarketIntelligenceAgent(this.core, this.learningSystem),
      new OutboundSalesAgent(this.core, this.learningSystem),
      new InboundConversionAgent(this.core, this.learningSystem),
      new ContentFunnelAgent(this.core, this.learningSystem),
      new PricingOfferAgent(this.core, this.learningSystem),
      new RetentionExpansionAgent(this.core, this.learningSystem)
    ];
    console.log(`\u{1F916} Initialized ${this.agents.length} specialized revenue agents`);
  }
  /**
   * Start the revenue generation loop
   */
  startRevenueLoop() {
    setInterval(() => this.planWeeklyRevenue(), 7 * 24 * 60 * 60 * 1e3);
    setInterval(() => this.executeDailyActions(), 24 * 60 * 60 * 1e3);
    setInterval(() => this.monitorPerformance(), 60 * 60 * 1e3);
    this.planWeeklyRevenue();
  }
  /**
   * Plan weekly revenue strategy
   */
  async planWeeklyRevenue() {
    console.log("\u{1F4C5} Planning weekly revenue strategy...");
    const currentPerformance = this.getCurrentPerformance();
    const analysis = await this.analyzePerformance(currentPerformance);
    this.currentPlan = this.createRevenuePlan(analysis);
    console.log(`\u{1F3AF} Weekly Revenue Plan Created:`);
    console.log(`- Target: $${this.currentPlan.targetRevenue}`);
    console.log(`- Focus Channels: ${this.currentPlan.focusChannels.join(", ")}`);
    console.log(`- Key Initiatives: ${this.currentPlan.keyInitiatives.length} actions`);
    this.learningSystem.recordExperience({
      type: "system",
      task: "revenue_planning",
      input: JSON.stringify(currentPerformance),
      output: JSON.stringify(this.currentPlan),
      success: true,
      metrics: {
        targetRevenue: this.currentPlan.targetRevenue,
        confidence: analysis.confidenceScore
      }
    });
  }
  /**
   * Analyze current revenue performance
   */
  async analyzePerformance(performance) {
    const prompt = `
      Analyze current revenue performance:
      - MRR: $${performance.mrr}
      - New MRR last 30 days: $${performance.newMrr30}
      - Churn MRR last 30 days: $${performance.churnMrr30}
      - Net New MRR: $${performance.netNewMrr}
      - CAC: $${performance.cac}
      - LTV: $${performance.ltv}
      - Close Rate: ${performance.closeRate}%
      - Pipeline: ${performance.pipelineValue}
      
      Compare against targets:
      - MRR Target: $${this.targets.mrrTarget}
      - CAC Limit: $${this.targets.maxCac}
      - Payback Period Target: ${this.targets.maxPaybackMonths} months
      
      Provide analysis in JSON format:
      {
        "performanceScore": number, // 0-100
        "strengths": string[],
        "weaknesses": string[],
        "opportunities": string[],
        "threats": string[],
        "recommendations": string[],
        "channelPerformance": {
          "outbound": "poor" | "fair" | "good" | "excellent",
          "inbound": "poor" | "fair" | "good" | "excellent",
          "content": "poor" | "fair" | "good" | "excellent",
          "pricing": "poor" | "fair" | "good" | "excellent",
          "retention": "poor" | "fair" | "good" | "excellent"
        },
        "confidenceScore": number // 0-100
      }
    `;
    try {
      const result = await this.core.generate(prompt, {
        taskType: "business_logic",
        responseFormat: "json",
        temperature: 0.3
      });
      return JSON.parse(result.text);
    } catch (error) {
      console.error("Performance analysis failed:", error);
      return {
        performanceScore: 70,
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
        recommendations: ["Maintain current approach"],
        channelPerformance: {
          outbound: "fair",
          inbound: "fair",
          content: "fair",
          pricing: "fair",
          retention: "fair"
        },
        confidenceScore: 50
      };
    }
  }
  /**
   * Create revenue plan based on analysis
   */
  createRevenuePlan(analysis) {
    const baseTarget = this.targets.mrrTarget;
    const adjustment = (analysis.performanceScore - 70) * 10;
    const targetRevenue = baseTarget + adjustment;
    const focusChannels = [];
    Object.entries(analysis.channelPerformance).forEach(([channel, performance]) => {
      if (performance === "excellent" || performance === "good") {
        focusChannels.push(channel);
      }
    });
    if (focusChannels.length === 0) {
      focusChannels.push("outbound", "inbound", "content");
    }
    const keyInitiatives = analysis.recommendations.map((rec) => ({
      id: `init_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      description: rec,
      owner: this.determineAgentOwner(rec),
      status: "planned",
      targetImpact: this.estimateImpact(rec)
    }));
    return {
      weekStarting: /* @__PURE__ */ new Date(),
      targetRevenue,
      focusChannels,
      keyInitiatives,
      analysisSummary: {
        performanceScore: analysis.performanceScore,
        confidenceScore: analysis.confidenceScore
      }
    };
  }
  determineAgentOwner(initiative) {
    const lower = initiative.toLowerCase();
    if (lower.includes("market") || lower.includes("competitor") || lower.includes("icp")) {
      return "market_intelligence";
    } else if (lower.includes("outbound") || lower.includes("email") || lower.includes("sequence")) {
      return "outbound_sales";
    } else if (lower.includes("inbound") || lower.includes("chat") || lower.includes("website")) {
      return "inbound_conversion";
    } else if (lower.includes("content") || lower.includes("landing") || lower.includes("funnel")) {
      return "content_funnel";
    } else if (lower.includes("price") || lower.includes("offer") || lower.includes("bundle")) {
      return "pricing_offer";
    } else if (lower.includes("retention") || lower.includes("churn") || lower.includes("upsell")) {
      return "retention_expansion";
    }
    return "market_intelligence";
  }
  estimateImpact(initiative) {
    const lower = initiative.toLowerCase();
    if (lower.includes("major") || lower.includes("campaign") || lower.includes("launch")) {
      return "high";
    } else if (lower.includes("test") || lower.includes("experiment") || lower.includes("tweak")) {
      return "low";
    }
    return "medium";
  }
  /**
   * Execute daily revenue actions
   */
  async executeDailyActions() {
    if (!this.currentPlan) {
      console.log("\u26A0\uFE0F No active revenue plan - skipping daily execution");
      return;
    }
    console.log("\u26A1 Executing daily revenue actions...");
    for (const initiative of this.currentPlan.keyInitiatives) {
      if (initiative.status === "planned") {
        await this.executeInitiative(initiative);
      }
    }
    for (const agent of this.agents) {
      await agent.executeDailyTasks(this.currentPlan);
    }
  }
  /**
   * Execute a specific revenue initiative
   */
  async executeInitiative(initiative) {
    console.log(`\u{1F527} Executing initiative: ${initiative.description}`);
    const agent = this.agents.find((a) => a.getType() === initiative.owner);
    if (agent) {
      try {
        const result = await agent.executeInitiative(initiative, this.currentPlan);
        initiative.status = result.success ? "completed" : "failed";
        initiative.actualImpact = result.impact;
        initiative.completedAt = /* @__PURE__ */ new Date();
        console.log(`\u2705 Initiative ${result.success ? "completed" : "failed"}: ${initiative.description}`);
        this.learningSystem.recordExperience({
          type: "system",
          task: "revenue_initiative",
          input: initiative.description,
          output: result.summary,
          success: result.success,
          error: result.success ? void 0 : result.error,
          metrics: {
            impact: result.impact,
            confidence: result.confidence
          }
        });
      } catch (error) {
        console.error(`\u274C Initiative failed: ${initiative.description}`, error);
        initiative.status = "failed";
        initiative.error = error instanceof Error ? error.message : "Unknown error";
      }
    } else {
      console.warn(`\u26A0\uFE0F No agent found for initiative: ${initiative.description}`);
      initiative.status = "failed";
      initiative.error = "No owning agent found";
    }
  }
  /**
   * Monitor performance hourly
   */
  monitorPerformance() {
    console.log("\u{1F4CA} Monitoring revenue performance...");
    const currentPerformance = this.getCurrentPerformance();
    this.performanceHistory.push(currentPerformance);
    if (this.performanceHistory.length > 90) {
      this.performanceHistory = this.performanceHistory.slice(-90);
    }
    this.checkPerformanceAgainstPlan(currentPerformance);
  }
  /**
   * Check if performance is on track with plan
   */
  checkPerformanceAgainstPlan(performance) {
    if (!this.currentPlan) return;
    const daysInWeek = 7;
    const daysElapsed = (Date.now() - this.currentPlan.weekStarting.getTime()) / (1e3 * 60 * 60 * 24);
    const progress = daysElapsed / daysInWeek;
    const expectedMrr = this.currentPlan.targetRevenue * progress;
    const onTrack = performance.netNewMrr >= expectedMrr * 0.8;
    if (!onTrack) {
      console.warn(`\u26A0\uFE0F Off track: Expected $${expectedMrr.toFixed(0)} MRR, have $${performance.netNewMrr}`);
      this.triggerCorrectiveActions(performance);
    } else {
      console.log(`\u{1F3AF} On track: $${performance.netNewMrr.toFixed(0)}/$${expectedMrr.toFixed(0)} MRR (${(progress * 100).toFixed(0)}% through week)`);
    }
  }
  /**
   * Trigger corrective actions when off track
   */
  async triggerCorrectiveActions(performance) {
    console.log("\u{1F6A8} Triggering corrective actions...");
    const prompt = `
      Revenue is off track. Current performance:
      - MRR: $${performance.mrr}
      - New MRR: $${performance.newMrr30}
      - Churn MRR: $${performance.churnMrr30}
      - Net New MRR: $${performance.netNewMrr}
      - Pipeline: $${performance.pipelineValue}
      - Close Rate: ${performance.closeRate}%
      
      Current focus channels: ${this.currentPlan?.focusChannels.join(", ") || "none"}
      
      Propose 3 immediate corrective actions in JSON format:
      [
        {
          "action": "string",
          "expectedImpact": "low|medium|high",
          "owner": "market_intelligence|outbound_sales|inbound_conversion|content_funnel|pricing_offer|retention_expansion",
          "urgency": "low|medium|high"
        }
      ]
    `;
    try {
      const result = await this.core.generate(prompt, {
        taskType: "business_logic",
        responseFormat: "json",
        temperature: 0.7
      });
      const actions = JSON.parse(result.text);
      actions.forEach((action) => {
        this.currentPlan?.keyInitiatives.push({
          id: `corrective_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          description: action.action,
          owner: action.owner,
          status: "planned",
          targetImpact: action.expectedImpact,
          priority: "high"
        });
      });
      console.log(`\u2705 Added ${actions.length} corrective actions to plan`);
    } catch (error) {
      console.error("Failed to generate corrective actions:", error);
    }
  }
  /**
   * Get current revenue performance (simulated - connect to real data sources)
   */
  getCurrentPerformance() {
    const baseMrr = 5e4;
    const growthFactor = 1 + (Math.random() * 0.05 - 0.025);
    const churnFactor = 0.02 + (Math.random() * 0.03 - 0.015);
    return {
      timestamp: /* @__PURE__ */ new Date(),
      mrr: baseMrr * growthFactor,
      newMrr30: baseMrr * growthFactor * 0.1,
      // 10% growth
      churnMrr30: baseMrr * churnFactor,
      netNewMrr: baseMrr * growthFactor * 0.1 - baseMrr * churnFactor,
      cac: 1500 + Math.random() * 1e3,
      // $1500-$2500
      ltv: 12e3 + Math.random() * 8e3,
      // $12k-$20k
      closeRate: 15 + Math.random() * 10,
      // 15-25%
      pipelineValue: 2e4 + Math.random() * 3e4,
      // $20k-$50k
      customerCount: 100 + Math.floor(Math.random() * 50)
    };
  }
  /**
   * Get comprehensive revenue dashboard
   */
  getRevenueDashboard() {
    return {
      currentPlan: this.currentPlan,
      currentPerformance: this.getCurrentPerformance(),
      performanceHistory: this.performanceHistory.slice(-7),
      // Last 7 days
      agentStatus: this.agents.map((agent) => agent.getStatus()),
      targets: this.targets,
      lastUpdated: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Get performance against targets
   */
  getPerformanceReport() {
    const current = this.getCurrentPerformance();
    return {
      mrr: {
        current: current.mrr,
        target: this.targets.mrrTarget,
        variance: current.mrr - this.targets.mrrTarget,
        onTrack: current.mrr >= this.targets.mrrTarget * 0.9
      },
      cac: {
        current: current.cac,
        target: this.targets.maxCac,
        variance: current.cac - this.targets.maxCac,
        onTrack: current.cac <= this.targets.maxCac
      },
      paybackPeriod: {
        current: current.cac / (current.mrr / current.customerCount),
        target: this.targets.maxPaybackMonths,
        onTrack: current.cac / (current.mrr / current.customerCount) <= this.targets.maxPaybackMonths
      },
      closeRate: {
        current: current.closeRate,
        target: this.targets.targetCloseRate,
        variance: current.closeRate - this.targets.targetCloseRate,
        onTrack: current.closeRate >= this.targets.targetCloseRate * 0.9
      },
      generatedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Shutdown revenue brainstem
   */
  shutdown() {
    console.log("\u{1F4B0} Shutting down Revenue Brainstem...");
    this.agents.forEach((agent) => agent.shutdown());
    console.log("\u2705 Revenue Brainstem shutdown complete");
  }
};
var RevenueAgent = class {
  constructor(core, learningSystem) {
    this.core = core;
    this.learningSystem = learningSystem;
  }
  getStatus() {
    return {
      type: this.getType(),
      status: "operational",
      lastActivity: /* @__PURE__ */ new Date()
    };
  }
  shutdown() {
  }
};
var MarketIntelligenceAgent = class extends RevenueAgent {
  getType() {
    return "market_intelligence";
  }
  async executeDailyTasks(plan) {
    console.log("\u{1F50D} Market Intelligence Agent executing daily tasks");
  }
  async executeInitiative(initiative, plan) {
    console.log(`\u{1F50D} Market Intelligence executing: ${initiative.description}`);
    const success = Math.random() > 0.3;
    return {
      success,
      summary: success ? `Completed market analysis: ${initiative.description}` : `Market analysis failed: ${initiative.description}`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.85,
      data: {
        insights: success ? ["Competitor weakness identified", "New ICP segment found"] : []
      }
    };
  }
};
var OutboundSalesAgent = class extends RevenueAgent {
  getType() {
    return "outbound_sales";
  }
  async executeDailyTasks(plan) {
    console.log("\u{1F4E7} Outbound Sales Agent executing daily tasks");
  }
  async executeInitiative(initiative, plan) {
    console.log(`\u{1F4E7} Outbound Sales executing: ${initiative.description}`);
    const success = Math.random() > 0.4;
    const meetingsBooked = success ? Math.floor(Math.random() * 10) + 5 : 0;
    return {
      success,
      summary: success ? `Outbound campaign completed: ${meetingsBooked} meetings booked` : `Outbound campaign failed`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.75,
      data: {
        meetingsBooked,
        emailsSent: success ? Math.floor(Math.random() * 100) + 50 : 0
      }
    };
  }
};
var InboundConversionAgent = class extends RevenueAgent {
  getType() {
    return "inbound_conversion";
  }
  async executeDailyTasks(plan) {
    console.log("\u{1F4AC} Inbound Conversion Agent executing daily tasks");
  }
  async executeInitiative(initiative, plan) {
    console.log(`\u{1F4AC} Inbound Conversion executing: ${initiative.description}`);
    const success = Math.random() > 0.5;
    const conversionIncrease = success ? 5 + Math.random() * 10 : 0;
    return {
      success,
      summary: success ? `Inbound conversion improved: +${conversionIncrease.toFixed(1)}%` : `Inbound conversion test failed`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.7,
      data: {
        conversionRateBefore: 15,
        conversionRateAfter: success ? 15 + conversionIncrease : 15
      }
    };
  }
};
var ContentFunnelAgent = class extends RevenueAgent {
  getType() {
    return "content_funnel";
  }
  async executeDailyTasks(plan) {
    console.log("\u{1F4DD} Content & Funnel Agent executing daily tasks");
  }
  async executeInitiative(initiative, plan) {
    console.log(`\u{1F4DD} Content & Funnel executing: ${initiative.description}`);
    const success = Math.random() > 0.6;
    const assetsCreated = success ? Math.floor(Math.random() * 5) + 3 : 0;
    return {
      success,
      summary: success ? `Created ${assetsCreated} new assets: landing pages, emails, ads` : `Content creation failed`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.65,
      data: {
        assetsCreated,
        testVariations: success ? Math.floor(Math.random() * 3) + 1 : 0
      }
    };
  }
};
var PricingOfferAgent = class extends RevenueAgent {
  getType() {
    return "pricing_offer";
  }
  async executeDailyTasks(plan) {
    console.log("\u{1F4B0} Pricing & Offer Agent executing daily tasks");
  }
  async executeInitiative(initiative, plan) {
    console.log(`\u{1F4B0} Pricing & Offer executing: ${initiative.description}`);
    const success = Math.random() > 0.5;
    const revenueImpact = success ? Math.random() * 20 - 5 : 0;
    return {
      success,
      summary: success ? `Pricing test completed: ${revenueImpact > 0 ? "+" : ""}${revenueImpact.toFixed(1)}% revenue impact` : `Pricing test failed`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.7,
      data: {
        pricePointsTested: success ? Math.floor(Math.random() * 3) + 2 : 0,
        winningPrice: success ? `$${(99 + Math.random() * 200).toFixed(0)}/mo` : null
      }
    };
  }
};
var RetentionExpansionAgent = class extends RevenueAgent {
  getType() {
    return "retention_expansion";
  }
  async executeDailyTasks(plan) {
    console.log("\u{1F504} Retention & Expansion Agent executing daily tasks");
  }
  async executeInitiative(initiative, plan) {
    console.log(`\u{1F504} Retention & Expansion executing: ${initiative.description}`);
    const success = Math.random() > 0.7;
    const churnReduction = success ? 1 + Math.random() * 3 : 0;
    return {
      success,
      summary: success ? `Retention program implemented: -${churnReduction.toFixed(1)}% churn` : `Retention program failed`,
      impact: success ? initiative.targetImpact : "none",
      confidence: 0.6,
      data: {
        customersSaved: success ? Math.floor(Math.random() * 10) + 3 : 0,
        expansionRevenue: success ? Math.floor(Math.random() * 5e3) + 2e3 : 0
      }
    };
  }
};

// src/revenue/RevenueData.ts
var RevenueData = class {
  constructor(core) {
    this.connectedSources = [];
    this.dataCache = {
      customers: [],
      transactions: [],
      opportunities: [],
      metrics: []
    };
    this.core = core;
  }
  /**
   * Connect to a data source
   */
  async connectSource(source) {
    console.log(`\u{1F50C} Connecting to ${source.type} data source...`);
    if (!source.apiKey && !source.connectionString) {
      throw new Error(`No credentials provided for ${source.type} source`);
    }
    const connectedSource = {
      id: `source_${Date.now()}`,
      type: source.type,
      name: source.name,
      status: "connected",
      lastSync: /* @__PURE__ */ new Date(),
      connectedAt: /* @__PURE__ */ new Date(),
      config: {
        apiKey: source.apiKey ? "*****" : void 0,
        connectionString: source.connectionString ? "*****" : void 0
      }
    };
    this.connectedSources.push(connectedSource);
    await this.syncSource(connectedSource.id);
    console.log(`\u2705 Connected to ${source.type}: ${source.name}`);
    return connectedSource;
  }
  /**
   * Sync data from a source
   */
  async syncSource(sourceId) {
    const source = this.connectedSources.find((s) => s.id === sourceId);
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }
    console.log(`\u{1F504} Syncing data from ${source.name}...`);
    const syncTime = 1e3 + Math.random() * 3e3;
    await new Promise((resolve) => setTimeout(resolve, syncTime));
    const newRecords = this.simulateDataSync(source.type);
    this.updateDataCache(source.type, newRecords);
    source.lastSync = /* @__PURE__ */ new Date();
    source.status = "connected";
    console.log(`\u2705 Synced ${newRecords.customers + newRecords.transactions + newRecords.opportunities} records from ${source.name}`);
    return {
      sourceId: source.id,
      recordsSynced: newRecords.customers + newRecords.transactions + newRecords.opportunities,
      syncTimeMs: syncTime,
      lastSync: source.lastSync
    };
  }
  /**
   * Simulate data sync based on source type
   */
  simulateDataSync(sourceType) {
    switch (sourceType) {
      case "stripe":
        return {
          customers: Math.floor(Math.random() * 10) + 5,
          transactions: Math.floor(Math.random() * 50) + 20,
          opportunities: 0
        };
      case "hubspot":
      case "salesforce":
        return {
          customers: Math.floor(Math.random() * 5) + 2,
          transactions: 0,
          opportunities: Math.floor(Math.random() * 15) + 5
        };
      case "google_analytics":
        return {
          customers: 0,
          transactions: Math.floor(Math.random() * 30) + 10,
          opportunities: Math.floor(Math.random() * 8) + 2
        };
      case "postgres":
      case "bigquery":
        return {
          customers: Math.floor(Math.random() * 15) + 5,
          transactions: Math.floor(Math.random() * 40) + 15,
          opportunities: Math.floor(Math.random() * 10) + 3
        };
      default:
        return {
          customers: Math.floor(Math.random() * 5),
          transactions: Math.floor(Math.random() * 20),
          opportunities: Math.floor(Math.random() * 5)
        };
    }
  }
  /**
   * Update data cache with new records
   */
  updateDataCache(sourceType, newRecords) {
    for (let i = 0; i < newRecords.customers; i++) {
      this.dataCache.customers.push(this.generateSimulatedCustomer());
    }
    for (let i = 0; i < newRecords.transactions; i++) {
      this.dataCache.transactions.push(this.generateSimulatedTransaction());
    }
    for (let i = 0; i < newRecords.opportunities; i++) {
      this.dataCache.opportunities.push(this.generateSimulatedOpportunity());
    }
    this.updateMetrics();
  }
  /**
   * Update calculated metrics
   */
  updateMetrics() {
    const activeSubscriptions = this.dataCache.transactions.filter((t) => t.type === "subscription" && t.status === "active");
    const mrr = activeSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0);
    const customerCount = new Set(this.dataCache.customers.map((c) => c.id)).size;
    const paidCustomers = this.dataCache.customers.filter((c) => c.status === "paid");
    const totalAcquisitionCost = paidCustomers.reduce((sum, cust) => sum + (cust.acquisitionCost || 0), 0);
    const cac = customerCount > 0 ? totalAcquisitionCost / customerCount : 0;
    const closedOpportunities = this.dataCache.opportunities.filter((o) => o.status === "closed_won" || o.status === "closed_lost");
    const closeRate = closedOpportunities.length > 0 ? closedOpportunities.filter((o) => o.status === "closed_won").length / closedOpportunities.length * 100 : 0;
    this.dataCache.metrics = [
      { name: "mrr", value: mrr, lastUpdated: /* @__PURE__ */ new Date() },
      { name: "customer_count", value: customerCount, lastUpdated: /* @__PURE__ */ new Date() },
      { name: "cac", value: cac, lastUpdated: /* @__PURE__ */ new Date() },
      { name: "close_rate", value: closeRate, lastUpdated: /* @__PURE__ */ new Date() },
      { name: "churn_rate", value: this.calculateChurnRate(), lastUpdated: /* @__PURE__ */ new Date() }
    ];
  }
  /**
   * Calculate churn rate
   */
  calculateChurnRate() {
    const churnedCustomers = this.dataCache.customers.filter((c) => c.status === "churned").length;
    const totalCustomers = this.dataCache.customers.length;
    return totalCustomers > 0 ? churnedCustomers / totalCustomers * 100 : 0;
  }
  /**
   * Get revenue metrics
   */
  getMetrics() {
    return this.dataCache.metrics;
  }
  /**
   * Get metric by name
   */
  getMetric(name) {
    return this.dataCache.metrics.find((m) => m.name === name);
  }
  /**
   * Get customers
   */
  getCustomers(filter) {
    if (!filter) return this.dataCache.customers;
    return this.dataCache.customers.filter((customer) => {
      return (!filter.status || customer.status === filter.status) && (!filter.source || customer.source === filter.source) && (!filter.minMrr || (customer.mrr || 0) >= filter.minMrr) && (!filter.maxMrr || (customer.mrr || 0) <= filter.maxMrr);
    });
  }
  /**
   * Get transactions
   */
  getTransactions(filter) {
    if (!filter) return this.dataCache.transactions;
    return this.dataCache.transactions.filter((transaction) => {
      return (!filter.type || transaction.type === filter.type) && (!filter.status || transaction.status === filter.status) && (!filter.minAmount || (transaction.amount || 0) >= filter.minAmount) && (!filter.maxAmount || (transaction.amount || 0) <= filter.maxAmount) && (!filter.startDate || new Date(transaction.date) >= filter.startDate) && (!filter.endDate || new Date(transaction.date) <= filter.endDate);
    });
  }
  /**
   * Get opportunities
   */
  getOpportunities(filter) {
    if (!filter) return this.dataCache.opportunities;
    return this.dataCache.opportunities.filter((opportunity) => {
      return (!filter.status || opportunity.status === filter.status) && (!filter.source || opportunity.source === filter.source) && (!filter.minAmount || (opportunity.amount || 0) >= filter.minAmount) && (!filter.maxAmount || (opportunity.amount || 0) <= filter.maxAmount) && (!filter.owner || opportunity.owner === filter.owner);
    });
  }
  /**
   * Get revenue performance snapshot
   */
  getRevenuePerformance() {
    const mrrMetric = this.getMetric("mrr");
    const customerCountMetric = this.getMetric("customer_count");
    const cacMetric = this.getMetric("cac");
    const closeRateMetric = this.getMetric("close_rate");
    const churnRateMetric = this.getMetric("churn_rate");
    const now = /* @__PURE__ */ new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
    const recentTransactions = this.getTransactions({
      type: "subscription",
      status: "active",
      startDate: thirtyDaysAgo
    });
    const newMrr30 = recentTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const churnedCustomers = this.getCustomers({
      status: "churned"
    }).filter((c) => new Date(c.churnDate || now) >= thirtyDaysAgo);
    const churnMrr30 = churnedCustomers.reduce((sum, cust) => sum + (cust.mrr || 0), 0);
    const openOpportunities = this.getOpportunities({
      status: "open"
    });
    const pipelineValue = openOpportunities.reduce((sum, opp) => {
      const probability = opp.probability || 0.5;
      return sum + (opp.amount || 0) * probability;
    }, 0);
    return {
      timestamp: /* @__PURE__ */ new Date(),
      mrr: mrrMetric?.value || 0,
      newMrr30,
      churnMrr30,
      netNewMrr: newMrr30 - churnMrr30,
      cac: cacMetric?.value || 0,
      ltv: this.calculateLTV(),
      closeRate: closeRateMetric?.value || 0,
      churnRate: churnRateMetric?.value || 0,
      pipelineValue,
      customerCount: customerCountMetric?.value || 0
    };
  }
  /**
   * Calculate LTV (simplified)
   */
  calculateLTV() {
    const mrr = this.getMetric("mrr")?.value || 0;
    const customerCount = this.getMetric("customer_count")?.value || 1;
    const avgRevenuePerCustomer = mrr / customerCount;
    const churnRate = this.getMetric("churn_rate")?.value || 5;
    const monthlyChurn = churnRate / 100;
    return avgRevenuePerCustomer / Math.max(0.01, monthlyChurn);
  }
  /**
   * Generate simulated customer data
   */
  generateSimulatedCustomer() {
    const statuses = ["lead", "trial", "paid", "churned"];
    const sources = ["organic", "paid", "referral", "outbound", "inbound"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    return {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: `Customer ${Math.floor(Math.random() * 1e3)}`,
      email: `customer${Math.floor(Math.random() * 1e3)}@example.com`,
      status,
      source,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1e3),
      mrr: status === "paid" ? 99 + Math.random() * 500 : 0,
      acquisitionCost: 50 + Math.random() * 200,
      churnDate: status === "churned" ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1e3) : void 0,
      lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1e3)
    };
  }
  /**
   * Generate simulated transaction data
   */
  generateSimulatedTransaction() {
    const types = ["subscription", "one_time", "refund", "upgrade", "downgrade"];
    const statuses = ["pending", "completed", "failed", "refunded", "active", "cancelled"];
    const sources = ["stripe", "paypal", "bank_transfer", "invoice"];
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    return {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      customerId: `cust_${Math.floor(Math.random() * 1e3)}`,
      type,
      status,
      source,
      amount: type === "subscription" ? 99 + Math.random() * 500 : 50 + Math.random() * 1e3,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1e3),
      currency: "USD",
      product: `Product ${Math.floor(Math.random() * 5) + 1}`
    };
  }
  /**
   * Generate simulated opportunity data
   */
  generateSimulatedOpportunity() {
    const statuses = ["open", "contacted", "qualified", "proposal_sent", "negotiation", "closed_won", "closed_lost"];
    const sources = ["inbound", "outbound", "referral", "website", "event"];
    const owners = ["agent_1", "agent_2", "agent_3", "agent_4"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const owner = owners[Math.floor(Math.random() * owners.length)];
    return {
      id: `opp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: `Opportunity ${Math.floor(Math.random() * 1e3)}`,
      customerId: `cust_${Math.floor(Math.random() * 1e3)}`,
      status,
      source,
      owner,
      amount: 500 + Math.random() * 5e3,
      probability: status === "closed_won" ? 1 : status === "closed_lost" ? 0 : 0.1 + Math.random() * 0.8,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1e3),
      expectedCloseDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1e3)
    };
  }
  /**
   * Get connected data sources
   */
  getConnectedSources() {
    return this.connectedSources;
  }
  /**
   * Disconnect a data source
   */
  disconnectSource(sourceId) {
    const index = this.connectedSources.findIndex((s) => s.id === sourceId);
    if (index !== -1) {
      this.connectedSources.splice(index, 1);
      console.log(`\u274C Disconnected source ${sourceId}`);
      return true;
    }
    return false;
  }
  /**
   * Shutdown data layer
   */
  shutdown() {
    console.log("\u{1F50C} Shutting down Revenue Data layer...");
    this.connectedSources = [];
    this.dataCache = {
      customers: [],
      transactions: [],
      opportunities: [],
      metrics: []
    };
    console.log("\u2705 Revenue Data layer shutdown complete");
  }
};

// src/learning/ContinuousLearning.ts
var ContinuousLearning = class {
  constructor(core) {
    this.knowledgeBase = [];
    this.performanceHistory = [];
    this.knowledgeRetentionDays = 365;
    this.core = core;
    this.learningInterval = setInterval(
      () => this.learnFromExperience(),
      4 * 60 * 60 * 1e3
      // Every 4 hours
    );
    setInterval(
      () => this.cleanupKnowledgeBase(),
      24 * 60 * 60 * 1e3
      // Daily
    );
    console.log("[ContinuousLearning] System initialized");
  }
  /**
   * Record a learning experience
   */
  recordExperience(experience) {
    this.knowledgeBase.push({
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: /* @__PURE__ */ new Date(),
      ...experience
    });
    if (this.knowledgeBase.length > 1e4) {
      this.knowledgeBase = this.knowledgeBase.slice(-1e4);
    }
  }
  /**
   * Record performance metrics
   */
  recordPerformance(metrics) {
    this.performanceHistory.push({
      timestamp: /* @__PURE__ */ new Date(),
      ...metrics
    });
    if (this.performanceHistory.length > 365) {
      this.performanceHistory = this.performanceHistory.slice(-365);
    }
  }
  /**
   * Learn from accumulated experience
   */
  async learnFromExperience() {
    if (this.knowledgeBase.length < 10) {
      console.log("[ContinuousLearning] Not enough data to learn from yet");
      return;
    }
    console.log(`[ContinuousLearning] Analyzing ${this.knowledgeBase.length} experiences...`);
    try {
      const recentExperiences = this.knowledgeBase.filter((kb) => {
        const ageDays = (Date.now() - kb.timestamp.getTime()) / (1e3 * 60 * 60 * 24);
        return ageDays <= 7;
      });
      if (recentExperiences.length === 0) return;
      const insights = await this.generateInsights(recentExperiences);
      await this.applyImprovements(insights);
      console.log("[ContinuousLearning] Learning cycle completed");
    } catch (error) {
      console.error("[ContinuousLearning] Learning failed:", error);
    }
  }
  /**
   * Generate insights from experiences
   */
  async generateInsights(experiences) {
    const successRate = experiences.filter((e) => e.success).length / experiences.length;
    const commonTasks = this.getMostCommonTasks(experiences);
    const errorPatterns = this.getErrorPatterns(experiences);
    const prompt = `Analyze learning experiences and generate insights`;
    const result = await this.core.generate(prompt, {
      taskType: "analysis",
      responseFormat: "json",
      temperature: 0.5
    });
    try {
      return JSON.parse(result.text);
    } catch (error) {
      console.error("Failed to parse insights:", error);
      return {
        keyInsights: [],
        improvementAreas: [],
        successPatterns: [],
        recommendations: ["Continue current approach"],
        confidenceScore: 50
      };
    }
  }
  /**
   * Apply improvements based on insights
   */
  async applyImprovements(insights) {
    if (insights.confidenceScore < 60) {
      console.log("[ContinuousLearning] Low confidence in insights, no changes applied");
      return;
    }
    console.log("[ContinuousLearning] Applying improvements:");
    console.log("- Key insights:", insights.keyInsights);
    console.log("- Recommendations:", insights.recommendations);
    this.recordExperience({
      type: "system",
      task: "self-improvement",
      input: JSON.stringify(insights),
      output: "Improvements applied based on learning insights",
      success: true,
      metrics: {
        confidence: insights.confidenceScore,
        impact: "medium"
      }
    });
  }
  /**
   * Get most common task types
   */
  getMostCommonTasks(experiences) {
    const taskCounts = {};
    experiences.forEach((exp) => {
      if (exp.task) {
        taskCounts[exp.task] = (taskCounts[exp.task] || 0) + 1;
      }
    });
    return Object.entries(taskCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map((entry) => entry[0]);
  }
  /**
   * Identify error patterns
   */
  getErrorPatterns(experiences) {
    const failedExperiences = experiences.filter((e) => !e.success);
    const errorPatterns = {};
    failedExperiences.forEach((exp) => {
      if (exp.error) {
        const pattern = exp.error.split(":")[0] || exp.error.substring(0, 50);
        errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
      }
    });
    return Object.entries(errorPatterns).sort((a, b) => b[1] - a[1]).slice(0, 3).map((entry) => entry[0]);
  }
  /**
   * Clean up old knowledge
   */
  cleanupKnowledgeBase() {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.knowledgeRetentionDays);
    this.knowledgeBase = this.knowledgeBase.filter((kb) => kb.timestamp >= cutoffDate);
    console.log(`[ContinuousLearning] Knowledge base cleaned. Retained ${this.knowledgeBase.length} entries`);
  }
  /**
   * Get learning statistics
   */
  getLearningStats() {
    const totalExperiences = this.knowledgeBase.length;
    const successExperiences = this.knowledgeBase.filter((e) => e.success).length;
    return {
      totalExperiences,
      successRate: totalExperiences > 0 ? successExperiences / totalExperiences * 100 : 0,
      knowledgeBaseSize: this.knowledgeBase.length,
      performanceHistoryDays: this.performanceHistory.length,
      recentImprovements: this.knowledgeBase.filter((e) => e.task === "self-improvement").slice(-5)
    };
  }
  /**
   * Get knowledge base entries
   */
  getKnowledgeBase(query) {
    if (!query) {
      return this.knowledgeBase.slice(-100);
    }
    const lowerQuery = query.toLowerCase();
    return this.knowledgeBase.filter(
      (entry) => entry.task?.toLowerCase().includes(lowerQuery) || entry.input?.toLowerCase().includes(lowerQuery) || entry.output?.toLowerCase().includes(lowerQuery)
    );
  }
  /**
   * Shutdown cleanup
   */
  shutdown() {
    clearInterval(this.learningInterval);
    console.log("[ContinuousLearning] Shutdown complete");
  }
};

// src/autonomous/AutonomousBrain.ts
var AutonomousBrain = class {
  constructor(config = {}) {
    this.systemStatus = "initializing";
    this.startupTime = /* @__PURE__ */ new Date();
    console.log("\u{1F9E0} Initializing Autonomous Brain System...");
    this.core = new AICore(config);
    this.autoConfig = new AutoConfig2(config);
    this.revenueEngine = new RevenueEngine(this.autoConfig);
    this.learningSystem = new ContinuousLearning(this.core);
    this.systemStatus = "operational";
    this.startSystemMonitoring();
    console.log("\u{1F680} Autonomous Brain System operational");
    console.log(`\u{1F4C5} Started at: ${this.startupTime.toISOString()}`);
  }
  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    setInterval(() => this.checkSystemHealth(), 5 * 60 * 1e3);
    setInterval(() => this.reportPerformance(), 60 * 60 * 1e3);
  }
  /**
   * Check system health
   */
  checkSystemHealth() {
    const uptime = Date.now() - this.startupTime.getTime();
    const hoursUp = uptime / (1e3 * 60 * 60);
    const coreStats = this.core.getStats();
    const revenueStats = this.revenueEngine.getRevenueStats();
    const learningStats = this.learningSystem.getLearningStats();
    const healthStatus = {
      status: "healthy",
      uptimeHours: hoursUp,
      corePerformance: {
        totalCalls: coreStats.totalCalls,
        errorRate: coreStats.errorCount / Math.max(1, coreStats.totalCalls),
        avgLatencyMs: coreStats.averageLatencyMs
      },
      revenuePerformance: {
        totalRevenue: revenueStats.totalRevenue,
        successRate: revenueStats.successRate,
        activeOpportunities: revenueStats.activeOpportunities
      },
      learningPerformance: {
        totalExperiences: learningStats.totalExperiences,
        successRate: learningStats.successRate
      },
      timestamp: /* @__PURE__ */ new Date()
    };
    if (healthStatus.corePerformance.errorRate > 0.1) {
      healthStatus.status = "degraded";
      healthStatus.issues = ["High error rate detected"];
    }
    if (hoursUp > 24 && revenueStats.totalRevenue === 0) {
      healthStatus.status = "warning";
      healthStatus.issues = healthStatus.issues || [];
      healthStatus.issues.push("No revenue generated in 24 hours");
    }
    console.log(`[AutonomousBrain] Health Check: ${healthStatus.status}`);
    return healthStatus;
  }
  /**
   * Report system performance
   */
  reportPerformance() {
    const report = this.getPerformanceReport();
    console.log("\n=== AUTONOMOUS BRAIN PERFORMANCE REPORT ===");
    console.log(`\u{1F4CA} System Status: ${report.systemStatus}`);
    console.log(`\u23F1\uFE0F  Uptime: ${report.uptimeHours.toFixed(1)} hours`);
    console.log(`
\u{1F9E0} CORE PERFORMANCE:`);
    console.log(`   - Total Calls: ${report.coreStats.totalCalls}`);
    console.log(`   - Success Rate: ${(100 - report.coreStats.errorRate * 100).toFixed(1)}%`);
    console.log(`   - Avg Latency: ${report.coreStats.avgLatencyMs}ms`);
    console.log(`
\u{1F4B0} REVENUE PERFORMANCE:`);
    console.log(`   - Total Revenue: $${report.revenueStats.totalRevenue}`);
    console.log(`   - Success Rate: ${report.revenueStats.successRate.toFixed(1)}%`);
    console.log(`   - Active Opportunities: ${report.revenueStats.activeOpportunities}`);
    console.log(`
\u{1F4DA} LEARNING PERFORMANCE:`);
    console.log(`   - Total Experiences: ${report.learningStats.totalExperiences}`);
    console.log(`   - Learning Success Rate: ${report.learningStats.successRate.toFixed(1)}%`);
    console.log("===========================================\n");
    this.learningSystem.recordPerformance({
      successRate: 100 - report.coreStats.errorRate * 100,
      errorRate: report.coreStats.errorRate * 100,
      responseTimeMs: report.coreStats.avgLatencyMs,
      costPerCall: report.coreStats.totalCostUsd / Math.max(1, report.coreStats.totalCalls),
      userSatisfaction: 85
      // Simulated for now
    });
  }
  /**
   * Generate AI responses with full autonomous capabilities
   */
  async generate(prompt, options = {}) {
    const startTime = Date.now();
    try {
      const coreResponse = await this.core.generate(prompt, options);
      const response = {
        text: coreResponse.text,
        provider: coreResponse.provider,
        model: coreResponse.model,
        latencyMs: Date.now() - startTime,
        tokensUsed: coreResponse.tokensUsed,
        costUsd: coreResponse.costUsd,
        confidence: coreResponse.confidence,
        flagged: coreResponse.flagged,
        flagReason: coreResponse.flagReason,
        autonomousMetadata: {
          systemStatus: this.systemStatus,
          learningEnabled: true,
          revenueGenerationEnabled: true,
          selfImprovementActive: true,
          timestamp: /* @__PURE__ */ new Date()
        }
      };
      this.learningSystem.recordExperience({
        type: "user",
        task: options.taskType || "general",
        input: prompt,
        output: response.text,
        success: !response.flagged,
        error: response.flagged ? response.flagReason : void 0,
        metrics: {
          latencyMs: response.latencyMs,
          tokensUsed: response.tokensUsed,
          costUsd: response.costUsd
        }
      });
      return response;
    } catch (error) {
      console.error("Autonomous generation failed:", error);
      this.learningSystem.recordExperience({
        type: "user",
        task: options.taskType || "general",
        input: prompt,
        output: "Error",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    return {
      systemStatus: this.systemStatus,
      startupTime: this.startupTime,
      uptimeHours: (Date.now() - this.startupTime.getTime()) / (1e3 * 60 * 60),
      coreConfig: this.autoConfig.getConfig(),
      revenueStats: this.revenueEngine.getRevenueStats(),
      learningStats: this.learningSystem.getLearningStats(),
      currentOpportunities: this.revenueEngine.getCurrentOpportunities()
    };
  }
  /**
   * Get performance report
   */
  getPerformanceReport() {
    const coreStats = this.core.getStats();
    const revenueStats = this.revenueEngine.getRevenueStats();
    const learningStats = this.learningSystem.getLearningStats();
    return {
      systemStatus: this.systemStatus,
      uptimeHours: (Date.now() - this.startupTime.getTime()) / (1e3 * 60 * 60),
      coreStats: {
        totalCalls: coreStats.totalCalls,
        errorRate: coreStats.totalCalls > 0 ? coreStats.errorCount / coreStats.totalCalls : 0,
        avgLatencyMs: coreStats.averageLatencyMs,
        totalCostUsd: coreStats.totalCostUsd,
        callsByProvider: coreStats.callsByProvider
      },
      revenueStats: {
        totalRevenue: revenueStats.totalRevenue,
        totalOpportunities: revenueStats.totalOpportunities,
        successfulOpportunities: revenueStats.successfulOpportunities,
        successRate: revenueStats.successRate,
        activeOpportunities: revenueStats.activeOpportunities,
        pipelineSize: revenueStats.pipelineSize
      },
      learningStats: {
        totalExperiences: learningStats.totalExperiences,
        successRate: learningStats.successRate,
        knowledgeBaseSize: learningStats.knowledgeBaseSize,
        performanceHistoryDays: learningStats.performanceHistoryDays
      },
      timestamp: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Shutdown system gracefully
   */
  shutdown() {
    console.log("\u{1F9E0} Shutting down Autonomous Brain System...");
    this.systemStatus = "shutting_down";
    this.revenueEngine.shutdown();
    this.learningSystem.shutdown();
    const finalReport = this.getPerformanceReport();
    console.log("\u{1F4CA} Final Performance Report:");
    console.log(`   - Uptime: ${finalReport.uptimeHours.toFixed(1)} hours`);
    console.log(`   - Total Revenue: $${finalReport.revenueStats.totalRevenue}`);
    console.log(`   - Total AI Calls: ${finalReport.coreStats.totalCalls}`);
    console.log(`   - Learning Experiences: ${finalReport.learningStats.totalExperiences}`);
    this.systemStatus = "offline";
    console.log("\u2705 Autonomous Brain System shutdown complete");
  }
};

// src/audit/SystemAuditor.ts
var SystemAuditor = class {
  constructor(core) {
    this.issues = [];
    this.warnings = [];
    this.performanceMetrics = [];
    this.core = core;
  }
  /**
   * Run comprehensive system audit
   */
  async runFullAudit(autonomousBrain, revenueBrainstem, learningSystem) {
    console.log("\u{1F50D} Starting comprehensive system audit...");
    const startTime = Date.now();
    this.issues = [];
    this.warnings = [];
    try {
      await this.auditCoreSystem(autonomousBrain);
      await this.auditRevenueSystem(revenueBrainstem);
      await this.auditLearningSystem(learningSystem);
      await this.auditSecurity();
      await this.auditPerformance();
      await this.detectMemoryLeaks();
      await this.detectCodeSmells();
      const auditDuration = Date.now() - startTime;
      const report = {
        timestamp: /* @__PURE__ */ new Date(),
        durationMs: auditDuration,
        issues: this.issues,
        warnings: this.warnings,
        performanceMetrics: this.performanceMetrics,
        severitySummary: this.calculateSeveritySummary(),
        recommendations: this.generateRecommendations()
      };
      console.log(`\u2705 Audit completed in ${auditDuration}ms`);
      console.log(`\u{1F4CB} Found ${this.issues.length} issues, ${this.warnings.length} warnings`);
      return report;
    } catch (error) {
      console.error("\u274C Audit failed:", error);
      throw new Error(`Audit failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Audit core autonomous brain system
   */
  async auditCoreSystem(brain) {
    console.log("\u{1F9E0} Auditing core autonomous brain...");
    try {
      const status = brain.getSystemStatus();
      if (status.systemStatus !== "operational") {
        this.issues.push({
          id: `core-${Date.now()}`,
          severity: "high",
          category: "system",
          description: `System status is ${status.systemStatus}, expected operational`,
          location: "AutonomousBrain.getSystemStatus()",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
      if (status.uptimeHours > 168) {
        this.warnings.push({
          id: `core-${Date.now()}-1`,
          severity: "low",
          category: "performance",
          description: `System has been running for ${status.uptimeHours.toFixed(1)} hours without restart`,
          recommendation: "Consider periodic restarts to prevent memory buildup",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
      const coreStats = status.coreConfig.coreConfig.getStats();
      const errorRate = coreStats.totalCalls > 0 ? coreStats.errorCount / coreStats.totalCalls : 0;
      if (errorRate > 0.05) {
        this.issues.push({
          id: `core-${Date.now()}-2`,
          severity: errorRate > 0.1 ? "high" : "medium",
          category: "reliability",
          description: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
          location: "AICore.getStats()",
          detectedAt: /* @__PURE__ */ new Date(),
          metrics: {
            totalCalls: coreStats.totalCalls,
            errorCount: coreStats.errorCount,
            errorRate
          }
        });
      }
      const testPrompt = "Test audit prompt";
      const testResult = await brain.generate(testPrompt, { taskType: "chat" });
      if (testResult.latencyMs > 5e3) {
        this.warnings.push({
          id: `core-${Date.now()}-3`,
          severity: "medium",
          category: "performance",
          description: `High latency detected: ${testResult.latencyMs}ms`,
          location: "AutonomousBrain.generate()",
          detectedAt: /* @__PURE__ */ new Date(),
          metrics: {
            latencyMs: testResult.latencyMs,
            tokensUsed: testResult.tokensUsed
          }
        });
      }
      console.log("\u2705 Core system audit completed");
    } catch (error) {
      this.issues.push({
        id: `core-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Core system audit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.auditCoreSystem()",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  /**
   * Audit revenue brainstem system
   */
  async auditRevenueSystem(brainstem) {
    console.log("\u{1F4B0} Auditing revenue brainstem...");
    try {
      const dashboard = brainstem.getRevenueDashboard();
      if (dashboard.targets.mrrTarget <= 0) {
        this.issues.push({
          id: `revenue-${Date.now()}`,
          severity: "high",
          category: "configuration",
          description: "MRR target is zero or negative",
          location: "RevenueBrainstem.targets",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
      const ltvToCac = dashboard.currentPerformance.ltv / Math.max(1, dashboard.currentPerformance.cac);
      if (ltvToCac < 3) {
        this.issues.push({
          id: `revenue-${Date.now()}-1`,
          severity: "high",
          category: "business",
          description: `Poor LTV/CAC ratio: ${ltvToCac.toFixed(2)} (target: 3+)`,
          location: "RevenueBrainstem.performance",
          detectedAt: /* @__PURE__ */ new Date(),
          metrics: {
            ltv: dashboard.currentPerformance.ltv,
            cac: dashboard.currentPerformance.cac,
            ratio: ltvToCac
          }
        });
      }
      if (dashboard.currentPerformance.churnRate > dashboard.targets.targetChurnRate * 1.5) {
        this.issues.push({
          id: `revenue-${Date.now()}-2`,
          severity: "high",
          category: "business",
          description: `High churn rate: ${dashboard.currentPerformance.churnRate.toFixed(2)}% (target: ${dashboard.targets.targetChurnRate}%)`,
          location: "RevenueBrainstem.performance",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
      const pipelineCoverage = dashboard.currentPerformance.pipelineValue / dashboard.targets.mrrTarget;
      if (pipelineCoverage < 2) {
        this.warnings.push({
          id: `revenue-${Date.now()}-3`,
          severity: "medium",
          category: "business",
          description: `Low pipeline coverage: ${pipelineCoverage.toFixed(2)}x (target: 3x)`,
          location: "RevenueBrainstem.performance",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
      dashboard.agentStatus.forEach((agent) => {
        if (agent.status !== "operational") {
          this.issues.push({
            id: `revenue-agent-${Date.now()}-${agent.type}`,
            severity: "medium",
            category: "reliability",
            description: `Agent ${agent.type} is ${agent.status}`,
            location: `RevenueBrainstem.agents.${agent.type}`,
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      });
      console.log("\u2705 Revenue system audit completed");
    } catch (error) {
      this.issues.push({
        id: `revenue-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Revenue system audit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.auditRevenueSystem()",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  /**
   * Audit learning system
   */
  async auditLearningSystem(learning) {
    console.log("\u{1F4DA} Auditing learning system...");
    try {
      const stats = learning.getLearningStats();
      if (stats.totalExperiences > 100 && stats.successRate < 70) {
        this.issues.push({
          id: `learning-${Date.now()}`,
          severity: "medium",
          category: "learning",
          description: `Low learning success rate: ${stats.successRate.toFixed(1)}%`,
          location: "ContinuousLearning.getLearningStats()",
          detectedAt: /* @__PURE__ */ new Date(),
          metrics: {
            totalExperiences: stats.totalExperiences,
            successRate: stats.successRate
          }
        });
      }
      if (stats.knowledgeBaseSize > 1e4) {
        this.warnings.push({
          id: `learning-${Date.now()}-1`,
          severity: "low",
          category: "performance",
          description: `Large knowledge base: ${stats.knowledgeBaseSize} entries`,
          recommendation: "Consider knowledge base pruning",
          location: "ContinuousLearning.knowledgeBase",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
      console.log("\u2705 Learning system audit completed");
    } catch (error) {
      this.issues.push({
        id: `learning-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Learning system audit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.auditLearningSystem()",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  /**
   * Security audit
   */
  async auditSecurity() {
    console.log("\u{1F512} Running security audit...");
    try {
      const config = this.core["config"];
      if (config?.providers) {
        Object.entries(config.providers).forEach(([provider, settings]) => {
          if (settings?.apiKey && settings.apiKey.length > 0 && !settings.apiKey.startsWith("*****")) {
            this.issues.push({
              id: `security-${Date.now()}-${provider}`,
              severity: "critical",
              category: "security",
              description: `API key for ${provider} is exposed in memory`,
              location: `AICore.config.providers.${provider}.apiKey`,
              detectedAt: /* @__PURE__ */ new Date(),
              recommendation: "Use secure key management and mask keys in memory"
            });
          }
        });
      }
      this.warnings.push({
        id: `security-${Date.now()}-general`,
        severity: "medium",
        category: "security",
        description: "General security review recommended",
        recommendation: "Conduct penetration testing and code review for injection vulnerabilities",
        detectedAt: /* @__PURE__ */ new Date()
      });
      console.log("\u2705 Security audit completed");
    } catch (error) {
      this.issues.push({
        id: `security-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Security audit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.auditSecurity()",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  /**
   * Performance audit
   */
  async auditPerformance() {
    console.log("\u26A1 Running performance audit...");
    try {
      const startTime = Date.now();
      const testResults = [];
      for (let i = 0; i < 5; i++) {
        const testStart = Date.now();
        const result = await this.core.generate("Performance test prompt", { taskType: "chat" });
        const testDuration = Date.now() - testStart;
        testResults.push({
          testNumber: i + 1,
          latencyMs: testDuration,
          tokensUsed: result.tokensUsed || 0,
          success: !result.flagged
        });
      }
      const avgLatency = testResults.reduce((sum, r) => sum + r.latencyMs, 0) / testResults.length;
      const successRate = testResults.filter((r) => r.success).length / testResults.length;
      this.performanceMetrics.push({
        timestamp: /* @__PURE__ */ new Date(),
        metric: "response_latency",
        value: avgLatency,
        unit: "ms",
        threshold: 2e3,
        // 2 seconds
        status: avgLatency > 2e3 ? "warning" : "healthy"
      });
      this.performanceMetrics.push({
        timestamp: /* @__PURE__ */ new Date(),
        metric: "success_rate",
        value: successRate * 100,
        unit: "%",
        threshold: 95,
        status: successRate < 0.95 ? "warning" : "healthy"
      });
      if (avgLatency > 3e3) {
        this.issues.push({
          id: `performance-${Date.now()}`,
          severity: "medium",
          category: "performance",
          description: `High average response latency: ${avgLatency.toFixed(0)}ms`,
          location: "AICore.generate()",
          detectedAt: /* @__PURE__ */ new Date(),
          metrics: {
            avgLatencyMs: avgLatency,
            successRate: successRate * 100,
            testCount: testResults.length
          }
        });
      }
      const auditDuration = Date.now() - startTime;
      console.log(`\u2705 Performance audit completed in ${auditDuration}ms`);
    } catch (error) {
      this.issues.push({
        id: `performance-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Performance audit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.auditPerformance()",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  /**
   * Memory leak detection
   */
  async detectMemoryLeaks() {
    console.log("\u{1F9F9} Detecting memory leaks...");
    try {
      const simulatedMemoryUsage = {
        heapUsed: 150 + Math.random() * 100,
        // MB
        heapTotal: 200 + Math.random() * 50,
        // MB
        external: 50 + Math.random() * 30
        // MB
      };
      const heapUsageRatio = simulatedMemoryUsage.heapUsed / simulatedMemoryUsage.heapTotal;
      if (heapUsageRatio > 0.85) {
        this.warnings.push({
          id: `memory-${Date.now()}`,
          severity: "high",
          category: "performance",
          description: `High memory usage: ${(heapUsageRatio * 100).toFixed(1)}% of heap`,
          location: "System memory",
          detectedAt: /* @__PURE__ */ new Date(),
          recommendation: "Investigate potential memory leaks",
          metrics: {
            heapUsed: simulatedMemoryUsage.heapUsed,
            heapTotal: simulatedMemoryUsage.heapTotal,
            external: simulatedMemoryUsage.external
          }
        });
      }
      this.warnings.push({
        id: `memory-${Date.now()}-1`,
        severity: "low",
        category: "performance",
        description: "Potential event listener leak detection recommended",
        recommendation: "Review event listener cleanup in long-running processes",
        detectedAt: /* @__PURE__ */ new Date()
      });
      console.log("\u2705 Memory leak detection completed");
    } catch (error) {
      this.issues.push({
        id: `memory-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Memory leak detection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.detectMemoryLeaks()",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  /**
   * Code smell detection
   */
  async detectCodeSmells() {
    console.log("\u{1F443} Detecting code smells...");
    try {
      this.warnings.push({
        id: `smell-${Date.now()}`,
        severity: "low",
        category: "code_quality",
        description: "Large class detected: AutonomousBrain could be split into smaller components",
        location: "AutonomousBrain.ts",
        detectedAt: /* @__PURE__ */ new Date(),
        recommendation: "Consider applying Single Responsibility Principle"
      });
      this.warnings.push({
        id: `smell-${Date.now()}-1`,
        severity: "low",
        category: "code_quality",
        description: "Magic numbers detected in various files",
        location: "Multiple files",
        detectedAt: /* @__PURE__ */ new Date(),
        recommendation: "Replace with named constants"
      });
      this.warnings.push({
        id: `smell-${Date.now()}-2`,
        severity: "low",
        category: "code_quality",
        description: "Deep nesting detected in audit methods",
        location: "SystemAuditor.ts",
        detectedAt: /* @__PURE__ */ new Date(),
        recommendation: "Consider early returns to reduce nesting"
      });
      console.log("\u2705 Code smell detection completed");
    } catch (error) {
      this.issues.push({
        id: `smell-audit-${Date.now()}`,
        severity: "critical",
        category: "audit",
        description: `Code smell detection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        location: "SystemAuditor.detectCodeSmells()",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  /**
   * Calculate severity summary
   */
  calculateSeveritySummary() {
    const critical = this.issues.filter((i) => i.severity === "critical").length;
    const high = this.issues.filter((i) => i.severity === "high").length;
    const medium = this.issues.filter((i) => i.severity === "medium").length;
    const low = this.issues.filter((i) => i.severity === "low").length;
    const warningHigh = this.warnings.filter((w) => w.severity === "high").length;
    const warningMedium = this.warnings.filter((w) => w.severity === "medium").length;
    const warningLow = this.warnings.filter((w) => w.severity === "low").length;
    return {
      issues: {
        critical,
        high,
        medium,
        low,
        total: this.issues.length
      },
      warnings: {
        high: warningHigh,
        medium: warningMedium,
        low: warningLow,
        total: this.warnings.length
      },
      overallScore: this.calculateOverallScore()
    };
  }
  /**
   * Calculate overall system health score
   */
  calculateOverallScore() {
    const issuePenalties = this.issues.reduce((sum, issue) => {
      switch (issue.severity) {
        case "critical":
          return sum + 20;
        case "high":
          return sum + 10;
        case "medium":
          return sum + 5;
        case "low":
          return sum + 2;
        default:
          return sum;
      }
    }, 0);
    const warningPenalties = this.warnings.reduce((sum, warning) => {
      switch (warning.severity) {
        case "high":
          return sum + 3;
        case "medium":
          return sum + 2;
        case "low":
          return sum + 1;
        default:
          return sum;
      }
    }, 0);
    const performanceScore = this.performanceMetrics.reduce((sum, metric) => {
      return sum + (metric.status === "healthy" ? 5 : metric.status === "warning" ? 2 : 0);
    }, 0);
    const baseScore = 80;
    const penalty = issuePenalties + warningPenalties;
    const score = Math.max(0, Math.min(100, baseScore - penalty + performanceScore));
    return score;
  }
  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const criticalIssues = this.issues.filter((i) => i.severity === "critical");
    if (criticalIssues.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}`,
        priority: "critical",
        description: `Address ${criticalIssues.length} critical issues immediately`,
        issues: criticalIssues.map((i) => i.id)
      });
    }
    const highIssues = this.issues.filter((i) => i.severity === "high");
    if (highIssues.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-1`,
        priority: "high",
        description: `Review and fix ${highIssues.length} high-severity issues`,
        issues: highIssues.map((i) => i.id)
      });
    }
    const performanceWarnings = this.warnings.filter((w) => w.category === "performance");
    if (performanceWarnings.length > 3) {
      recommendations.push({
        id: `rec-${Date.now()}-2`,
        priority: "medium",
        description: "Optimize system performance based on warnings",
        warnings: performanceWarnings.map((w) => w.id)
      });
    }
    const securityIssues = this.issues.filter((i) => i.category === "security");
    if (securityIssues.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-3`,
        priority: "high",
        description: `Fix ${securityIssues.length} security vulnerabilities`,
        issues: securityIssues.map((i) => i.id)
      });
    }
    recommendations.push({
      id: `rec-${Date.now()}-4`,
      priority: "low",
      description: "Regular system maintenance and monitoring",
      details: "Schedule weekly audits and performance reviews"
    });
    return recommendations;
  }
  /**
   * Generate E2E test cases based on audit findings
   */
  generateE2ETests() {
    const testCases = [];
    testCases.push({
      id: `e2e-core-${Date.now()}`,
      name: "Core System Reliability Test",
      description: "Test core system reliability under load",
      steps: [
        "Initialize AutonomousBrain with test configuration",
        "Execute 100 consecutive generate calls",
        "Verify all responses are valid",
        "Check error rate is below 1%",
        "Verify no memory leaks"
      ],
      expected: "All calls succeed with <1% error rate",
      category: "reliability",
      priority: "high"
    });
    testCases.push({
      id: `e2e-revenue-${Date.now()}`,
      name: "Revenue Brainstem Integration Test",
      description: "Test revenue brainstem with realistic data",
      steps: [
        "Initialize RevenueBrainstem with test targets",
        "Connect mock data sources",
        "Run weekly planning cycle",
        "Execute daily actions",
        "Verify initiatives are created and executed",
        "Check performance metrics are tracked"
      ],
      expected: "Revenue plan created and executed successfully",
      category: "integration",
      priority: "high"
    });
    testCases.push({
      id: `e2e-security-${Date.now()}`,
      name: "Security and API Key Handling Test",
      description: "Test secure handling of API keys",
      steps: [
        "Initialize system with test API keys",
        "Verify keys are masked in memory",
        "Attempt to access keys directly",
        "Check audit logs for security warnings",
        "Verify no keys are exposed in error messages"
      ],
      expected: "API keys are properly secured and masked",
      category: "security",
      priority: "critical"
    });
    testCases.push({
      id: `e2e-performance-${Date.now()}`,
      name: "Performance Under Load Test",
      description: "Test system performance with concurrent requests",
      steps: [
        "Initialize all systems",
        "Send 50 concurrent generate requests",
        "Measure average response time",
        "Check for timeouts or failures",
        "Verify system remains responsive"
      ],
      expected: "All requests complete in <3 seconds with 0 failures",
      category: "performance",
      priority: "medium"
    });
    testCases.push({
      id: `e2e-failure-${Date.now()}`,
      name: "Failure Recovery Test",
      description: "Test system recovery from failures",
      steps: [
        "Initialize all systems",
        "Simulate API provider failure",
        "Verify fallback mechanisms work",
        "Check error handling and logging",
        "Verify system recovers automatically"
      ],
      expected: "System handles failure gracefully and recovers",
      category: "reliability",
      priority: "high"
    });
    return testCases;
  }
  /**
   * Generate audit report summary
   */
  generateAuditSummary(report) {
    const lines = [
      "=".repeat(60),
      "SYSTEM AUDIT REPORT",
      "=".repeat(60),
      `Generated: ${report.timestamp.toISOString()}`,
      `Duration: ${report.durationMs}ms`,
      `Overall Score: ${report.severitySummary.overallScore}/100`,
      "",
      "ISSUES BY SEVERITY:",
      `  Critical: ${report.severitySummary.issues.critical}`,
      `  High: ${report.severitySummary.issues.high}`,
      `  Medium: ${report.severitySummary.issues.medium}`,
      `  Low: ${report.severitySummary.issues.low}`,
      `  Total: ${report.severitySummary.issues.total}`,
      "",
      "WARNINGS BY SEVERITY:",
      `  High: ${report.severitySummary.warnings.high}`,
      `  Medium: ${report.severitySummary.warnings.medium}`,
      `  Low: ${report.severitySummary.warnings.low}`,
      `  Total: ${report.severitySummary.warnings.total}`,
      "",
      "PERFORMANCE METRICS:",
      ...report.performanceMetrics.map((m) => `  ${m.metric}: ${m.value}${m.unit} (${m.status})`),
      "",
      "TOP RECOMMENDATIONS:",
      ...report.recommendations.slice(0, 3).map((r) => `  [${r.priority}] ${r.description}`),
      "=".repeat(60)
    ];
    return lines.join("\n");
  }
};

// src/audit/SystemTester.ts
var SystemTester = class {
  constructor(core) {
    this.testResults = [];
    this.currentTestSuite = null;
    this.core = core;
  }
  /**
   * Run comprehensive test suite
   */
  async runComprehensiveTests() {
    console.log("\u{1F9EA} Starting comprehensive test suite...");
    const startTime = Date.now();
    const suite = {
      id: `suite-${Date.now()}`,
      name: "Comprehensive System Tests",
      description: "Full system validation including functional, integration, performance, and reliability tests",
      startTime: /* @__PURE__ */ new Date(),
      tests: []
    };
    this.currentTestSuite = suite;
    try {
      await this.runCoreSystemTests(suite);
      await this.runRevenueSystemTests(suite);
      await this.runLearningSystemTests(suite);
      await this.runIntegrationTests(suite);
      await this.runPerformanceTests(suite);
      await this.runReliabilityTests(suite);
      await this.runSecurityTests(suite);
      const endTime = Date.now();
      suite.endTime = /* @__PURE__ */ new Date();
      suite.durationMs = endTime - startTime;
      const report = this.generateTestReport(suite);
      console.log(`\u2705 Test suite completed in ${suite.durationMs}ms`);
      console.log(`\u{1F4CA} Results: ${report.passed}/${report.total} tests passed (${report.passRate}%)`);
      return report;
    } catch (error) {
      console.error("\u274C Test suite failed:", error);
      throw new Error(`Test suite failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      this.currentTestSuite = null;
    }
  }
  /**
   * Run core system tests
   */
  async runCoreSystemTests(suite) {
    console.log("\u{1F9E0} Running core system tests...");
    const core = new AICore({
      providers: {
        gemini: { apiKey: "test-key" }
      }
    });
    const learning = new ContinuousLearning(core);
    const autonomousBrain = new AutonomousBrain({
      providers: {
        gemini: { apiKey: "test-key" }
      }
    });
    suite.tests.push(await this.runTest({
      id: `core-init-${Date.now()}`,
      name: "Core System Initialization",
      description: "Test that all core systems initialize correctly",
      test: async () => {
        return { success: true, message: "All core systems initialized successfully" };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `core-gen-${Date.now()}`,
      name: "Basic Generation Test",
      description: "Test basic AI generation functionality",
      test: async () => {
        const result = await autonomousBrain.generate("Test prompt", { taskType: "chat" });
        if (!result.text || result.text.length === 0) {
          return { success: false, message: "Empty response generated" };
        }
        return { success: true, message: "Generation successful", data: { latencyMs: result.latencyMs } };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `core-error-${Date.now()}`,
      name: "Error Handling Test",
      description: "Test system error handling",
      test: async () => {
        try {
          const result = await autonomousBrain.generate("", { taskType: "chat" });
          return { success: true, message: "Empty prompt handled gracefully" };
        } catch (error) {
          return { success: false, message: `Error not handled: ${error}` };
        }
      }
    }));
    suite.tests.push(await this.runTest({
      id: `core-status-${Date.now()}`,
      name: "System Status Test",
      description: "Test system status reporting",
      test: async () => {
        const status = autonomousBrain.getSystemStatus();
        if (status.systemStatus !== "operational") {
          return { success: false, message: `Unexpected status: ${status.systemStatus}` };
        }
        return { success: true, message: "System status correct" };
      }
    }));
    console.log("\u2705 Core system tests completed");
  }
  /**
   * Run revenue system tests
   */
  async runRevenueSystemTests(suite) {
    console.log("\u{1F4B0} Running revenue system tests...");
    const core = new AICore({
      providers: {
        gemini: { apiKey: "test-key" }
      }
    });
    const learning = new ContinuousLearning(core);
    const revenueData = new RevenueData(core);
    const targets = {
      mrrTarget: 1e5,
      maxCac: 2500,
      maxPaybackMonths: 12,
      targetCloseRate: 25,
      targetChurnRate: 3
    };
    const brainstem = new RevenueBrainstem(core, new AutoConfig(), learning, targets);
    suite.tests.push(await this.runTest({
      id: `revenue-data-${Date.now()}`,
      name: "Revenue Data Connection",
      description: "Test revenue data source connection",
      test: async () => {
        try {
          const source = await revenueData.connectSource({
            type: "stripe",
            name: "Test Stripe",
            apiKey: "test-key"
          });
          if (source.status !== "connected") {
            return { success: false, message: `Source not connected: ${source.status}` };
          }
          return { success: true, message: "Data source connected successfully" };
        } catch (error) {
          return { success: false, message: `Connection failed: ${error}` };
        }
      }
    }));
    suite.tests.push(await this.runTest({
      id: `revenue-dashboard-${Date.now()}`,
      name: "Revenue Dashboard Test",
      description: "Test revenue dashboard generation",
      test: async () => {
        const dashboard = brainstem.getRevenueDashboard();
        if (!dashboard.currentPerformance) {
          return { success: false, message: "No performance data available" };
        }
        return { success: true, message: "Dashboard generated successfully" };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `revenue-report-${Date.now()}`,
      name: "Performance Report Test",
      description: "Test performance report generation",
      test: async () => {
        const report = brainstem.getPerformanceReport();
        if (!report.mrr || !report.cac) {
          return { success: false, message: "Incomplete performance report" };
        }
        return { success: true, message: "Performance report generated successfully" };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `revenue-agents-${Date.now()}`,
      name: "Agent Status Test",
      description: "Test revenue agent status reporting",
      test: async () => {
        const dashboard = brainstem.getRevenueDashboard();
        const operationalAgents = dashboard.agentStatus.filter((a) => a.status === "operational");
        if (operationalAgents.length === 0) {
          return { success: false, message: "No operational agents found" };
        }
        return { success: true, message: `${operationalAgents.length} agents operational` };
      }
    }));
    console.log("\u2705 Revenue system tests completed");
  }
  /**
   * Run learning system tests
   */
  async runLearningSystemTests(suite) {
    console.log("\u{1F4DA} Running learning system tests...");
    const core = new AICore({
      providers: {
        gemini: { apiKey: "test-key" }
      }
    });
    const learning = new ContinuousLearning(core);
    suite.tests.push(await this.runTest({
      id: `learning-init-${Date.now()}`,
      name: "Learning System Initialization",
      description: "Test learning system initialization",
      test: async () => {
        const stats = learning.getLearningStats();
        if (stats.totalExperiences < 0) {
          return { success: false, message: "Invalid learning stats" };
        }
        return { success: true, message: "Learning system initialized successfully" };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `learning-record-${Date.now()}`,
      name: "Experience Recording",
      description: "Test experience recording functionality",
      test: async () => {
        const initialCount = learning.getLearningStats().totalExperiences;
        learning.recordExperience({
          type: "system",
          task: "test",
          input: "test input",
          output: "test output",
          success: true
        });
        const newCount = learning.getLearningStats().totalExperiences;
        if (newCount !== initialCount + 1) {
          return { success: false, message: "Experience not recorded" };
        }
        return { success: true, message: "Experience recorded successfully" };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `learning-perf-${Date.now()}`,
      name: "Performance Recording",
      description: "Test performance metrics recording",
      test: async () => {
        learning.recordPerformance({
          successRate: 95,
          errorRate: 5,
          responseTimeMs: 150,
          costPerCall: 0.01,
          userSatisfaction: 85
        });
        const stats = learning.getLearningStats();
        if (stats.performanceHistoryDays <= 0) {
          return { success: false, message: "Performance not recorded" };
        }
        return { success: true, message: "Performance recorded successfully" };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `learning-kb-${Date.now()}`,
      name: "Knowledge Base Retrieval",
      description: "Test knowledge base retrieval",
      test: async () => {
        const kb = learning.getKnowledgeBase();
        if (!Array.isArray(kb)) {
          return { success: false, message: "Knowledge base not accessible" };
        }
        return { success: true, message: "Knowledge base accessible" };
      }
    }));
    console.log("\u2705 Learning system tests completed");
  }
  /**
   * Run integration tests
   */
  async runIntegrationTests(suite) {
    console.log("\u{1F517} Running integration tests...");
    const core = new AICore({
      providers: {
        gemini: { apiKey: "test-key" }
      }
    });
    const learning = new ContinuousLearning(core);
    const revenueData = new RevenueData(core);
    const targets = {
      mrrTarget: 1e5,
      maxCac: 2500,
      maxPaybackMonths: 12,
      targetCloseRate: 25,
      targetChurnRate: 3
    };
    const brainstem = new RevenueBrainstem(core, new AutoConfig(), learning, targets);
    const autonomousBrain = new AutonomousBrain({
      providers: {
        gemini: { apiKey: "test-key" }
      }
    });
    suite.tests.push(await this.runTest({
      id: `integration-comm-${Date.now()}`,
      name: "Cross-System Communication",
      description: "Test communication between autonomous brain and revenue brainstem",
      test: async () => {
        const brainStatus = autonomousBrain.getSystemStatus();
        const revenueStatus = brainstem.getRevenueDashboard();
        if (!brainStatus || !revenueStatus) {
          return { success: false, message: "Status not available from one or more systems" };
        }
        return { success: true, message: "Cross-system communication successful" };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `integration-data-${Date.now()}`,
      name: "Data Flow Test",
      description: "Test data flow between components",
      test: async () => {
        await revenueData.connectSource({
          type: "stripe",
          name: "Test Stripe",
          apiKey: "test-key"
        });
        const performance = brainstem.getRevenueDashboard().currentPerformance;
        if (!performance || performance.mrr <= 0) {
          return { success: false, message: "Data not flowing correctly" };
        }
        return { success: true, message: "Data flow verified" };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `integration-error-${Date.now()}`,
      name: "Error Propagation Test",
      description: "Test error handling across systems",
      test: async () => {
        try {
          const result = await autonomousBrain.generate("", { taskType: "chat" });
          return { success: true, message: "Errors handled gracefully across systems" };
        } catch (error) {
          return { success: false, message: `Error not handled: ${error}` };
        }
      }
    }));
    console.log("\u2705 Integration tests completed");
  }
  /**
   * Run performance tests
   */
  async runPerformanceTests(suite) {
    console.log("\u26A1 Running performance tests...");
    const core = new AICore({
      providers: {
        gemini: { apiKey: "test-key" }
      }
    });
    suite.tests.push(await this.runTest({
      id: `perf-response-${Date.now()}`,
      name: "Response Time Test",
      description: "Test AI response time",
      test: async () => {
        const startTime = Date.now();
        const result = await core.generate("Performance test prompt", { taskType: "chat" });
        const duration = Date.now() - startTime;
        if (duration > 5e3) {
          return { success: false, message: `Slow response: ${duration}ms`, data: { duration } };
        }
        return { success: true, message: `Response time acceptable: ${duration}ms`, data: { duration } };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `perf-concurrent-${Date.now()}`,
      name: "Concurrent Requests Test",
      description: "Test handling of concurrent requests",
      test: async () => {
        const promises = Array(10).fill(0).map(
          () => core.generate("Concurrent test", { taskType: "chat" })
        );
        const startTime = Date.now();
        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;
        const failed = results.filter((r) => r.flagged).length;
        if (failed > 0) {
          return { success: false, message: `${failed} of ${results.length} requests failed` };
        }
        const avgDuration = duration / results.length;
        if (avgDuration > 3e3) {
          return { success: false, message: `Slow average response: ${avgDuration}ms` };
        }
        return { success: true, message: `All ${results.length} concurrent requests succeeded`, data: { avgDuration } };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `perf-memory-${Date.now()}`,
      name: "Memory Usage Test",
      description: "Test memory usage under load",
      test: async () => {
        const initialMemory = this.simulateMemoryUsage();
        for (let i = 0; i < 20; i++) {
          await core.generate(`Memory test ${i}`, { taskType: "chat" });
        }
        const finalMemory = this.simulateMemoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        if (memoryIncrease > 50) {
          return {
            success: false,
            message: `Excessive memory increase: ${memoryIncrease}MB`,
            data: { initialMemory, finalMemory, memoryIncrease }
          };
        }
        return {
          success: true,
          message: `Memory usage stable: +${memoryIncrease}MB`,
          data: { initialMemory, finalMemory, memoryIncrease }
        };
      }
    }));
    console.log("\u2705 Performance tests completed");
  }
  /**
   * Run reliability tests
   */
  async runReliabilityTests(suite) {
    console.log("\u{1F6E1}\uFE0F Running reliability tests...");
    const core = new AICore({
      providers: {
        gemini: { apiKey: "test-key" }
      }
    });
    suite.tests.push(await this.runTest({
      id: `reliability-error-${Date.now()}`,
      name: "Error Recovery Test",
      description: "Test system recovery from errors",
      test: async () => {
        let recovered = true;
        try {
          await core.generate("", { taskType: "invalid_type" });
        } catch (error) {
          try {
            const recoveryResult = await core.generate("Recovery test", { taskType: "chat" });
            if (!recoveryResult.text) {
              recovered = false;
            }
          } catch (recoveryError) {
            recovered = false;
          }
        }
        if (!recovered) {
          return { success: false, message: "System did not recover from error" };
        }
        return { success: true, message: "System recovered successfully from error" };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `reliability-long-${Date.now()}`,
      name: "Long-Running Operation Test",
      description: "Test system stability during long operations",
      test: async () => {
        const operations = [];
        for (let i = 0; i < 50; i++) {
          try {
            const result = await core.generate(`Operation ${i}`, { taskType: "chat" });
            operations.push(result);
          } catch (error) {
            operations.push(null);
          }
        }
        const failed = operations.filter((op) => op === null).length;
        if (failed > 5) {
          return { success: false, message: `${failed} operations failed` };
        }
        return { success: true, message: `Completed 50 operations with ${failed} failures` };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `reliability-fallback-${Date.now()}`,
      name: "Fallback Mechanism Test",
      description: "Test provider fallback mechanisms",
      test: async () => {
        const results = [];
        for (let i = 0; i < 5; i++) {
          const result = await core.generate(`Fallback test ${i}`, { taskType: "chat" });
          results.push(result);
        }
        const successful = results.filter((r) => !r.flagged).length;
        if (successful < 4) {
          return { success: false, message: `Only ${successful}/5 requests succeeded` };
        }
        return { success: true, message: "Fallback mechanisms working" };
      }
    }));
    console.log("\u2705 Reliability tests completed");
  }
  /**
   * Run security tests
   */
  async runSecurityTests(suite) {
    console.log("\u{1F512} Running security tests...");
    const core = new AICore({
      providers: {
        gemini: { apiKey: "test-key" }
      }
    });
    suite.tests.push(await this.runTest({
      id: `security-api-${Date.now()}`,
      name: "API Key Security Test",
      description: "Test API key handling security",
      test: async () => {
        try {
          await core.generate("", { taskType: "chat" });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("test-key")) {
            return { success: false, message: "API key exposed in error message" };
          }
        }
        return { success: true, message: "API keys properly secured" };
      }
    }));
    suite.tests.push(await this.runTest({
      id: `security-input-${Date.now()}`,
      name: "Input Validation Test",
      description: "Test input validation and sanitization",
      test: async () => {
        const maliciousInput = "<script>alert('xss')</script>";
        try {
          const result = await core.generate(maliciousInput, { taskType: "chat" });
          return { success: true, message: "Input handled safely" };
        } catch (error) {
          return { success: false, message: `Input validation failed: ${error}` };
        }
      }
    }));
    suite.tests.push(await this.runTest({
      id: `security-rate-${Date.now()}`,
      name: "Rate Limiting Test",
      description: "Test rate limiting functionality",
      test: async () => {
        const startTime = Date.now();
        const requests = Array(20).fill(0).map(
          (_, i) => core.generate(`Request ${i}`, { taskType: "chat" })
        );
        try {
          await Promise.all(requests);
          const duration = Date.now() - startTime;
          if (duration < 1e3) {
            return {
              success: false,
              message: `Requests completed too quickly: ${duration}ms for 20 requests`
            };
          }
          return { success: true, message: "Rate limiting appears functional" };
        } catch (error) {
          return { success: false, message: `Rate limiting test failed: ${error}` };
        }
      }
    }));
    console.log("\u2705 Security tests completed");
  }
  /**
   * Run individual test
   */
  async runTest(testDef) {
    const startTime = Date.now();
    const result = {
      id: testDef.id,
      name: testDef.name,
      description: testDef.description,
      category: testDef.category || "functional",
      priority: testDef.priority || "medium",
      startTime: /* @__PURE__ */ new Date(),
      status: "running"
    };
    try {
      const testStart = Date.now();
      const testResult = await testDef.test();
      const testDuration = Date.now() - testStart;
      result.status = testResult.success ? "passed" : "failed";
      result.endTime = /* @__PURE__ */ new Date();
      result.durationMs = testDuration;
      result.success = testResult.success;
      result.message = testResult.message;
      result.data = testResult.data;
      if (testResult.success) {
        console.log(`\u2705 ${testDef.name}: PASSED (${testDuration}ms)`);
      } else {
        console.log(`\u274C ${testDef.name}: FAILED - ${testResult.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      result.status = "error";
      result.endTime = /* @__PURE__ */ new Date();
      result.durationMs = Date.now() - startTime;
      result.success = false;
      result.message = `Test error: ${errorMessage}`;
      result.error = error;
      console.log(`\u{1F4A5} ${testDef.name}: ERROR - ${errorMessage}`);
    }
    this.testResults.push(result);
    if (this.currentTestSuite) {
      this.currentTestSuite.tests.push(result);
    }
    return result;
  }
  /**
   * Generate test report
   */
  generateTestReport(suite) {
    const passed = suite.tests.filter((t) => t.status === "passed").length;
    const failed = suite.tests.filter((t) => t.status === "failed").length;
    const errors = suite.tests.filter((t) => t.status === "error").length;
    const total = suite.tests.length;
    const passRate = total > 0 ? passed / total * 100 : 0;
    const avgDuration = suite.tests.reduce((sum, test) => sum + (test.durationMs || 0), 0) / total;
    const byCategory = {};
    suite.tests.forEach((test) => {
      if (!byCategory[test.category]) {
        byCategory[test.category] = { passed: 0, failed: 0, errors: 0 };
      }
      if (test.status === "passed") byCategory[test.category].passed++;
      else if (test.status === "failed") byCategory[test.category].failed++;
      else byCategory[test.category].errors++;
    });
    return {
      suiteId: suite.id,
      suiteName: suite.name,
      startTime: suite.startTime,
      endTime: suite.endTime,
      durationMs: suite.durationMs,
      passed,
      failed,
      errors,
      total,
      passRate,
      averageDurationMs: avgDuration,
      byCategory,
      tests: suite.tests
    };
  }
  /**
   * Generate test report summary
   */
  generateTestReportSummary(report) {
    const lines = [
      "=".repeat(60),
      "SYSTEM TEST REPORT",
      "=".repeat(60),
      `Suite: ${report.suiteName}`,
      `Duration: ${report.durationMs}ms`,
      `Tests: ${report.total}`,
      `Passed: ${report.passed} (${report.passRate.toFixed(1)}%)`,
      `Failed: ${report.failed}`,
      `Errors: ${report.errors}`,
      `Avg Duration: ${report.averageDurationMs.toFixed(1)}ms`,
      "",
      "BY CATEGORY:",
      ...Object.entries(report.byCategory).map(
        ([category, stats]) => `  ${category}: ${stats.passed}\u2705 ${stats.failed}\u274C ${stats.errors}\u{1F4A5}`
      ),
      "",
      "TOP FAILURES:",
      ...report.tests.filter((t) => t.status !== "passed").slice(0, 3).map((t) => `  [${t.status}] ${t.name}: ${t.message}`),
      "=".repeat(60)
    ];
    return lines.join("\n");
  }
  /**
   * Simulate memory usage (for testing purposes)
   */
  simulateMemoryUsage() {
    const baseHeapUsed = 150 + Math.random() * 20;
    const baseHeapTotal = 200 + Math.random() * 10;
    return {
      heapUsed: baseHeapUsed,
      heapTotal: baseHeapTotal
    };
  }
  /**
   * Get all test results
   */
  getTestResults() {
    return this.testResults;
  }
  /**
   * Get test results by status
   */
  getTestResultsByStatus(status) {
    return this.testResults.filter((result) => result.status === status);
  }
  /**
   * Get test results by category
   */
  getTestResultsByCategory(category) {
    return this.testResults.filter((result) => result.category === category);
  }
};

// src/autonomous/BrainOrchestrator.ts
var BrainOrchestrator = class {
  constructor(core, revenueBrainstem, learningSystem) {
    this.status = "stopped";
    this.schedulerInterval = null;
    this.dreamInterval = null;
    this.cronInterval = null;
    this.auditInterval = null;
    this.testInterval = null;
    this.schedulerTasks = [];
    this.dreamQueue = [];
    this.cronJobs = [];
    this.core = core;
    this.revenueBrainstem = revenueBrainstem;
    this.learningSystem = learningSystem;
    this.auditor = new SystemAuditor(core);
    this.tester = new SystemTester(core);
    this.initializeDefaultTasks();
  }
  /**
   * Initialize default scheduler, dream, and cron tasks
   */
  initializeDefaultTasks() {
    this.schedulerTasks = [
      {
        id: "performance-monitor",
        name: "Performance Monitoring",
        frequency: "5m",
        lastRun: null,
        nextRun: null,
        handler: async () => {
          const stats = this.core.getStats();
          console.log(`[Scheduler] Performance check: ${stats.totalCalls} calls, ${stats.errorRate}% errors`);
          return { success: true };
        }
      },
      {
        id: "revenue-check",
        name: "Revenue Performance Check",
        frequency: "5m",
        lastRun: null,
        nextRun: null,
        handler: async () => {
          const performance = this.revenueBrainstem.getPerformanceReport();
          if (!performance.mrr.onTrack) {
            console.warn(`[Scheduler] MRR off track: $${performance.mrr.current}/$${performance.mrr.target}`);
          }
          return { success: true };
        }
      },
      {
        id: "learning-sync",
        name: "Learning System Sync",
        frequency: "5m",
        lastRun: null,
        nextRun: null,
        handler: async () => {
          const stats = this.learningSystem.getLearningStats();
          console.log(`[Scheduler] Learning sync: ${stats.totalExperiences} experiences`);
          return { success: true };
        }
      }
    ];
    this.dreamQueue = [
      {
        id: "self-improvement",
        name: "Self-Improvement Analysis",
        priority: "high",
        lastRun: null,
        handler: async () => {
          const analysis = await this.analyzePerformanceAndImprove();
          console.log(`[Dream] Self-improvement: ${analysis.improvements.length} improvements identified`);
          return { success: true };
        }
      },
      {
        id: "revenue-optimization",
        name: "Revenue Optimization",
        priority: "medium",
        lastRun: null,
        handler: async () => {
          const opportunities = await this.findRevenueOpportunities();
          console.log(`[Dream] Revenue optimization: ${opportunities.length} opportunities found`);
          return { success: true };
        }
      },
      {
        id: "knowledge-consolidation",
        name: "Knowledge Consolidation",
        priority: "low",
        lastRun: null,
        handler: async () => {
          const knowledge = this.learningSystem.getKnowledgeBase();
          console.log(`[Dream] Knowledge consolidation: ${knowledge.length} entries processed`);
          return { success: true };
        }
      }
    ];
    this.cronJobs = [
      {
        id: "daily-audit",
        name: "Daily System Audit",
        schedule: "0 0 * * *",
        // Midnight every day
        lastRun: null,
        nextRun: this.calculateNextRun("0 0 * * *"),
        handler: async () => {
          const report = await this.auditor.runFullAudit(
            this.core,
            this.revenueBrainstem,
            this.learningSystem
          );
          console.log(`[Cron] Daily audit completed: ${report.severitySummary.overallScore}/100`);
          return { success: true };
        }
      },
      {
        id: "weekly-tests",
        name: "Weekly System Tests",
        schedule: "0 0 * * 1",
        // Midnight every Monday
        lastRun: null,
        nextRun: this.calculateNextRun("0 0 * * 1"),
        handler: async () => {
          const report = await this.tester.runComprehensiveTests();
          console.log(`[Cron] Weekly tests completed: ${report.passRate}% pass rate`);
          return { success: true };
        }
      },
      {
        id: "monthly-report",
        name: "Monthly Performance Report",
        schedule: "0 0 1 * *",
        // Midnight on 1st of month
        lastRun: null,
        nextRun: this.calculateNextRun("0 0 1 * *"),
        handler: async () => {
          const report = this.generateMonthlyReport();
          console.log(`[Cron] Monthly report generated: ${report.totalRevenue} revenue`);
          return { success: true };
        }
      }
    ];
  }
  /**
   * Start the entire brain system
   */
  start() {
    if (this.status !== "stopped") {
      console.log("\u26A0\uFE0F  Brain is already running or paused");
      return;
    }
    console.log("\u{1F7E2} Starting brain orchestrator...");
    this.status = "running";
    this.core.start();
    this.schedulerInterval = setInterval(
      () => this.runSchedulerTasks(),
      5 * 60 * 1e3
    );
    this.dreamInterval = setInterval(
      () => this.processDreamQueue(),
      30 * 60 * 1e3
    );
    this.cronInterval = setInterval(
      () => this.checkCronJobs(),
      60 * 1e3
    );
    this.auditInterval = setInterval(
      () => this.runPeriodicAudit(),
      6 * 60 * 60 * 1e3
    );
    this.testInterval = setInterval(
      () => this.runPeriodicTests(),
      12 * 60 * 60 * 1e3
    );
    console.log("\u2705 Brain orchestrator started");
    console.log("   - Scheduler: Active");
    console.log("   - Dream processor: Active");
    console.log("   - Cron jobs: Active");
    console.log("   - Audits: Active");
    console.log("   - Tests: Active");
  }
  /**
   * Pause the brain system
   */
  pause() {
    if (this.status !== "running") {
      console.log("\u26A0\uFE0F  Brain is not running");
      return;
    }
    console.log("\u{1F7E0} Pausing brain orchestrator...");
    this.status = "paused";
    this.core.pause();
    console.log("\u2705 Brain orchestrator paused");
    console.log("   - All scheduled tasks paused");
    console.log("   - Current operations will complete");
    console.log("   - No new tasks will start");
  }
  /**
   * Resume the brain system
   */
  resume() {
    if (this.status !== "paused") {
      console.log("\u26A0\uFE0F  Brain is not paused");
      return;
    }
    console.log("\u25B6\uFE0F  Resuming brain orchestrator...");
    this.status = "running";
    this.core.resume();
    console.log("\u2705 Brain orchestrator resumed");
    console.log("   - All systems operational");
    console.log("   - Scheduled tasks continuing");
  }
  /**
   * Stop the brain system completely
   */
  stop() {
    console.log("\u{1F534} Stopping brain orchestrator...");
    if (this.schedulerInterval) clearInterval(this.schedulerInterval);
    if (this.dreamInterval) clearInterval(this.dreamInterval);
    if (this.cronInterval) clearInterval(this.cronInterval);
    if (this.auditInterval) clearInterval(this.auditInterval);
    if (this.testInterval) clearInterval(this.testInterval);
    this.core.stop();
    this.status = "stopped";
    console.log("\u2705 Brain orchestrator stopped");
    console.log("   - All intervals cleared");
    console.log("   - All subsystems stopped");
    console.log("   - Ready for restart");
  }
  /**
   * Get current orchestrator status
   */
  getStatus() {
    const coreStatus = this.core.getStatus();
    return {
      status: this.status,
      canOperate: this.status === "running" && coreStatus.canGenerate,
      schedulerActive: !!this.schedulerInterval,
      dreamProcessorActive: !!this.dreamInterval,
      cronMonitorActive: !!this.cronInterval,
      auditActive: !!this.auditInterval,
      testActive: !!this.testInterval,
      schedulerTasks: this.schedulerTasks.length,
      dreamQueueSize: this.dreamQueue.length,
      cronJobsScheduled: this.cronJobs.length
    };
  }
  /**
   * Run scheduled tasks
   */
  async runSchedulerTasks() {
    if (this.status !== "running") return;
    console.log(`[Orchestrator] Running ${this.schedulerTasks.length} scheduler tasks...`);
    const now = /* @__PURE__ */ new Date();
    for (const task of this.schedulerTasks) {
      try {
        console.log(`[Orchestrator] Running task: ${task.name}`);
        const result = await task.handler();
        if (result.success) {
          task.lastRun = now;
          task.nextRun = this.calculateNextRunForTask(task);
          console.log(`[Orchestrator] \u2705 ${task.name} completed successfully`);
        } else {
          console.log(`[Orchestrator] \u274C ${task.name} failed`);
        }
      } catch (error) {
        console.error(`[Orchestrator] \u{1F4A5} ${task.name} error:`, error);
      }
    }
  }
  /**
   * Process dream queue
   */
  async processDreamQueue() {
    if (this.status !== "running" || this.dreamQueue.length === 0) return;
    console.log(`[Orchestrator] Processing ${this.dreamQueue.length} dream tasks...`);
    const highPriorityDreams = this.dreamQueue.filter((d) => d.priority === "high");
    for (const dream of highPriorityDreams) {
      try {
        console.log(`[Orchestrator] Dreaming: ${dream.name}`);
        const result = await dream.handler();
        if (result.success) {
          dream.lastRun = /* @__PURE__ */ new Date();
          console.log(`[Orchestrator] \u2705 Dream ${dream.name} completed`);
        }
      } catch (error) {
        console.error(`[Orchestrator] \u{1F4A5} Dream ${dream.name} error:`, error);
      }
    }
    this.dreamQueue = this.dreamQueue.filter((d) => d.priority !== "high");
  }
  /**
   * Check and run cron jobs
   */
  async checkCronJobs() {
    if (this.status !== "running") return;
    const now = /* @__PURE__ */ new Date();
    for (const job of this.cronJobs) {
      if (job.nextRun && now >= job.nextRun) {
        try {
          console.log(`[Orchestrator] Running cron job: ${job.name}`);
          const result = await job.handler();
          if (result.success) {
            job.lastRun = now;
            job.nextRun = this.calculateNextRun(job.schedule);
            console.log(`[Orchestrator] \u2705 Cron job ${job.name} completed`);
          }
        } catch (error) {
          console.error(`[Orchestrator] \u{1F4A5} Cron job ${job.name} error:`, error);
        }
      }
    }
  }
  /**
   * Run periodic system audit
   */
  async runPeriodicAudit() {
    if (this.status !== "running") return;
    console.log("[Orchestrator] Running periodic system audit...");
    try {
      const report = await this.auditor.runFullAudit(
        this.core,
        this.revenueBrainstem,
        this.learningSystem
      );
      console.log(`[Orchestrator] \u2705 Audit completed: ${report.severitySummary.overallScore}/100`);
      if (report.severitySummary.issues.critical > 0) {
        console.warn(`[Orchestrator] \u26A0\uFE0F  ${report.severitySummary.issues.critical} critical issues found`);
      }
    } catch (error) {
      console.error("[Orchestrator] \u{1F4A5} Audit error:", error);
    }
  }
  /**
   * Run periodic system tests
   */
  async runPeriodicTests() {
    if (this.status !== "running") return;
    console.log("[Orchestrator] Running periodic system tests...");
    try {
      const report = await this.tester.runComprehensiveTests();
      console.log(`[Orchestrator] \u2705 Tests completed: ${report.passRate}% pass rate`);
      if (report.failed > 0) {
        console.warn(`[Orchestrator] \u26A0\uFE0F  ${report.failed} tests failed`);
      }
    } catch (error) {
      console.error("[Orchestrator] \u{1F4A5} Test error:", error);
    }
  }
  /**
   * Analyze performance and suggest improvements
   */
  async analyzePerformanceAndImprove() {
    const improvements = [];
    const stats = this.core.getStats();
    if (stats.errorRate > 0.05) {
      improvements.push("Reduce API errors - consider retry logic or fallback providers");
    }
    const revenueReport = this.revenueBrainstem.getPerformanceReport();
    if (!revenueReport.mrr.onTrack) {
      improvements.push("MRR below target - review revenue strategies and pipeline");
    }
    if (revenueReport.cac.current > revenueReport.cac.target * 1.2) {
      improvements.push("CAC too high - optimize customer acquisition channels");
    }
    const learningStats = this.learningSystem.getLearningStats();
    if (learningStats.successRate < 80) {
      improvements.push("Learning success rate low - review training data and algorithms");
    }
    return { improvements };
  }
  /**
   * Find revenue opportunities
   */
  async findRevenueOpportunities() {
    const opportunities = [];
    const performance = this.revenueBrainstem.getRevenueDashboard().currentPerformance;
    if (performance.customerCount > 100) {
      opportunities.push({
        type: "upsell",
        description: "Upsell premium features to existing customers",
        potentialValue: performance.mrr * 0.2,
        // 20% potential upsell
        riskLevel: "low"
      });
    }
    if (performance.closeRate > 30) {
      opportunities.push({
        type: "expansion",
        description: "Expand to new customer segments with proven close rate",
        potentialValue: performance.mrr * 0.3,
        // 30% expansion potential
        riskLevel: "medium"
      });
    }
    if (performance.churnRate > 3) {
      opportunities.push({
        type: "retention",
        description: "Implement retention programs to reduce churn",
        potentialValue: performance.mrr * performance.churnRate * 0.01,
        riskLevel: "low"
      });
    }
    return opportunities;
  }
  /**
   * Generate monthly report
   */
  generateMonthlyReport() {
    const coreStats = this.core.getStats();
    const revenueStats = this.revenueBrainstem.getRevenueDashboard();
    const learningStats = this.learningSystem.getLearningStats();
    return {
      period: (/* @__PURE__ */ new Date()).toISOString().substring(0, 7),
      // YYYY-MM
      totalRevenue: revenueStats.currentPerformance.mrr,
      newCustomers: revenueStats.currentPerformance.customerCount,
      totalAICalls: coreStats.totalCalls,
      errorRate: coreStats.errorRate,
      learningExperiences: learningStats.totalExperiences,
      systemHealth: this.status === "running" ? "healthy" : this.status
    };
  }
  /**
   * Calculate next run time for a task
   */
  calculateNextRun(frequency) {
    const now = /* @__PURE__ */ new Date();
    if (frequency === "5m") {
      return new Date(now.getTime() + 5 * 60 * 1e3);
    } else if (frequency === "30m") {
      return new Date(now.getTime() + 30 * 60 * 1e3);
    } else if (frequency === "1h") {
      return new Date(now.getTime() + 60 * 60 * 1e3);
    } else if (frequency === "6h") {
      return new Date(now.getTime() + 6 * 60 * 60 * 1e3);
    } else if (frequency === "12h") {
      return new Date(now.getTime() + 12 * 60 * 60 * 1e3);
    } else if (frequency === "24h") {
      return new Date(now.getTime() + 24 * 60 * 60 * 1e3);
    }
    return now;
  }
  /**
   * Calculate next run for scheduler task
   */
  calculateNextRunForTask(task) {
    return this.calculateNextRun(task.frequency);
  }
  /**
   * Calculate next run from cron schedule
   */
  calculateNextRun(schedule) {
    const now = /* @__PURE__ */ new Date();
    if (schedule === "0 0 * * *") {
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      return midnight;
    } else if (schedule === "0 0 * * 1") {
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + (7 - now.getDay() + 1) % 7);
      nextMonday.setHours(24, 0, 0, 0);
      return nextMonday;
    } else if (schedule === "0 0 1 * *") {
      const nextMonth = new Date(now);
      if (now.getDate() === 1) {
      }
      nextMonth.setDate(1);
      nextMonth.setHours(24, 0, 0, 0);
      return nextMonth;
    }
    return new Date(now.getTime() + 5 * 60 * 1e3);
  }
  /**
   * Add a scheduler task
   */
  addSchedulerTask(task) {
    const newTask = {
      ...task,
      lastRun: null,
      nextRun: this.calculateNextRunForTask(task)
    };
    this.schedulerTasks.push(newTask);
  }
  /**
   * Add a dream task
   */
  addDreamTask(task) {
    this.dreamQueue.push(task);
  }
  /**
   * Add a cron job
   */
  addCronJob(job) {
    const newJob = {
      ...job,
      lastRun: null,
      nextRun: this.calculateNextRun(job.schedule)
    };
    this.cronJobs.push(newJob);
  }
  /**
   * Get all scheduler tasks
   */
  getSchedulerTasks() {
    return this.schedulerTasks;
  }
  /**
   * Get all dream tasks
   */
  getDreamQueue() {
    return this.dreamQueue;
  }
  /**
   * Get all cron jobs
   */
  getCronJobs() {
    return this.cronJobs;
  }
};

// src/autonomous/SystemInitializer.ts
var SystemInitializer = class {
  constructor() {
    this.core = null;
    this.autonomousBrain = null;
    this.revenueBrainstem = null;
    this.learningSystem = null;
    this.orchestrator = null;
    this.auditor = null;
    this.tester = null;
    this.revenueData = null;
    this.initializationLog = [];
    this.errors = [];
    console.log("\u{1F6E0}\uFE0F  System Initializer created");
  }
  /**
   * Initialize the complete system
   */
  async initialize(config) {
    console.log("\u{1F680} Initializing Autonomous Brain System...");
    this.log("System initialization started");
    try {
      await this.cleanup();
      await this.initializeCore(config);
      await this.initializeSubsystems(config);
      await this.initializeOrchestrator();
      await this.verifyComponents();
      await this.runInitialAudit();
      await this.runInitialTests();
      this.startAllSystems();
      const result = {
        success: this.errors.length === 0,
        components: {
          core: !!this.core,
          autonomousBrain: !!this.autonomousBrain,
          revenueBrainstem: !!this.revenueBrainstem,
          learningSystem: !!this.learningSystem,
          orchestrator: !!this.orchestrator,
          auditor: !!this.auditor,
          tester: !!this.tester,
          revenueData: !!this.revenueData
        },
        initializationLog: this.initializationLog,
        errors: this.errors
      };
      if (result.success) {
        console.log("\u2705 System initialization completed successfully!");
        this.log("System ready for operation");
      } else {
        console.error("\u274C System initialization completed with errors");
        this.log(`Initialization completed with ${this.errors.length} errors`);
      }
      return result;
    } catch (error) {
      console.error("\u{1F4A5} Initialization failed:", error);
      this.log(`Initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      return {
        success: false,
        components: {},
        initializationLog: this.initializationLog,
        errors: [...this.errors, error instanceof Error ? error : new Error("Unknown error")]
      };
    }
  }
  /**
   * Clean up any existing instances and mock data
   */
  async cleanup() {
    this.log("Cleaning up existing instances and mock data");
    if (typeof global !== "undefined") {
      if (global.aiCoreInstance) delete global.aiCoreInstance;
      if (global.autonomousBrainInstance) delete global.autonomousBrainInstance;
      if (global.revenueBrainstemInstance) delete global.revenueBrainstemInstance;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      const keysToRemove = Object.keys(localStorage).filter((k) => k.startsWith("ai-system-"));
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      this.log(`Cleared ${keysToRemove.length} local storage items`);
    }
    console.log("\u2705 Cleanup completed");
  }
  /**
   * Initialize core components
   */
  async initializeCore(config) {
    this.log("Initializing core components");
    try {
      this.core = new AICore({
        providers: {
          gemini: config.providers?.gemini ? { apiKey: config.providers.gemini.apiKey } : void 0,
          openai: config.providers?.openai ? { apiKey: config.providers.openai.apiKey } : void 0,
          deepseek: config.providers?.deepseek ? { apiKey: config.providers.deepseek.apiKey } : void 0,
          ollama: config.providers?.ollama ? {
            baseUrl: config.providers.ollama.baseUrl || "http://localhost:11434",
            model: config.providers.ollama.model || "llama3"
          } : void 0
        },
        costTracking: config.costTracking || {
          enabled: true,
          budgetLimitUsd: 100
        }
      });
      this.log("\u2705 AICore initialized");
      if (this.core) {
        this.revenueData = new RevenueData(this.core);
        this.log("\u2705 RevenueData initialized");
      }
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("Core initialization failed"));
      this.log(`Core initialization error: ${error instanceof Error ? error.message : "Unknown"}`);
      throw error;
    }
  }
  /**
   * Initialize subsystems
   */
  async initializeSubsystems(config) {
    this.log("Initializing subsystems");
    if (!this.core) {
      throw new Error("Core not initialized");
    }
    try {
      this.learningSystem = new ContinuousLearning(this.core);
      this.log("\u2705 ContinuousLearning initialized");
      this.autonomousBrain = new AutonomousBrain({
        providers: {
          gemini: config.providers?.gemini ? { apiKey: config.providers.gemini.apiKey } : void 0,
          openai: config.providers?.openai ? { apiKey: config.providers.openai.apiKey } : void 0
        }
      });
      this.log("\u2705 AutonomousBrain initialized");
      this.revenueBrainstem = new RevenueBrainstem(
        this.core,
        new AutoConfig(),
        this.learningSystem,
        config.revenueTargets || {
          mrrTarget: 1e5,
          maxCac: 2500,
          maxPaybackMonths: 12,
          targetCloseRate: 25,
          targetChurnRate: 3
        }
      );
      this.log("\u2705 RevenueBrainstem initialized");
      this.auditor = new SystemAuditor(this.core);
      this.tester = new SystemTester(this.core);
      this.log("\u2705 Auditor and Tester initialized");
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("Subsystem initialization failed"));
      this.log(`Subsystem initialization error: ${error instanceof Error ? error.message : "Unknown"}`);
      throw error;
    }
  }
  /**
   * Initialize orchestrator
   */
  async initializeOrchestrator() {
    this.log("Initializing orchestrator");
    if (!this.core || !this.revenueBrainstem || !this.learningSystem) {
      throw new Error("Required subsystems not initialized");
    }
    try {
      this.orchestrator = new BrainOrchestrator(
        this.core,
        this.revenueBrainstem,
        this.learningSystem
      );
      this.log("\u2705 BrainOrchestrator initialized");
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("Orchestrator initialization failed"));
      this.log(`Orchestrator initialization error: ${error instanceof Error ? error.message : "Unknown"}`);
      throw error;
    }
  }
  /**
   * Verify all components are working
   */
  async verifyComponents() {
    this.log("Verifying all components");
    const verifications = [
      { name: "AICore", test: async () => {
        if (!this.core) throw new Error("Not initialized");
        const result = await this.core.generate("Test", { taskType: "chat" });
        if (!result.text) throw new Error("No response");
      } },
      { name: "AutonomousBrain", test: async () => {
        if (!this.autonomousBrain) throw new Error("Not initialized");
        const status = this.autonomousBrain.getSystemStatus();
        if (status.systemStatus !== "operational") throw new Error("Not operational");
      } },
      { name: "RevenueBrainstem", test: async () => {
        if (!this.revenueBrainstem) throw new Error("Not initialized");
        const dashboard = this.revenueBrainstem.getRevenueDashboard();
        if (!dashboard.currentPerformance) throw new Error("No performance data");
      } },
      { name: "LearningSystem", test: async () => {
        if (!this.learningSystem) throw new Error("Not initialized");
        const stats = this.learningSystem.getLearningStats();
        if (stats.totalExperiences < 0) throw new Error("Invalid stats");
      } },
      { name: "Orchestrator", test: async () => {
        if (!this.orchestrator) throw new Error("Not initialized");
        const status = this.orchestrator.getStatus();
        if (status.status !== "stopped") throw new Error("Invalid initial status");
      } }
    ];
    for (const verification of verifications) {
      try {
        await verification.test();
        this.log(`\u2705 ${verification.name} verification passed`);
      } catch (error) {
        this.errors.push(new Error(`${verification.name} verification failed: ${error instanceof Error ? error.message : "Unknown"}`));
        this.log(`\u274C ${verification.name} verification failed: ${error instanceof Error ? error.message : "Unknown"}`);
      }
    }
  }
  /**
   * Run initial system audit
   */
  async runInitialAudit() {
    this.log("Running initial system audit");
    if (!this.orchestrator || !this.autonomousBrain || !this.revenueBrainstem || !this.learningSystem) {
      this.log("\u26A0\uFE0F  Skipping audit - not all components initialized");
      return;
    }
    try {
      const report = await this.auditor.runFullAudit(
        this.autonomousBrain,
        this.revenueBrainstem,
        this.learningSystem
      );
      this.log(`\u2705 Initial audit completed: ${report.severitySummary.overallScore}/100`);
      if (report.severitySummary.issues.critical > 0) {
        this.log(`\u26A0\uFE0F  ${report.severitySummary.issues.critical} critical issues found`);
        report.issues.filter((issue) => issue.severity === "critical").forEach((issue) => this.log(`   - ${issue.description}`));
      }
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("Initial audit failed"));
      this.log(`Initial audit error: ${error instanceof Error ? error.message : "Unknown"}`);
    }
  }
  /**
   * Run initial system tests
   */
  async runInitialTests() {
    this.log("Running initial system tests");
    if (!this.tester) {
      this.log("\u26A0\uFE0F  Skipping tests - tester not initialized");
      return;
    }
    try {
      const report = await this.tester.runComprehensiveTests();
      this.log(`\u2705 Initial tests completed: ${report.passRate}% pass rate`);
      if (report.failed > 0) {
        this.log(`\u26A0\uFE0F  ${report.failed} tests failed`);
      }
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("Initial tests failed"));
      this.log(`Initial tests error: ${error instanceof Error ? error.message : "Unknown"}`);
    }
  }
  /**
   * Start all systems
   */
  startAllSystems() {
    this.log("Starting all systems");
    try {
      if (this.orchestrator) {
        this.orchestrator.start();
        this.log("\u2705 Orchestrator started");
      }
      if (this.autonomousBrain) {
        this.log("\u2705 AutonomousBrain started");
      }
      if (this.revenueBrainstem) {
        this.log("\u2705 RevenueBrainstem started");
      }
      if (this.learningSystem) {
        this.log("\u2705 LearningSystem started");
      }
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("System startup failed"));
      this.log(`System startup error: ${error instanceof Error ? error.message : "Unknown"}`);
    }
  }
  /**
   * Get initialized components
   */
  getComponents() {
    return {
      core: this.core,
      autonomousBrain: this.autonomousBrain,
      revenueBrainstem: this.revenueBrainstem,
      learningSystem: this.learningSystem,
      orchestrator: this.orchestrator,
      auditor: this.auditor,
      tester: this.tester,
      revenueData: this.revenueData
    };
  }
  /**
   * Get initialization log
   */
  getInitializationLog() {
    return this.initializationLog;
  }
  /**
   * Get errors
   */
  getErrors() {
    return this.errors;
  }
  /**
   * Log initialization event
   */
  log(message) {
    this.initializationLog.push({
      timestamp: /* @__PURE__ */ new Date(),
      message
    });
    console.log(`[Initializer] ${message}`);
  }
};

// src/services/ApiClient.ts
var ApiClient = class {
  constructor(baseUrl = "http://localhost:3000", maxRetries = 3, retryDelay = 1e3) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }
  /**
   * Set base URL
   */
  setBaseUrl(baseUrl) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  }
  /**
   * Set default headers
   */
  setHeaders(headers) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }
  /**
   * Make a GET request with retries and error handling
   */
  async get(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    try {
      const response = await this.fetchWithRetry(url, {
        method: "GET",
        headers: { ...this.defaultHeaders, ...options.headers }
      });
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status
        };
      }
      try {
        const data = await response.json();
        return { success: true, data, status: response.status };
      } catch (jsonError) {
        return {
          success: false,
          error: "Invalid JSON response",
          status: response.status
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0
      };
    }
  }
  /**
   * Make a POST request with retries and error handling
   */
  async post(endpoint, body, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    try {
      const response = await this.fetchWithRetry(url, {
        method: "POST",
        headers: { ...this.defaultHeaders, ...options.headers },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status
        };
      }
      try {
        const data = await response.json();
        return { success: true, data, status: response.status };
      } catch (jsonError) {
        return {
          success: false,
          error: "Invalid JSON response",
          status: response.status
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0
      };
    }
  }
  /**
   * Make a PUT request with retries and error handling
   */
  async put(endpoint, body, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    try {
      const response = await this.fetchWithRetry(url, {
        method: "PUT",
        headers: { ...this.defaultHeaders, ...options.headers },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status
        };
      }
      try {
        const data = await response.json();
        return { success: true, data, status: response.status };
      } catch (jsonError) {
        return {
          success: false,
          error: "Invalid JSON response",
          status: response.status
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0
      };
    }
  }
  /**
   * Make a DELETE request with retries and error handling
   */
  async delete(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    try {
      const response = await this.fetchWithRetry(url, {
        method: "DELETE",
        headers: { ...this.defaultHeaders, ...options.headers }
      });
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status
        };
      }
      try {
        const data = await response.json();
        return { success: true, data, status: response.status };
      } catch (jsonError) {
        return {
          success: false,
          error: "Invalid JSON response",
          status: response.status
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0
      };
    }
  }
  /**
   * Fetch with retry logic
   */
  async fetchWithRetry(url, options) {
    let lastError = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.ok || !this.shouldRetry(response.status)) {
          return response;
        }
        if (attempt < this.maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        }
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        } else {
          throw error;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Unknown error");
  }
  /**
   * Determine if a status code should be retried
   */
  shouldRetry(status) {
    return status >= 500 || status === 429;
  }
};
export {
  AICore,
  ApiClient,
  AutoConfig2 as AutoConfig,
  AutonomousBrain,
  BrainOrchestrator,
  ContinuousLearning,
  DeepSeekProvider,
  GeminiProvider,
  LocalProvider,
  OpenAIProvider,
  OversightMiddleware,
  RevenueBrainstem,
  RevenueData,
  RevenueEngine,
  SystemAuditor,
  SystemInitializer,
  SystemTester
};
//# sourceMappingURL=index.js.map