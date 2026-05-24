import OpenAI from "openai"
import { ProviderType, GenerateOptions, GenerateResult, Message } from "../types"

export class OpenAIProvider {
  private client: OpenAI

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true,
    })
  }

  async generate(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<GenerateResult> {
    const start = Date.now()
    const model = options.model || "gpt-4o"

    const messages: OpenAI.ChatCompletionMessageParam[] = []
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt })
    }
    messages.push({ role: "user", content: prompt })

    const response = await this.client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      response_format: options.responseFormat === "json" ? { type: "json_object" } : undefined,
    })

    const text = response.choices[0]?.message?.content || ""
    const latencyMs = Date.now() - start
    const tokensUsed = response.usage?.total_tokens

    return {
      text,
      provider: "openai" as ProviderType,
      model,
      tokensUsed,
      costUsd: this.estimateCost(model, tokensUsed || 0),
      latencyMs,
    }
  }

  async chat(messages: Message[], options: GenerateOptions = {}): Promise<GenerateResult> {
    const start = Date.now()
    const model = options.model || "gpt-4o"

    const oaiMessages: Array<{ role: string; content: string }> = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
      content: m.content,
    }))

    const response = await this.client.chat.completions.create({
      model,
      messages: oaiMessages as any,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    })

    const text = response.choices[0]?.message?.content || ""
    const latencyMs = Date.now() - start
    const tokensUsed = response.usage?.total_tokens

    return {
      text,
      provider: "openai" as ProviderType,
      model,
      tokensUsed,
      costUsd: this.estimateCost(model, tokensUsed || 0),
      latencyMs,
    }
  }

  private estimateCost(model: string, tokens: number): number {
    const prices: Record<string, number> = {
      "gpt-4o": 0.005,
      "gpt-4o-mini": 0.00015,
      "o3": 0.01,
      "o3-mini": 0.0011,
    }
    const pricePer1K = prices[model] || 0.005
    return (tokens / 1000) * pricePer1K
  }
}
