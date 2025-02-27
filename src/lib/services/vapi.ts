// src/lib/services/vapi.ts

export interface VapiSettings {
  systemPrompt: string;
  firstMessage: string;
  endCallMessage: string;
  summaryPrompt: string;
  successEvaluation: string;
  structuredDataPrompt: string;
  structuredDataSchema: string;
}

export interface UpdateResponse {
  success: boolean;
  error?: string;
}

/**
 * Service for managing VAPI settings
 */
export const vapiService = {
  /**
   * Get all VAPI settings
   */
  async getSettings(): Promise<VapiSettings> {
    const response = await fetch('/api/vapi/settings');
    
    if (!response.ok) {
      throw new Error('Failed to fetch VAPI settings');
    }
    
    return response.json();
  },
  
  /**
   * Update VAPI settings
   */
  async updateSettings(settings: VapiSettings): Promise<UpdateResponse> {
    try {
      const response = await fetch('/api/vapi/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to update VAPI settings',
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
  
  /**
   * Publish VAPI settings to VAPI API
   */
  async publishSettings(): Promise<UpdateResponse> {
    try {
      const response = await fetch('/api/vapi/publish', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to publish VAPI settings',
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
};
