import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

// Corrected PATCH handler
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createRouteHandlerClient()

    const { id } = params  // No need for Promise.resolve here
    const updates = await request.json()

    const { data, error } = await supabase
      .from('leads')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Corrected DELETE handler
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createRouteHandlerClient()

    const { id } = params  // No need for Promise.resolve here

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ message: 'Lead deleted successfully' })
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
