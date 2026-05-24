/**
 * API Client - Robust HTTP client with error handling and retries
 * Handles connection errors, timeouts, and provides fallback behavior
 */

export class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private maxRetries: number
  private retryDelay: number
  
  constructor(baseUrl: string = "http://localhost:3000", maxRetries: number = 3, retryDelay: number = 1000) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }
    this.maxRetries = maxRetries
    this.retryDelay = retryDelay
  }
  
  /**
   * Set base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  }
  
  /**
   * Set default headers
   */
  setHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers }
  }
  
  /**
   * Make a GET request with retries and error handling
   */
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
    
    try {
      const response = await this.fetchWithRetry(url, {
        method: "GET",
        headers: { ...this.defaultHeaders, ...options.headers },
      })
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status,
        }
      }
      
      try {
        const data = await response.json()
        return { success: true, data, status: response.status }
      } catch (jsonError) {
        return {
          success: false,
          error: "Invalid JSON response",
          status: response.status,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
      }
    }
  }
  
  /**
   * Make a POST request with retries and error handling
   */
  async post<T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
    
    try {
      const response = await this.fetchWithRetry(url, {
        method: "POST",
        headers: { ...this.defaultHeaders, ...options.headers },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status,
        }
      }
      
      try {
        const data = await response.json()
        return { success: true, data, status: response.status }
      } catch (jsonError) {
        return {
          success: false,
          error: "Invalid JSON response",
          status: response.status,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
      }
    }
  }
  
  /**
   * Make a PUT request with retries and error handling
   */
  async put<T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
    
    try {
      const response = await this.fetchWithRetry(url, {
        method: "PUT",
        headers: { ...this.defaultHeaders, ...options.headers },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status,
        }
      }
      
      try {
        const data = await response.json()
        return { success: true, data, status: response.status }
      } catch (jsonError) {
        return {
          success: false,
          error: "Invalid JSON response",
          status: response.status,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
      }
    }
  }
  
  /**
   * Make a DELETE request with retries and error handling
   */
  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
    
    try {
      const response = await this.fetchWithRetry(url, {
        method: "DELETE",
        headers: { ...this.defaultHeaders, ...options.headers },
      })
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          status: response.status,
        }
      }
      
      try {
        const data = await response.json()
        return { success: true, data, status: response.status }
      } catch (jsonError) {
        return {
          success: false,
          error: "Invalid JSON response",
          status: response.status,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        status: 0,
      }
    }
  }
  
  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: unknown = null
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options)
        
        // Check if response is OK or if we should retry
        if (response.ok || !this.shouldRetry(response.status)) {
          return response
        }
        
        // If we should retry, wait and try again
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        }
        
      } catch (error) {
        lastError = error
        
        // If we should retry, wait and try again
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        } else {
          throw error
        }
      }
    }
    
    throw lastError instanceof Error ? lastError : new Error("Unknown error")
  }
  
  /**
   * Determine if a status code should be retried
   */
  private shouldRetry(status: number): boolean {
    // Retry on server errors (5xx) and rate limits (429)
    return status >= 500 || status === 429
  }
}

export interface RequestOptions {
  headers?: Record<string, string>
  [key: string]: any
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  status: number
}
