import { GoogleGenAI } from "@google/genai"
import { ProviderType, GenerateOptions, GenerateResult, Message } from "../types"

export class GeminiProvider {
  private client: GoogleGenAI | null = null
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey })
    }
    return this.client
  }

  async generate(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<GenerateResult> {
    const start = Date.now()
    const client = this.getClient()
    const model = options.model || "gemini-2.0-flash"

    const contents = options.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt

    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
        responseMimeType: options.responseFormat === "json" ? "application/json" : undefined,
      },
    })

    const text = response.text || ""
    const latencyMs = Date.now() - start

    return {
      text,
      provider: "gemini" as ProviderType,
      model,
      tokensUsed: response.usageMetadata?.totalTokenCount,
      costUsd: this.estimateCost(model, response.usageMetadata?.totalTokenCount || 0),
      latencyMs,
    }
  }

  async chat(messages: Message[], options: GenerateOptions = {}): Promise<GenerateResult> {
    const start = Date.now()
    const client = this.getClient()
    const model = options.model || "gemini-2.0-flash"

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }],
    }))

    const chat = client.chats.create({
      model,
      config: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    })

    const lastMessage = messages[messages.length - 1]
    const response = await chat.sendMessage({ message: lastMessage.content })

    const text = response.text || ""
    const latencyMs = Date.now() - start

    return {
      text,
      provider: "gemini" as ProviderType,
      model,
      tokensUsed: response.usageMetadata?.totalTokenCount,
      costUsd: this.estimateCost(model, response.usageMetadata?.totalTokenCount || 0),
      latencyMs,
    }
  }

  private estimateCost(model: string, tokens: number): number {
    const pricePer1K = model.includes("pro") ? 0.0035 : 0.0001
    return (tokens / 1000) * pricePer1K
  }
}
