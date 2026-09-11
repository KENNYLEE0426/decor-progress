import { NextResponse } from 'next/server'
import { requireAdminSession, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const body = await request.json()
    const projectId = String(body.projectId || '')
    const title = String(body.title || '').trim()
    const imageUrl = String(body.imageUrl || '').trim()
    const reportDate = body.reportDate ? String(body.reportDate) : null

    if (!projectId || !title || !imageUrl) {
      return NextResponse.json({ error: '請填寫標題並上傳 JPG 報告' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase.from('weekly_reports').insert({
      project_id: projectId,
      title,
      report_date: reportDate || null,
      image_url: imageUrl,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase.from('weekly_reports').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
