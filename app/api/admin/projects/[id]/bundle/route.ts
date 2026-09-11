import { NextResponse } from 'next/server'
import { requireAdminSession, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { mergeStageState } from '@/lib/stages'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const { id: projectId } = await context.params
    const supabase = createServiceClient()

    let { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, address, client_name, status, stages_state, project_type')
      .eq('id', projectId)
      .single()

    if (projectError) {
      const msg = String(projectError.message || '')
      if (msg.includes('project_type') || msg.includes('client_name')) {
        const fallback = await supabase
          .from('projects')
          .select('id, address, client_name, status, stages_state')
          .eq('id', projectId)
          .single()
        if (fallback.error && String(fallback.error.message || '').includes('client_name')) {
          const basic = await supabase
            .from('projects')
            .select('id, address, status, stages_state')
            .eq('id', projectId)
            .single()
          project = basic.data as any
          projectError = basic.error
        } else {
          project = fallback.data as any
          projectError = fallback.error
        }
      }
    }

    if (projectError || !project) {
      return NextResponse.json({ error: '找不到工程單位' }, { status: 404 })
    }

    let { data: pendingPhases } = await supabase
      .from('payment_phases')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .order('phase_number', { ascending: true })
      .limit(1)

    let currentPhase = pendingPhases?.[0] || null

    if (!currentPhase) {
      const { data: latestPhase } = await supabase
        .from('payment_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('phase_number', { ascending: false })
        .limit(1)

      const nextPhaseNum =
        latestPhase && latestPhase.length > 0 ? latestPhase[0].phase_number + 1 : 1

      const { data: newPhase, error: insertPhaseError } = await supabase
        .from('payment_phases')
        .insert({ project_id: projectId, phase_number: nextPhaseNum, status: 'pending' })
        .select()
        .single()

      if (insertPhaseError) {
        return NextResponse.json({ error: insertPhaseError.message }, { status: 500 })
      }
      currentPhase = newPhase
    }

    const [{ data: logs }, { data: receipts }, reportsResult] = await Promise.all([
      supabase
        .from('progress_logs')
        .select('id, project_id, title, description, photo_urls, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
      currentPhase
        ? supabase
            .from('receipts')
            .select('*')
            .eq('phase_id', currentPhase.id)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('weekly_reports')
        .select('id, project_id, title, report_date, image_url, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
    ])

    const weeklyReports =
      reportsResult.error && String(reportsResult.error.message || '').includes('weekly_reports')
        ? []
        : reportsResult.data || []

    return NextResponse.json({
      project: {
        id: project.id,
        address: project.address,
        client_name: (project as any).client_name || null,
        status: project.status,
        project_type: (project as any).project_type || 'renovation',
      },
      stages_state: mergeStageState(project.stages_state),
      currentPhase,
      receipts: receipts || [],
      logs: logs || [],
      weeklyReports,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
