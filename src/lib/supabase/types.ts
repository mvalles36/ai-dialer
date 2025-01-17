export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string
          company_name: string
          contact_name: string
          phone: string
          email: string
          status: 'pending' | 'calling' | 'no_answer' | 'scheduled' | 'not_interested' | 'error'
          call_attempts: number
          timezone: string
          last_called_at: string | null
          cal_booking_uid: string | null
          follow_up_email_sent: boolean
          created_at: string
          updated_at: string
          notes?: string;
          source?: string;
          timezone: data.timezone ?? "", // Provide a default value
          cal_booking_uid: data.cal_booking_uid ?? null, // Provide a default value
          follow_up_email_sent: data.follow_up_email_sent ?? false, // Provide a default value
        }
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['leads']['Row']>
      }
      settings: {
        Row: {
          id: string
          automation_enabled: boolean
          max_calls_batch: number
          retry_interval: number
          max_attempts: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['settings']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['settings']['Row']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type for Lead table rows
export type Lead = Database['public']['Tables']['leads']['Row']
