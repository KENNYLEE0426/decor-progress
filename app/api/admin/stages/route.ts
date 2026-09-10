import { NextResponse } from 'next/server'
import { requireAdminSession, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export async function PATCH(request: Request) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const { projectId, stages_state } = await request.json()
    if (!projectId || !stages_state) {
      return NextResponse.json({ error: '缺少參數' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('projects')
      .update({
        stages_state,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
