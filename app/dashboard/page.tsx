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
  stages_state?: Record<string, boolean>
}

// 與 Admin 後台定義相同的工程清單
const INITIAL_STAGES = [
  { category: '清拆工程', items: ['進場清拆', '清拆完成'] },
  { category: '棚架工程', items: ['搭棚', '拆棚'] },
  { category: '鋁窗工程', items: ['度尺', '拆舊窗', '換新窗', '封泥', '外部唧膠防水', '窗邊執修'] },
  { category: '電力工程', items: ['夾位', 'MARK位', '介坑', '放喉', '穿線', '裝制面'] },
  { category: '水喉工程', items: ['夾位', 'MARK位', '介坑', '放喉', '試水', '封泥'] },
  { category: '泥水工程', items: ['間磚牆', '磚牆批盪', '廚房批盪', '浴室批盪', '盪地台', '起基仔', '廚房鋪磚', '浴室鋪磚', '客廳及房間鋪磚'] },
  { category: '防水工程', items: ['清潔表面', '第一層防水塗層', '第二層防水塗層', '第三層防水塗層', '第四層防水塗層'] },
  { category: '雲石工程', items: ['度尺', '裝雲石級咀'] },
  { category: '油漆工程', items: ['剷底', '落批灰角', '批第一浸灰', '批第二浸灰', '批第三浸灰', '磨平牆身灰', '油第一浸面油', '油第二浸面油', '油第三浸面油'] }
]

export default function DashboardPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [logs, setLogs] = useState<ProgressLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [showStageDetails, setShowStageDetails] = useState(true)

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

        // 讀取包含 stages_state 的 Project 資料
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, address, status, stages_state')
          .eq('id', projectId)
          .single()

        if (projectError || !projectData) {
          console.error('搵唔到該單位的 Project 資料:', projectError)
          localStorage.clear()
          window.location.href = '/login'
          return
        }

        setProject(projectData)

        // 抓取該 Project ID 的施工日誌
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
  const stagesState = project?.stages_state || {}

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
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
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

            {/* 進度條 */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>

            {/* 🎯 新增：細項工序進度展開區塊 */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStageDetails(!showStageDetails)}
                className="w-full flex justify-between items-center py-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition"
              >
                <span className="flex items-center gap-2">
                  📋 各項工序完成度明細
                </span>
                <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-500">
                  {showStageDetails ? '收起 ▲' : '展開 ▼'}
                </span>
              </button>

              {showStageDetails && (
                <div className="mt-4 space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {INITIAL_STAGES.map((stage) => {
                    // 計算該階段完成了多少個小項
                    const categoryCompletedCount = stage.items.filter(
                      (item) => stagesState[`${stage.category}-${item}`]
                    ).length
                    const isFullyCompleted = categoryCompletedCount === stage.items.length

                    return (
                      <div key={stage.category} className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50">
                        <div className="flex justify-between items-center mb-2.5">
                          <span className="font-bold text-slate-800 text-sm">
                            {stage.category}
                          </span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            isFullyCompleted
                              ? 'bg-emerald-100 text-emerald-700'
                              : categoryCompletedCount > 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {categoryCompletedCount} / {stage.items.length} 完成
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {stage.items.map((item) => {
                            const isChecked = !!stagesState[`${stage.category}-${item}`]
                            return (
                              <div
                                key={item}
                                className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition ${
                                  isChecked
                                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                                    : 'bg-white border-slate-200/80 text-slate-400'
                                }`}
                              >
                                <span>{isChecked ? '🟢' : '⚪'}</span>
                                <span className={isChecked ? 'font-semibold' : ''}>{item}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
