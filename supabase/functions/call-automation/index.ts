// supabase/functions/call-automation/index.ts
import { createClient } from '@supabase/supabase-js'
import type { Lead } from '../../../lib/supabase/types' // Adjust path as needed

// Environment variables will need to be set in the Supabase dashboard
const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY')
const VAPI_ASSISTANT_ID = Deno.env.get('VAPI_ASSISTANT_ID')
const VAPI_PHONE_NUMBER_ID = Deno.env.get('VAPI_PHONE_NUMBER_ID')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Default settings
const DEFAULT_SETTINGS = {
  max_calls_batch: 10,
  retry_interval: 24, // hours
  max_attempts: 3
}

// Validate required environment variables
if (!VAPI_API_KEY) throw new Error('VAPI_API_KEY is required')
if (!VAPI_ASSISTANT_ID) throw new Error('VAPI_ASSISTANT_ID is required')
if (!VAPI_PHONE_NUMBER_ID) throw new Error('VAPI_PHONE_NUMBER_ID is required')
if (!SUPABASE_URL) throw new Error('SUPABASE_URL is required')
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Fetch automation settings from Supabase
async function getAutomationSettings() {
  console.log('Fetching automation settings...')
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'automation_settings')
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching settings:', error)
    return {
      automation_enabled: false,
      max_calls_batch: DEFAULT_SETTINGS.max_calls_batch,
      retry_interval: DEFAULT_SETTINGS.retry_interval,
      max_attempts: DEFAULT_SETTINGS.max_attempts
    }
  }
}

// Fetch pending leads to process
async function fetchPendingLeads(maxBatch: number, retryInterval: number, maxAttempts: number) {
  try {
    const retryThreshold = new Date()
    retryThreshold.setHours(retryThreshold.getHours() - retryInterval)

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'pending')
      .lt('call_attempts', maxAttempts)
      .or(`last_call_at.is.null,last_call_at.lt.${retryThreshold.toISOString()}`)
      .order('created_at', { ascending: true })
      .limit(maxBatch)

    if (error) throw error
    return { success: true, leads }
  } catch (error) {
    console.error('Error fetching leads:', error)
    return { success: false, leads: [], error }
  }
}

// Update lead with call attempt
async function updateLeadWithCallAttempt(leadId: string, currentAttempts: number) {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        call_attempts: (currentAttempts || 0) + 1,
        last_call_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error updating lead:', error)
    return { success: false, error }
  }
}

// Create call log
async function createCallLog(leadId: string, callResult: any) {
  try {
    const { error } = await supabase
      .from('call_logs')
      .insert({
        lead_id: leadId,
        call_id: callResult.id,
        status: 'initiated',
        raw_data: callResult
      })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error creating call log:', error)
    return { success: false, error }
  }
}

// Initiate a VAPI call
async function initiateVapiCall(lead: Lead) {
  console.log(`Initiating VAPI call for lead:`, lead)
  
  // Get current time in lead's timezone
  const leadDateTime = new Date().toLocaleString('en-US', { 
    timeZone: lead.timezone || 'America/Chicago',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  })
  
  const payload = {
    phoneNumberId: VAPI_PHONE_NUMBER_ID,
    assistantId: VAPI_ASSISTANT_ID,
    assistantOverrides: {
      variableValues: {
        lead_contact_name: lead.contact_name,
        lead_email: lead.email,
        lead_phone_number: lead.phone,
        lead_timezone: lead.timezone || 'America/Los_Angeles',
        lead_datetime: leadDateTime
      }
    },
    customer: {
      number: lead.phone
    }
  }
  console.log('VAPI request payload:', payload)

  const response = await fetch('https://api.vapi.ai/call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  const responseData = await response.text()
  console.log(`VAPI API response (${response.status}):`, responseData)

  if (!response.ok) {
    throw new Error(`Failed to initiate VAPI call: ${response.status} ${response.statusText} - ${responseData}`)
  }

  return JSON.parse(responseData)
}

// Main function handler
Deno.serve(async () => {
  try {
    console.log('Scheduled job started')
    
    // Get automation settings
    const settings = await getAutomationSettings()

    if (!settings.automation_enabled) {
      console.log('Automation is disabled, exiting')
      return new Response(JSON.stringify({ message: 'Automation is disabled' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Use default values if settings properties are undefined
    const maxCallsBatch = settings.max_calls_batch ?? DEFAULT_SETTINGS.max_calls_batch
    const retryInterval = settings.retry_interval ?? DEFAULT_SETTINGS.retry_interval
    const maxAttempts = settings.max_attempts ?? DEFAULT_SETTINGS.max_attempts

    // Fetch leads to process
    console.log('Fetching pending leads...')
    const { success, leads, error: fetchError } = await fetchPendingLeads(maxCallsBatch, retryInterval, maxAttempts)

    if (!success || !leads) {
      console.log('Error fetching leads:', fetchError)
      return new Response(JSON.stringify({ error: 'Failed to fetch leads' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${leads?.length || 0} leads to process`)
    if (leads.length === 0) {
      return new Response(JSON.stringify({ message: 'No leads to process' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Initiate calls for each lead
    console.log('Processing leads...')
    const results = await Promise.all(
      leads.map(async (lead) => {
        try {
          // Start VAPI call
          const callResult = await initiateVapiCall(lead)

          // Create call log
          const { error: logError } = await createCallLog(lead.id, callResult)
          if (logError) {
            console.error('Error creating call log:', logError)
          }

          // Update lead with call attempt
          const { success, error: updateError } = await updateLeadWithCallAttempt(lead.id, lead.call_attempts)

          if (!success) {
            console.log('Error updating lead:', updateError)
            return { lead, success: false, error: updateError }
          }

          return { lead, success: true, callId: callResult.id }
        } catch (error) {
          console.log(`Error processing lead ${lead.id}:`, error)
          return { lead, success: false, error }
        }
      })
    )

    // Prepare summary
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }

    return new Response(JSON.stringify({
      message: 'Calls initiated',
      summary,
      details: results
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.log('Scheduled job error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
