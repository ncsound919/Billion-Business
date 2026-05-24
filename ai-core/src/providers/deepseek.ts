import { ProviderType, GenerateOptions, GenerateResult } from "../types"

export class DeepSeekProvider {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.baseUrl = "https://api.deepseek.com/v1/chat/completions"
  }

  async generate(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<GenerateResult> {
    const start = Date.now()
    const model = options.model || "deepseek-chat"

    const messages: Array<{ role: string; content: string }> = []
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt })
    }
    messages.push({ role: "user", content: prompt })

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "No details")
      throw new Error(`DeepSeek API failed with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ""
    const latencyMs = Date.now() - start
    const tokensUsed = data.usage?.total_tokens

    return {
      text,
      provider: "deepseek" as ProviderType,
      model,
      tokensUsed,
      costUsd: this.estimateCost(tokensUsed || 0),
      latencyMs,
    }
  }

  private estimateCost(tokens: number): number {
    return (tokens / 1000) * 0.00014
  }
}
