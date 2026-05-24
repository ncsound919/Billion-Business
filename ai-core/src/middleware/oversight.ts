import { EscalationPayload, OversightMode } from "../types"

export class OversightMiddleware {
  private mode: OversightMode
  private confidenceThreshold: number
  private onEscalate?: (payload: EscalationPayload) => Promise<boolean>
  private queue: Array<EscalationPayload & { id: string; createdAt: Date }> = []
  private history: Array<EscalationPayload & { id: string; status: "approved" | "rejected"; resolvedAt: Date }> = []

  constructor(config: {
    mode?: OversightMode
    confidenceThreshold?: number
    onEscalate?: (payload: EscalationPayload) => Promise<boolean>
  } = {}) {
    this.mode = config.mode || "checkpoint"
    this.confidenceThreshold = config.confidenceThreshold ?? 0.7
    this.onEscalate = config.onEscalate
  }

  async shouldProceed(payload: EscalationPayload): Promise<boolean> {
    if (this.mode === "shadow") {
      return payload.confidence >= this.confidenceThreshold && payload.risk !== "critical"
    }

    if (this.mode === "recovery") {
      return false
    }

    if (this.mode === "checkpoint") {
      if (this.onEscalate) {
        return await this.onEscalate(payload)
      }
      return this.autoApprove(payload)
    }

    return true
  }

  private autoApprove(payload: EscalationPayload): boolean {
    if (payload.risk === "critical") return false
    if (payload.confidence >= 0.9 && payload.risk === "low") return true
    return false
  }

  enqueue(payload: EscalationPayload): string {
    const id = `ESC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    this.queue.push({ ...payload, id, createdAt: new Date() })
    return id
  }

  approve(id: string) {
    const idx = this.queue.findIndex((q) => q.id === id)
    if (idx !== -1) {
      const item = this.queue[idx]
      this.history.push({ ...item, status: "approved", resolvedAt: new Date() })
      this.queue.splice(idx, 1)
    }
  }

  reject(id: string) {
    const idx = this.queue.findIndex((q) => q.id === id)
    if (idx !== -1) {
      const item = this.queue[idx]
      this.history.push({ ...item, status: "rejected", resolvedAt: new Date() })
      this.queue.splice(idx, 1)
    }
  }

  getQueue() {
    return [...this.queue]
  }

  getHistory() {
    return [...this.history]
  }

  setMode(mode: OversightMode) {
    this.mode = mode
  }

  getMode() {
    return this.mode
  }

  getStats() {
    return {
      pending: this.queue.length,
      approved: this.history.filter((h) => h.status === "approved").length,
      rejected: this.history.filter((h) => h.status === "rejected").length,
      mode: this.mode,
    }
  }
}
