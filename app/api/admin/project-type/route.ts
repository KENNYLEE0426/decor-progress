import { NextResponse } from 'next/server'
import { requireAdminSession, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export async function PATCH(request: Request) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const { projectId, project_type } = await request.json()
    if (!projectId || (project_type !== 'renovation' && project_type !== 'repair')) {
      return NextResponse.json({ error: '參數錯誤' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('projects')
      .update({
        project_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, project_type })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
