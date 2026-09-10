import { NextResponse } from 'next/server'
import { requireAdminSession, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const { phaseId, projectId } = await request.json()
    if (!phaseId || !projectId) {
      return NextResponse.json({ error: '缺少參數' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('payment_phases')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', phaseId)
      .eq('project_id', projectId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
