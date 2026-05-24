import { AICore } from "../AICore"
import { AutonomousBrain } from "./AutonomousBrain"
import { RevenueBrainstem } from "../revenue/RevenueBrainstem"
import { ContinuousLearning } from "../learning/ContinuousLearning"
import { BrainOrchestrator } from "./BrainOrchestrator"
import { SystemAuditor } from "../audit/SystemAuditor"
import { SystemTester } from "../audit/SystemTester"
import { RevenueData } from "../revenue/RevenueData"

/**
 * System Initializer - Complete system bootstrap and verification
 * Ensures all components are clean, configured, and ready for production
 */
export class SystemInitializer {
  private core: AICore | null = null
  private autonomousBrain: AutonomousBrain | null = null
  private revenueBrainstem: RevenueBrainstem | null = null
  private learningSystem: ContinuousLearning | null = null
  private orchestrator: BrainOrchestrator | null = null
  private auditor: SystemAuditor | null = null
  private tester: SystemTester | null = null
  private revenueData: RevenueData | null = null
  
  private initializationLog: InitializationLogEntry[] = []
  private errors: Error[] = []
  
  constructor() {
    console.log("🛠️  System Initializer created")
  }
  
  /**
   * Initialize the complete system
   */
  async initialize(config: SystemConfig): Promise<InitializationResult> {
    console.log("🚀 Initializing Autonomous Brain System...")
    this.log("System initialization started")
    
    try {
      // Step 1: Clean up any existing instances
      await this.cleanup()
      
      // Step 2: Initialize core components
      await this.initializeCore(config)
      
      // Step 3: Initialize subsystems
      await this.initializeSubsystems(config)
      
      // Step 4: Initialize orchestrator
      await this.initializeOrchestrator()
      
      // Step 5: Verify all components
      await this.verifyComponents()
      
      // Step 6: Run initial audit
      await this.runInitialAudit()
      
      // Step 7: Run initial tests
      await this.runInitialTests()
      
      // Step 8: Start all systems
      this.startAllSystems()
      
      const result: InitializationResult = {
        success: this.errors.length === 0,
        components: {
          core: !!this.core,
          autonomousBrain: !!this.autonomousBrain,
          revenueBrainstem: !!this.revenueBrainstem,
          learningSystem: !!this.learningSystem,
          orchestrator: !!this.orchestrator,
          auditor: !!this.auditor,
          tester: !!this.tester,
          revenueData: !!this.revenueData,
        },
        initializationLog: this.initializationLog,
        errors: this.errors,
      }
      
      if (result.success) {
        console.log("✅ System initialization completed successfully!")
        this.log("System ready for operation")
      } else {
        console.error("❌ System initialization completed with errors")
        this.log(`Initialization completed with ${this.errors.length} errors`)
      }
      
      return result
      
    } catch (error) {
      console.error("💥 Initialization failed:", error)
      this.log(`Initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      
      return {
        success: false,
        components: {},
        initializationLog: this.initializationLog,
        errors: [...this.errors, error instanceof Error ? error : new Error("Unknown error")],
      }
    }
  }
  
  /**
   * Clean up any existing instances and mock data
   */
  private async cleanup(): Promise<void> {
    this.log("Cleaning up existing instances and mock data")
    
    // Clear any cached data
    if (typeof global !== "undefined") {
      // In Node.js environment
      if (global.aiCoreInstance) delete global.aiCoreInstance
      if (global.autonomousBrainInstance) delete global.autonomousBrainInstance
      if (global.revenueBrainstemInstance) delete global.revenueBrainstemInstance
    }
    
    // Clear local storage if in browser
    if (typeof window !== "undefined" && window.localStorage) {
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith("ai-system-"))
      keysToRemove.forEach(key => localStorage.removeItem(key))
      this.log(`Cleared ${keysToRemove.length} local storage items`)
    }
    
    console.log("✅ Cleanup completed")
  }
  
  /**
   * Initialize core components
   */
  private async initializeCore(config: SystemConfig): Promise<void> {
    this.log("Initializing core components")
    
    try {
      // Initialize AICore
      this.core = new AICore({
        providers: {
          gemini: config.providers?.gemini ? { apiKey: config.providers.gemini.apiKey } : undefined,
          openai: config.providers?.openai ? { apiKey: config.providers.openai.apiKey } : undefined,
          deepseek: config.providers?.deepseek ? { apiKey: config.providers.deepseek.apiKey } : undefined,
          ollama: config.providers?.ollama ? {
            baseUrl: config.providers.ollama.baseUrl || "http://localhost:11434",
            model: config.providers.ollama.model || "llama3"
          } : undefined,
        },
        costTracking: config.costTracking || {
          enabled: true,
          budgetLimitUsd: 100,
        },
      })
      this.log("✅ AICore initialized")
      
      // Initialize RevenueData
      if (this.core) {
        this.revenueData = new RevenueData(this.core)
        this.log("✅ RevenueData initialized")
      }
      
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("Core initialization failed"))
      this.log(`Core initialization error: ${error instanceof Error ? error.message : "Unknown"}`)
      throw error
    }
  }
  
  /**
   * Initialize subsystems
   */
  private async initializeSubsystems(config: SystemConfig): Promise<void> {
    this.log("Initializing subsystems")
    
    if (!this.core) {
      throw new Error("Core not initialized")
    }
    
    try {
      // Initialize ContinuousLearning
      this.learningSystem = new ContinuousLearning(this.core)
      this.log("✅ ContinuousLearning initialized")
      
      // Initialize AutonomousBrain
      this.autonomousBrain = new AutonomousBrain({
        providers: {
          gemini: config.providers?.gemini ? { apiKey: config.providers.gemini.apiKey } : undefined,
          openai: config.providers?.openai ? { apiKey: config.providers.openai.apiKey } : undefined,
        },
      })
      this.log("✅ AutonomousBrain initialized")
      
      // Initialize RevenueBrainstem
      this.revenueBrainstem = new RevenueBrainstem(
        this.core,
        new AutoConfig(),
        this.learningSystem,
        config.revenueTargets || {
          mrrTarget: 100000,
          maxCac: 2500,
          maxPaybackMonths: 12,
          targetCloseRate: 25,
          targetChurnRate: 3,
        }
      )
      this.log("✅ RevenueBrainstem initialized")
      
      // Initialize Auditor and Tester
      this.auditor = new SystemAuditor(this.core)
      this.tester = new SystemTester(this.core)
      this.log("✅ Auditor and Tester initialized")
      
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("Subsystem initialization failed"))
      this.log(`Subsystem initialization error: ${error instanceof Error ? error.message : "Unknown"}`)
      throw error
    }
  }
  
  /**
   * Initialize orchestrator
   */
  private async initializeOrchestrator(): Promise<void> {
    this.log("Initializing orchestrator")
    
    if (!this.core || !this.revenueBrainstem || !this.learningSystem) {
      throw new Error("Required subsystems not initialized")
    }
    
    try {
      this.orchestrator = new BrainOrchestrator(
        this.core,
        this.revenueBrainstem,
        this.learningSystem
      )
      this.log("✅ BrainOrchestrator initialized")
      
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("Orchestrator initialization failed"))
      this.log(`Orchestrator initialization error: ${error instanceof Error ? error.message : "Unknown"}`)
      throw error
    }
  }
  
  /**
   * Verify all components are working
   */
  private async verifyComponents(): Promise<void> {
    this.log("Verifying all components")
    
    const verifications = [
      { name: "AICore", test: async () => {
        if (!this.core) throw new Error("Not initialized")
        const result = await this.core.generate("Test", { taskType: "chat" })
        if (!result.text) throw new Error("No response")
      }},
      { name: "AutonomousBrain", test: async () => {
        if (!this.autonomousBrain) throw new Error("Not initialized")
        const status = this.autonomousBrain.getSystemStatus()
        if (status.systemStatus !== "operational") throw new Error("Not operational")
      }},
      { name: "RevenueBrainstem", test: async () => {
        if (!this.revenueBrainstem) throw new Error("Not initialized")
        const dashboard = this.revenueBrainstem.getRevenueDashboard()
        if (!dashboard.currentPerformance) throw new Error("No performance data")
      }},
      { name: "LearningSystem", test: async () => {
        if (!this.learningSystem) throw new Error("Not initialized")
        const stats = this.learningSystem.getLearningStats()
        if (stats.totalExperiences < 0) throw new Error("Invalid stats")
      }},
      { name: "Orchestrator", test: async () => {
        if (!this.orchestrator) throw new Error("Not initialized")
        const status = this.orchestrator.getStatus()
        if (status.status !== "stopped") throw new Error("Invalid initial status")
      }},
    ]
    
    for (const verification of verifications) {
      try {
        await verification.test()
        this.log(`✅ ${verification.name} verification passed`)
      } catch (error) {
        this.errors.push(new Error(`${verification.name} verification failed: ${error instanceof Error ? error.message : "Unknown"}`))
        this.log(`❌ ${verification.name} verification failed: ${error instanceof Error ? error.message : "Unknown"}`)
      }
    }
  }
  
  /**
   * Run initial system audit
   */
  private async runInitialAudit(): Promise<void> {
    this.log("Running initial system audit")
    
    if (!this.orchestrator || !this.autonomousBrain || !this.revenueBrainstem || !this.learningSystem) {
      this.log("⚠️  Skipping audit - not all components initialized")
      return
    }
    
    try {
      const report = await this.auditor!.runFullAudit(
        this.autonomousBrain,
        this.revenueBrainstem,
        this.learningSystem
      )
      
      this.log(`✅ Initial audit completed: ${report.severitySummary.overallScore}/100`)
      
      if (report.severitySummary.issues.critical > 0) {
        this.log(`⚠️  ${report.severitySummary.issues.critical} critical issues found`)
        report.issues
          .filter(issue => issue.severity === "critical")
          .forEach(issue => this.log(`   - ${issue.description}`))
      }
      
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("Initial audit failed"))
      this.log(`Initial audit error: ${error instanceof Error ? error.message : "Unknown"}`)
    }
  }
  
  /**
   * Run initial system tests
   */
  private async runInitialTests(): Promise<void> {
    this.log("Running initial system tests")
    
    if (!this.tester) {
      this.log("⚠️  Skipping tests - tester not initialized")
      return
    }
    
    try {
      const report = await this.tester.runComprehensiveTests()
      
      this.log(`✅ Initial tests completed: ${report.passRate}% pass rate`)
      
      if (report.failed > 0) {
        this.log(`⚠️  ${report.failed} tests failed`)
      }
      
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("Initial tests failed"))
      this.log(`Initial tests error: ${error instanceof Error ? error.message : "Unknown"}`)
    }
  }
  
  /**
   * Start all systems
   */
  private startAllSystems(): void {
    this.log("Starting all systems")
    
    try {
      // Start orchestrator (which starts everything else)
      if (this.orchestrator) {
        this.orchestrator.start()
        this.log("✅ Orchestrator started")
      }
      
      // Start autonomous brain
      if (this.autonomousBrain) {
        // Already started by orchestrator
        this.log("✅ AutonomousBrain started")
      }
      
      // Start revenue brainstem
      if (this.revenueBrainstem) {
        // Already started by orchestrator
        this.log("✅ RevenueBrainstem started")
      }
      
      // Start learning system
      if (this.learningSystem) {
        // Already started by orchestrator
        this.log("✅ LearningSystem started")
      }
      
    } catch (error) {
      this.errors.push(error instanceof Error ? error : new Error("System startup failed"))
      this.log(`System startup error: ${error instanceof Error ? error.message : "Unknown"}`)
    }
  }
  
  /**
   * Get initialized components
   */
  getComponents(): {
    core: AICore | null
    autonomousBrain: AutonomousBrain | null
    revenueBrainstem: RevenueBrainstem | null
    learningSystem: ContinuousLearning | null
    orchestrator: BrainOrchestrator | null
    auditor: SystemAuditor | null
    tester: SystemTester | null
    revenueData: RevenueData | null
  } {
    return {
      core: this.core,
      autonomousBrain: this.autonomousBrain,
      revenueBrainstem: this.revenueBrainstem,
      learningSystem: this.learningSystem,
      orchestrator: this.orchestrator,
      auditor: this.auditor,
      tester: this.tester,
      revenueData: this.revenueData,
    }
  }
  
  /**
   * Get initialization log
   */
  getInitializationLog(): InitializationLogEntry[] {
    return this.initializationLog
  }
  
  /**
   * Get errors
   */
  getErrors(): Error[] {
    return this.errors
  }
  
  /**
   * Log initialization event
   */
  private log(message: string): void {
    this.initializationLog.push({
      timestamp: new Date(),
      message,
    })
    console.log(`[Initializer] ${message}`)
  }
}

// Types and Interfaces
export interface SystemConfig {
  providers?: {
    gemini?: { apiKey: string }
    openai?: { apiKey: string }
    deepseek?: { apiKey: string }
    ollama?: { baseUrl?: string; model?: string }
  }
  revenueTargets?: {
    mrrTarget: number
    maxCac: number
    maxPaybackMonths: number
    targetCloseRate: number
    targetChurnRate: number
  }
  costTracking?: {
    enabled: boolean
    budgetLimitUsd?: number
  }
}

export interface InitializationLogEntry {
  timestamp: Date
  message: string
}

export interface InitializationResult {
  success: boolean
  components: {
    core?: boolean
    autonomousBrain?: boolean
    revenueBrainstem?: boolean
    learningSystem?: boolean
    orchestrator?: boolean
    auditor?: boolean
    tester?: boolean
    revenueData?: boolean
  }
  initializationLog: InitializationLogEntry[]
  errors: Error[]
}