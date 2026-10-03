-- 若週報 PDF 上傳失敗（mime type not allowed），喺 SQL Editor 跑一次
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
]
where id = 'progress-photos';
