import { NextResponse } from 'next/server'
import { requireClientProjectId, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const projectId = await requireClientProjectId()
  if (!projectId) return unauthorized('請先登入')

  try {
    const { searchParams } = new URL(request.url)
    const phaseId = searchParams.get('phaseId')
    if (!phaseId) {
      return NextResponse.json({ error: '缺少 phaseId' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Ensure phase belongs to this project
    const { data: phase } = await supabase
      .from('payment_phases')
      .select('id')
      .eq('id', phaseId)
      .eq('project_id', projectId)
      .maybeSingle()

    if (!phase) {
      return NextResponse.json({ error: '無權限查看此期數' }, { status: 403 })
    }

    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('id, category, amount, description, photo_url, phase_id, created_at')
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ receipts: receipts || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
