/** Compress/resize image in browser to avoid Vercel request body limits. */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
  )
  if (!blob) return file

  const name = file.name.replace(/\.\w+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

export async function uploadAdminPhoto(
  file: File,
  folder: 'logs' | 'receipts' | 'reports'
): Promise<string> {
  // 週報需要睇得清文字，用較大尺寸
  const compressed =
    folder === 'reports' ? await compressImage(file, 2800, 0.88) : await compressImage(file)
  const metaRes = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder,
      fileName: compressed.name,
      contentType: compressed.type || 'image/jpeg',
    }),
  })
  const metaText = await metaRes.text()
  let meta: any = {}
  try {
    meta = JSON.parse(metaText)
  } catch {
    throw new Error(metaText.slice(0, 120) || '取得上傳連結失敗')
  }
  if (!metaRes.ok) throw new Error(meta.error || '取得上傳連結失敗')

  const putRes = await fetch(meta.signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': compressed.type || 'image/jpeg',
    },
    body: compressed,
  })
  if (!putRes.ok) {
    const t = await putRes.text().catch(() => '')
    throw new Error(t.slice(0, 120) || '相片上傳失敗')
  }

  return meta.publicUrl as string
}

export async function readJsonSafe(res: Response) {
  const text = await res.text()
  try {
    return { data: JSON.parse(text), text }
  } catch {
    return { data: { error: text.slice(0, 160) || '伺服器回傳非 JSON' }, text }
  }
}
