import { NextResponse } from 'next/server'
import { requireAdminSession, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const contentType = request.headers.get('content-type') || ''
    let projectId = ''
    let description = ''
    let photoUrls: string[] = []
    let createdAt: string | null = null

    if (contentType.includes('application/json')) {
      const body = await request.json()
      projectId = String(body.projectId || '')
      description = String(body.description || '')
      if (Array.isArray(body.photo_urls)) {
        photoUrls = body.photo_urls.filter((u: unknown) => typeof u === 'string')
      } else if (typeof body.photoUrl === 'string' && body.photoUrl) {
        photoUrls = [body.photoUrl]
      }
      if (body.createdAt) createdAt = String(body.createdAt)
    } else {
      const form = await request.formData()
      projectId = String(form.get('projectId') || '')
      description = String(form.get('description') || '')
      const photoUrl = String(form.get('photoUrl') || '')
      if (photoUrl) photoUrls = [photoUrl]
      const createdAtField = String(form.get('createdAt') || '')
      if (createdAtField) createdAt = createdAtField
    }

    if (!projectId || !description) {
      return NextResponse.json({ error: '請輸入施工進度描述' }, { status: 400 })
    }

    photoUrls = photoUrls.filter(Boolean).slice(0, 5)

    let createdAtIso: string | undefined
    if (createdAt) {
      const parsed = new Date(createdAt)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: '發佈時間格式不正確' }, { status: 400 })
      }
      createdAtIso = parsed.toISOString()
    }

    const supabase = createServiceClient()
    const { error } = await supabase.from('progress_logs').insert({
      project_id: projectId,
      title: '現場施工進度',
      description,
      photo_urls: photoUrls,
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
    const { error } = await supabase.from('progress_logs').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
