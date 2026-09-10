import { NextResponse } from 'next/server'
import { requireClientProjectId, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { INITIAL_STAGES } from '@/lib/stages'

export async function GET() {
  const projectId = await requireClientProjectId()
  if (!projectId) return unauthorized('請先登入')

  try {
    const supabase = createServiceClient()

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, address, status, stages_state')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: '找不到工程資料' }, { status: 404 })
    }

    const [{ data: logs }, { data: phases }] = await Promise.all([
      supabase
        .from('progress_logs')
        .select('id, title, description, content, photo_url, photo_urls, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
      supabase
        .from('payment_phases')
        .select('id, phase_number, status, paid_at')
        .eq('project_id', projectId)
        .order('phase_number', { ascending: false }),
    ])

    let selectedPhaseId = ''
    if (phases && phases.length > 0) {
      const active = phases.find((p) => p.status === 'pending') || phases[0]
      selectedPhaseId = active.id
    }

    let receipts: any[] = []
    if (selectedPhaseId) {
      const { data: receiptData } = await supabase
        .from('receipts')
        .select('id, category, amount, description, photo_url, phase_id, created_at')
        .eq('project_id', projectId)
        .eq('phase_id', selectedPhaseId)
        .order('created_at', { ascending: false })
      receipts = receiptData || []
    }

    return NextResponse.json({
      project,
      logs: logs || [],
      phases: phases || [],
      selectedPhaseId,
      receipts,
      stages: INITIAL_STAGES,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
