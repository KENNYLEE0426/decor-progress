'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface ProgressLog {
  id: string
  title: string
  description: string
  progress_percent: number
  photo_urls: string[]
  created_at: string
}

interface Project {
  id: string
  address: string
  status: string
}

export default function DashboardPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [logs, setLogs] = useState<ProgressLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState<string | null>(null)

  const supabase = createClient()

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = '/login'
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectId = localStorage.getItem('client_project_id')

        if (!projectId) {
          window.location.href = '/login'
          return
        }

        // 精準鎖定當前登入帳號的 Project ID
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (projectError || !projectData) {
          console.error('搵唔到該單位的 Project 資料:', projectError)
          localStorage.clear()
          window.location.href = '/login'
          return
        }

        setProject(projectData)

        // 精準抓取該 Project ID 的施工日誌
        const { data: logData } = await supabase
          .from('progress_logs')
          .select('*')
          .eq('project_id', projectData.id)
          .order('created_at', { ascending: false })

        if (logData) setLogs(logData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-HK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">正在載入施工日誌...</p>
        </div>
      </div>
    )
  }

  const currentProgress = logs.length > 0 ? logs[0].progress_percent : 0

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-wide">裝修工程進度查詢</h1>
            <p className="text-xs text-slate-400 mt-0.5">即時施工日誌與現場照片</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition"
          >
            登出頁面
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {project && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">工程單位</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{project.address}</h2>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">當前整體進度</span>
                <p className="text-3xl font-extrabold text-blue-600">{currentProgress}%</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>施工動態紀錄</span>
            <span className="text-xs font-normal text-slate-500">({logs.length} 筆更新)</span>
          </h3>

          {logs.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
              尚未發布任何施工日誌。
            </div>
          ) : (
            logs.map((log) => (
              <article
                key={log.id}
                className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 transition hover:shadow-md space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-lg font-bold text-slate-900">{log.title}</h4>
                  <time className="text-xs text-slate-400 font-medium">
                    📅 {formatDate(log.created_at)}
                  </time>
                </div>

                {log.description && (
                  <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-line">
                    {log.description}
                  </p>
                )}

                {log.photo_urls && log.photo_urls.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-400 tracking-wider">
                      施工現場照片 ({log.photo_urls.length} 張)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {log.photo_urls.map((url, index) => (
                        <div
                          key={index}
                          onClick={() => setActiveImage(url)}
                          className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer border border-slate-200/60 shadow-sm hover:opacity-95 transition"
                        >
                          <img
                            src={url}
                            alt={`施工照片 ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </main>

      {activeImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm transition"
            >
              ✕ 關閉
            </button>
            <img
              src={activeImage}
              alt="施工放大圖"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
