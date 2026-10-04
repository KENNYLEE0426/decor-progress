import { NextResponse } from 'next/server'
import { requireAdminSession, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const body = await request.json()
    const projectId = String(body.projectId || '')
    const title = String(body.title || '').trim()
    const fileUrl = String(body.fileUrl || '').trim()
    const createdAt = body.createdAt ? String(body.createdAt) : null

    if (!projectId || !title || !fileUrl) {
      return NextResponse.json({ error: '請填寫標題並上傳 PDF' }, { status: 400 })
    }

    let createdAtIso: string | undefined
    if (createdAt) {
      const parsed = new Date(createdAt)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: '文件時間格式不正確' }, { status: 400 })
      }
      createdAtIso = parsed.toISOString()
    }

    const supabase = createServiceClient()
    const { error } = await supabase.from('project_documents').insert({
      project_id: projectId,
      title,
      file_url: fileUrl,
      ...(createdAtIso ? { created_at: createdAtIso } : {}),
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
    const { error } = await supabase.from('project_documents').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
