import { NextRequest, NextResponse } from 'next/server'
import { LeadsService } from '@/lib/services/leads'
import { createServiceClient } from '@/lib/supabase/service'

const serviceClient = createServiceClient()
const leadsService = new LeadsService(serviceClient)

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params
    
    const { success, error } = await leadsService.deleteLead(id)

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to delete lead' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
