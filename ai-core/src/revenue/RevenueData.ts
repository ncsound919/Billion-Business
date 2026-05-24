import { AICore } from "../AICore"

/**
 * Revenue Data Integration Layer
 * Connects to CRM, payment processors, analytics, and other revenue data sources
 */
export class RevenueData {
  private core: AICore
  private connectedSources: RevenueDataSource[] = []
  private dataCache: RevenueDataCache = {
    customers: [],
    transactions: [],
    opportunities: [],
    metrics: [],
  }
  
  constructor(core: AICore) {
    this.core = core
  }
  
  /**
   * Connect to a data source
   */
  async connectSource(source: RevenueDataSourceConfig): Promise<RevenueDataSource> {
    console.log(`🔌 Connecting to ${source.type} data source...`)
    
    // Validate connection
    if (!source.apiKey && !source.connectionString) {
      throw new Error(`No credentials provided for ${source.type} source`)
    }
    
    // Simulate connection (in production, this would be real API calls)
    const connectedSource: RevenueDataSource = {
      id: `source_${Date.now()}`,
      type: source.type,
      name: source.name,
      status: "connected",
      lastSync: new Date(),
      connectedAt: new Date(),
      config: {
        apiKey: source.apiKey ? "*****" : undefined,
        connectionString: source.connectionString ? "*****" : undefined,
      },
    }
    
    this.connectedSources.push(connectedSource)
    
    // Initial sync
    await this.syncSource(connectedSource.id)
    
    console.log(`✅ Connected to ${source.type}: ${source.name}`)
    return connectedSource
  }
  
  /**
   * Sync data from a source
   */
  async syncSource(sourceId: string): Promise<DataSyncResult> {
    const source = this.connectedSources.find(s => s.id === sourceId)
    if (!source) {
      throw new Error(`Source ${sourceId} not found`)
    }
    
    console.log(`🔄 Syncing data from ${source.name}...`)
    
    // Simulate data sync (in production, this would be real API calls)
    const syncTime = 1000 + Math.random() * 3000 // 1-4 seconds
    await new Promise(resolve => setTimeout(resolve, syncTime))
    
    // Simulate data updates
    const newRecords = this.simulateDataSync(source.type)
    
    // Update cache
    this.updateDataCache(source.type, newRecords)
    
    // Update source status
    source.lastSync = new Date()
    source.status = "connected"
    
    console.log(`✅ Synced ${newRecords.customers + newRecords.transactions + newRecords.opportunities} records from ${source.name}`)
    
    return {
      sourceId: source.id,
      recordsSynced: newRecords.customers + newRecords.transactions + newRecords.opportunities,
      syncTimeMs: syncTime,
      lastSync: source.lastSync,
    }
  }
  
  /**
   * Simulate data sync based on source type
   */
  private simulateDataSync(sourceType: string): SimulatedSyncData {
    switch (sourceType) {
      case "stripe":
        return {
          customers: Math.floor(Math.random() * 10) + 5,
          transactions: Math.floor(Math.random() * 50) + 20,
          opportunities: 0,
        }
      case "hubspot":
      case "salesforce":
        return {
          customers: Math.floor(Math.random() * 5) + 2,
          transactions: 0,
          opportunities: Math.floor(Math.random() * 15) + 5,
        }
      case "google_analytics":
        return {
          customers: 0,
          transactions: Math.floor(Math.random() * 30) + 10,
          opportunities: Math.floor(Math.random() * 8) + 2,
        }
      case "postgres":
      case "bigquery":
        return {
          customers: Math.floor(Math.random() * 15) + 5,
          transactions: Math.floor(Math.random() * 40) + 15,
          opportunities: Math.floor(Math.random() * 10) + 3,
        }
      default:
        return {
          customers: Math.floor(Math.random() * 5),
          transactions: Math.floor(Math.random() * 20),
          opportunities: Math.floor(Math.random() * 5),
        }
    }
  }
  
  /**
   * Update data cache with new records
   */
  private updateDataCache(sourceType: string, newRecords: SimulatedSyncData) {
    // Simulate adding new records to cache
    for (let i = 0; i < newRecords.customers; i++) {
      this.dataCache.customers.push(this.generateSimulatedCustomer())
    }
    
    for (let i = 0; i < newRecords.transactions; i++) {
      this.dataCache.transactions.push(this.generateSimulatedTransaction())
    }
    
    for (let i = 0; i < newRecords.opportunities; i++) {
      this.dataCache.opportunities.push(this.generateSimulatedOpportunity())
    }
    
    // Update metrics
    this.updateMetrics()
  }
  
  /**
   * Update calculated metrics
   */
  private updateMetrics() {
    // Calculate MRR
    const activeSubscriptions = this.dataCache.transactions.filter(t => t.type === "subscription" && t.status === "active")
    const mrr = activeSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0)
    
    // Calculate customer count
    const customerCount = new Set(this.dataCache.customers.map(c => c.id)).size
    
    // Calculate average CAC
    const paidCustomers = this.dataCache.customers.filter(c => c.status === "paid")
    const totalAcquisitionCost = paidCustomers.reduce((sum, cust) => sum + (cust.acquisitionCost || 0), 0)
    const cac = customerCount > 0 ? totalAcquisitionCost / customerCount : 0
    
    // Calculate close rate
    const closedOpportunities = this.dataCache.opportunities.filter(o => o.status === "closed_won" || o.status === "closed_lost")
    const closeRate = closedOpportunities.length > 0
      ? (closedOpportunities.filter(o => o.status === "closed_won").length / closedOpportunities.length) * 100
      : 0
    
    this.dataCache.metrics = [
      { name: "mrr", value: mrr, lastUpdated: new Date() },
      { name: "customer_count", value: customerCount, lastUpdated: new Date() },
      { name: "cac", value: cac, lastUpdated: new Date() },
      { name: "close_rate", value: closeRate, lastUpdated: new Date() },
      { name: "churn_rate", value: this.calculateChurnRate(), lastUpdated: new Date() },
    ]
  }
  
  /**
   * Calculate churn rate
   */
  private calculateChurnRate(): number {
    // Simple churn calculation - in production this would be more sophisticated
    const churnedCustomers = this.dataCache.customers.filter(c => c.status === "churned").length
    const totalCustomers = this.dataCache.customers.length
    return totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0
  }
  
  /**
   * Get revenue metrics
   */
  getMetrics(): RevenueMetric[] {
    return this.dataCache.metrics
  }
  
  /**
   * Get metric by name
   */
  getMetric(name: string): RevenueMetric | undefined {
    return this.dataCache.metrics.find(m => m.name === name)
  }
  
  /**
   * Get customers
   */
  getCustomers(filter?: CustomerFilter): Customer[] {
    if (!filter) return this.dataCache.customers
    
    return this.dataCache.customers.filter(customer => {
      return (!filter.status || customer.status === filter.status) &&
             (!filter.source || customer.source === filter.source) &&
             (!filter.minMrr || (customer.mrr || 0) >= filter.minMrr) &&
             (!filter.maxMrr || (customer.mrr || 0) <= filter.maxMrr)
    })
  }
  
  /**
   * Get transactions
   */
  getTransactions(filter?: TransactionFilter): Transaction[] {
    if (!filter) return this.dataCache.transactions
    
    return this.dataCache.transactions.filter(transaction => {
      return (!filter.type || transaction.type === filter.type) &&
             (!filter.status || transaction.status === filter.status) &&
             (!filter.minAmount || (transaction.amount || 0) >= filter.minAmount) &&
             (!filter.maxAmount || (transaction.amount || 0) <= filter.maxAmount) &&
             (!filter.startDate || new Date(transaction.date) >= filter.startDate) &&
             (!filter.endDate || new Date(transaction.date) <= filter.endDate)
    })
  }
  
  /**
   * Get opportunities
   */
  getOpportunities(filter?: OpportunityFilter): Opportunity[] {
    if (!filter) return this.dataCache.opportunities
    
    return this.dataCache.opportunities.filter(opportunity => {
      return (!filter.status || opportunity.status === filter.status) &&
             (!filter.source || opportunity.source === filter.source) &&
             (!filter.minAmount || (opportunity.amount || 0) >= filter.minAmount) &&
             (!filter.maxAmount || (opportunity.amount || 0) <= filter.maxAmount) &&
             (!filter.owner || opportunity.owner === filter.owner)
    })
  }
  
  /**
   * Get revenue performance snapshot
   */
  getRevenuePerformance(): RevenuePerformanceSnapshot {
    const mrrMetric = this.getMetric("mrr")
    const customerCountMetric = this.getMetric("customer_count")
    const cacMetric = this.getMetric("cac")
    const closeRateMetric = this.getMetric("close_rate")
    const churnRateMetric = this.getMetric("churn_rate")
    
    // Calculate 30-day changes
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const recentTransactions = this.getTransactions({
      type: "subscription",
      status: "active",
      startDate: thirtyDaysAgo,
    })
    
    const newMrr30 = recentTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0)
    
    const churnedCustomers = this.getCustomers({
      status: "churned",
    }).filter(c => new Date(c.churnDate || now) >= thirtyDaysAgo)
    
    const churnMrr30 = churnedCustomers.reduce((sum, cust) => sum + (cust.mrr || 0), 0)
    
    // Calculate pipeline value
    const openOpportunities = this.getOpportunities({
      status: "open",
    })
    
    const pipelineValue = openOpportunities.reduce((sum, opp) => {
      // Apply probability weighting
      const probability = opp.probability || 0.5
      return sum + ((opp.amount || 0) * probability)
    }, 0)
    
    return {
      timestamp: new Date(),
      mrr: mrrMetric?.value || 0,
      newMrr30,
      churnMrr30,
      netNewMrr: newMrr30 - churnMrr30,
      cac: cacMetric?.value || 0,
      ltv: this.calculateLTV(),
      closeRate: closeRateMetric?.value || 0,
      churnRate: churnRateMetric?.value || 0,
      pipelineValue,
      customerCount: customerCountMetric?.value || 0,
    }
  }
  
  /**
   * Calculate LTV (simplified)
   */
  private calculateLTV(): number {
    const mrr = this.getMetric("mrr")?.value || 0
    const customerCount = this.getMetric("customer_count")?.value || 1
    const avgRevenuePerCustomer = mrr / customerCount
    const churnRate = this.getMetric("churn_rate")?.value || 5
    const monthlyChurn = churnRate / 100
    
    // LTV = ARPU / Churn Rate (simplified)
    return avgRevenuePerCustomer / Math.max(0.01, monthlyChurn)
  }
  
  /**
   * Generate simulated customer data
   */
  private generateSimulatedCustomer(): Customer {
    const statuses: CustomerStatus[] = ["lead", "trial", "paid", "churned"]
    const sources: CustomerSource[] = ["organic", "paid", "referral", "outbound", "inbound"]
    
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const source = sources[Math.floor(Math.random() * sources.length)]
    
    return {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: `Customer ${Math.floor(Math.random() * 1000)}`,
      email: `customer${Math.floor(Math.random() * 1000)}@example.com`,
      status,
      source,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      mrr: status === "paid" ? 99 + Math.random() * 500 : 0,
      acquisitionCost: 50 + Math.random() * 200,
      churnDate: status === "churned" ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
      lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    }
  }
  
  /**
   * Generate simulated transaction data
   */
  private generateSimulatedTransaction(): Transaction {
    const types: TransactionType[] = ["subscription", "one_time", "refund", "upgrade", "downgrade"]
    const statuses: TransactionStatus[] = ["pending", "completed", "failed", "refunded", "active", "cancelled"]
    const sources: TransactionSource[] = ["stripe", "paypal", "bank_transfer", "invoice"]
    
    const type = types[Math.floor(Math.random() * types.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const source = sources[Math.floor(Math.random() * sources.length)]
    
    return {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      customerId: `cust_${Math.floor(Math.random() * 1000)}`,
      type,
      status,
      source,
      amount: type === "subscription" ? 99 + Math.random() * 500 : 50 + Math.random() * 1000,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      currency: "USD",
      product: `Product ${Math.floor(Math.random() * 5) + 1}`,
    }
  }
  
  /**
   * Generate simulated opportunity data
   */
  private generateSimulatedOpportunity(): Opportunity {
    const statuses: OpportunityStatus[] = ["open", "contacted", "qualified", "proposal_sent", "negotiation", "closed_won", "closed_lost"]
    const sources: OpportunitySource[] = ["inbound", "outbound", "referral", "website", "event"]
    const owners = ["agent_1", "agent_2", "agent_3", "agent_4"]
    
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const source = sources[Math.floor(Math.random() * sources.length)]
    const owner = owners[Math.floor(Math.random() * owners.length)]
    
    return {
      id: `opp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: `Opportunity ${Math.floor(Math.random() * 1000)}`,
      customerId: `cust_${Math.floor(Math.random() * 1000)}`,
      status,
      source,
      owner,
      amount: 500 + Math.random() * 5000,
      probability: status === "closed_won" ? 1.0 : status === "closed_lost" ? 0.0 : 0.1 + Math.random() * 0.8,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      expectedCloseDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
    }
  }
  
  /**
   * Get connected data sources
   */
  getConnectedSources(): RevenueDataSource[] {
    return this.connectedSources
  }
  
  /**
   * Disconnect a data source
   */
  disconnectSource(sourceId: string): boolean {
    const index = this.connectedSources.findIndex(s => s.id === sourceId)
    if (index !== -1) {
      this.connectedSources.splice(index, 1)
      console.log(`❌ Disconnected source ${sourceId}`)
      return true
    }
    return false
  }
  
  /**
   * Shutdown data layer
   */
  shutdown() {
    console.log("🔌 Shutting down Revenue Data layer...")
    this.connectedSources = []
    this.dataCache = {
      customers: [],
      transactions: [],
      opportunities: [],
      metrics: [],
    }
    console.log("✅ Revenue Data layer shutdown complete")
  }
}

// Types and Interfaces
export interface RevenueDataSourceConfig {
  type: "stripe" | "hubspot" | "salesforce" | "google_analytics" | "postgres" | "bigquery" | "custom"
  name: string
  apiKey?: string
  connectionString?: string
  settings?: Record<string, any>
}

export interface RevenueDataSource {
  id: string
  type: string
  name: string
  status: "connected" | "disconnected" | "error" | "syncing"
  lastSync: Date
  connectedAt: Date
  config: {
    apiKey?: string
    connectionString?: string
  }
  error?: string
}

export interface DataSyncResult {
  sourceId: string
  recordsSynced: number
  syncTimeMs: number
  lastSync: Date
  error?: string
}

export interface RevenueMetric {
  name: string
  value: number
  lastUpdated: Date
}

export interface Customer {
  id: string
  name: string
  email: string
  status: CustomerStatus
  source: CustomerSource
  createdAt: Date
  mrr?: number
  acquisitionCost?: number
  churnDate?: Date
  lastActivity?: Date
  [key: string]: any
}

export interface Transaction {
  id: string
  customerId: string
  type: TransactionType
  status: TransactionStatus
  source: TransactionSource
  amount?: number
  date: Date
  currency: string
  product?: string
  [key: string]: any
}

export interface Opportunity {
  id: string
  name: string
  customerId: string
  status: OpportunityStatus
  source: OpportunitySource
  owner: string
  amount?: number
  probability?: number
  createdAt: Date
  expectedCloseDate?: Date
  [key: string]: any
}

export interface RevenuePerformanceSnapshot {
  timestamp: Date
  mrr: number
  newMrr30: number
  churnMrr30: number
  netNewMrr: number
  cac: number
  ltv: number
  closeRate: number
  churnRate: number
  pipelineValue: number
  customerCount: number
}

// Filter types
export interface CustomerFilter {
  status?: CustomerStatus
  source?: CustomerSource
  minMrr?: number
  maxMrr?: number
}

export interface TransactionFilter {
  type?: TransactionType
  status?: TransactionStatus
  minAmount?: number
  maxAmount?: number
  startDate?: Date
  endDate?: Date
}

export interface OpportunityFilter {
  status?: OpportunityStatus
  source?: OpportunitySource
  owner?: string
  minAmount?: number
  maxAmount?: number
}

// Data cache structure
interface RevenueDataCache {
  customers: Customer[]
  transactions: Transaction[]
  opportunities: Opportunity[]
  metrics: RevenueMetric[]
}

interface SimulatedSyncData {
  customers: number
  transactions: number
  opportunities: number
}

// Type definitions
type CustomerStatus = "lead" | "trial" | "paid" | "churned" | "inactive"
type CustomerSource = "organic" | "paid" | "referral" | "outbound" | "inbound" | "event" | "other"
type TransactionType = "subscription" | "one_time" | "refund" | "upgrade" | "downgrade" | "other"
type TransactionStatus = "pending" | "completed" | "failed" | "refunded" | "active" | "cancelled"
type TransactionSource = "stripe" | "paypal" | "bank_transfer" | "invoice" | "other"
type OpportunityStatus = "open" | "contacted" | "qualified" | "proposal_sent" | "negotiation" | "closed_won" | "closed_lost"
type OpportunitySource = "inbound" | "outbound" | "referral" | "website" | "event" | "other"
