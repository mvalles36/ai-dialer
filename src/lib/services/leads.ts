/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Add types
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '@/lib/supabase/client';
import type { Lead } from '@/lib/supabase/types';

export type LeadStatus = "pending" | "calling" | "no_answer" | "scheduled" | "not_interested";

export class LeadsService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient = defaultClient) {
    this.supabase = supabaseClient;
  }

  async getLeads(
    options: {
      sortBy?: { column: keyof Lead | null; ascending: boolean };
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{ data: Lead[] | null; error: any; count: number }> {
    const { sortBy, page, pageSize } = options;
    
    try {
      let query = this.supabase
        .from('leads')
        .select('*', { count: 'exact' });

      // Only apply sorting if we have a valid column
      if (sortBy?.column) {
        query = query.order(sortBy.column, {
          ascending: sortBy.ascending
        });
      } else {
        // Default sort by created_at desc if no sort specified
        query = query.order('created_at', { ascending: false });
      }

      // Only apply pagination if both page and pageSize are provided
      if (typeof page === 'number' && typeof pageSize === 'number') {
        // Convert from 1-based to 0-based page number
        const start = (page - 1) * pageSize;
        query = query.range(start, start + pageSize - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching leads:', error);
        return {
          data: null,
          error: {
            message: error.message || 'Failed to fetch leads',
            details: error
          },
          count: 0
        };
      }

      return {
        data,
        error: null,
        count: count || 0
      };
    } catch (error) {
      console.error('Error fetching leads:', error);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          details: error
        },
        count: 0
      };
    }
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<{ success: boolean; data?: Lead | null; error?: any }> {
    try {
      const { data, error } = await this.supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating lead:', error);
      return {
        success: false,
        error
      };
    }
  }

  async deleteLead(id: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await this.supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting lead:', error);
      return {
        success: false,
        error
      };
    }
  }

  async createLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Lead | null; error?: any }> {
    try {
      const { data, error } = await this.supabase
        .from('leads')
        .insert([lead])
        .select()
        .single();

      if (error) throw error;

      return {
        data
      };
    } catch (error) {
      console.error('Error creating lead:', error);
      return {
        data: null,
        error
      };
    }
  }

  async createLeads(leads: Omit<Lead, 'id' | 'created_at' | 'updated_at'>[]): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await this.supabase
        .from('leads')
        .insert(leads);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error) {
      console.error('Error creating leads:', error);
      return {
        success: false,
        error
      };
    }
  }

  async updateLeadStatus(ids: string[], status: Lead['status']): Promise<{ success: boolean; data?: Lead[] | null; error?: any }> {
    try {
      const { data, error } = await this.supabase
        .from('leads')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', ids)
        .select();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error updating lead status:', error);
      return {
        success: false,
        error
      };
    }
  }
}

// Export a singleton instance with the default client for client-side use
export const leadsService = new LeadsService();
