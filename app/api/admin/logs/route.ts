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

    if (contentType.includes('application/json')) {
      const body = await request.json()
      projectId = String(body.projectId || '')
      description = String(body.description || '')
      if (Array.isArray(body.photo_urls)) {
        photoUrls = body.photo_urls.filter((u: unknown) => typeof u === 'string')
      } else if (typeof body.photoUrl === 'string' && body.photoUrl) {
        photoUrls = [body.photoUrl]
      }
    } else {
      const form = await request.formData()
      projectId = String(form.get('projectId') || '')
      description = String(form.get('description') || '')
      const photoUrl = String(form.get('photoUrl') || '')
      if (photoUrl) photoUrls = [photoUrl]
    }

    if (!projectId || !description) {
      return NextResponse.json({ error: '請輸入施工進度描述' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase.from('progress_logs').insert({
      project_id: projectId,
      title: '現場施工進度',
      description,
      photo_urls: photoUrls,
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
