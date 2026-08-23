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

interface PaymentPhase {
  id: string
  phase_number: number
  status: string
  paid_at: string | null
}

interface Receipt {
  id: string
  category: string
  amount: number
  description: string
  photo_url: string
  phase_id: string
  created_at: string
}

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
  
  // 材料收費 UI 狀態
  const [showReceipts, setShowReceipts] = useState(true)
  const [phases, setPhases] = useState<PaymentPhase[]>([])
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('')
  const [receipts, setReceipts] = useState<Receipt[]>([])

  const supabase = createClient()

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = '/login'
  }

  useEffect(() => {
    let projectSubscription: any

    const fetchData = async () => {
      try {
        const projectId = localStorage.getItem('client_project_id')
        if (!projectId) {
          window.location.href = '/login'
          return
        }

        const { data: projectData } = await supabase
          .from('projects')
          .select('id, address, status, stages_state')
          .eq('id', projectId)
          .single()

        if (projectData) setProject(projectData)

        const { data: logData } = await supabase
          .from('progress_logs')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

        if (logData) setLogs(logData)

        // 載入材料收費期數與單據
        fetchPhasesAndReceipts(projectId)

        // Realtime 監聽
        projectSubscription = supabase
          .channel(`project_realtime_${projectId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, (payload) => {
            if (payload.new) setProject((prev) => (prev ? { ...prev, ...payload.new } : (payload.new as Project)))
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts', filter: `id=eq.${projectId}` }, () => {
            fetchPhasesAndReceipts(projectId)
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_phases', filter: `id=eq.${projectId}` }, () => {
            fetchPhasesAndReceipts(projectId)
          })
          .subscribe()

      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      if (projectSubscription) supabase.removeChannel(projectSubscription)
    }
  }, [])

  const fetchPhasesAndReceipts = async (projectId: string) => {
    const { data: phaseData } = await supabase
      .from('payment_phases')
      .select('*')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: false })

    if (phaseData && phaseData.length > 0) {
      setPhases(phaseData)
      // 預設選擇最新的一期
      const activePhase = phaseData.find(p => p.status === 'pending') || phaseData[0]
      setSelectedPhaseId(activePhase.id)
      loadReceiptsByPhase(projectId, activePhase.id)
    }
  }

  const loadReceiptsByPhase = async (projectId: string, phaseId: string) => {
    const { data: receiptData } = await supabase
      .from('receipts')
      .select('*')
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .order('created_at', { ascending: false })

    if (receiptData) setReceipts(receiptData)
  }

  const handlePhaseChange = (phaseId: string) => {
    setSelectedPhaseId(phaseId)
    if (project) loadReceiptsByPhase(project.id, phaseId)
  }

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

  // 計算選定期數的總金額
  const totalAmount = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const currentSelectedPhase = phases.find(p => p.id === selectedPhaseId)

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

            {/* 🧾 🎯 材料收費區（可收起、計算金額、切換歷史期數） */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReceipts(!showReceipts)}
                className="w-full flex justify-between items-center py-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition"
              >
                <span className="flex items-center gap-2">
                  🧾 材料收費明細
                </span>
                <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-500">
                  {showReceipts ? '收起 ▲' : '展開 ▼'}
                </span>
              </button>

              {showReceipts && (
                <div className="mt-3 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                  {/* 期數選擇與總金額算計 */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">期數選擇：</span>
                      <select
                        value={selectedPhaseId}
                        onChange={(e) => handlePhaseChange(e.target.value)}
                        className="text-xs p-1.5 border rounded-md bg-slate-50 font-bold text-slate-700"
                      >
                        {phases.map((p) => (
                          <option key={p.id} value={p.id}>
                            第 {p.phase_number} 期 {p.status === 'paid' ? '（已結清）' : '（進行中）'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">本期材料總金額</span>
                      <span className="text-xl font-extrabold text-emerald-600">
                        HK$ {totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* 狀態標籤 */}
                  {currentSelectedPhase && (
                    <div className="flex justify-between items-center text-xs px-1">
                      <span className="text-slate-500">
                        狀態：{currentSelectedPhase.status === 'paid' ? '🟢 已付清金額' : '⏳ 待付款 / 明細核對中'}
                      </span>
                      {currentSelectedPhase.paid_at && (
                        <span className="text-slate-400">
                          清繳日期：{new Date(currentSelectedPhase.paid_at).toLocaleDateString('zh-HK')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 單據明細清單 */}
                  <div className="space-y-2">
                    {receipts.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4 italic">本期暫無材料單據紀錄</p>
                    ) : (
                      receipts.map((r) => (
                        <div key={r.id} className="bg-white p-3 rounded-lg border border-slate-200/80 flex items-center justify-between gap-3 shadow-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            {r.photo_url ? (
                              <img
                                src={r.photo_url}
                                alt="單據"
                                onClick={() => setActiveImage(r.photo_url)}
                                className="w-12 h-12 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 rounded-lg border flex items-center justify-center text-slate-400 text-xs flex-shrink-0">
                                無相片
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 mb-1">
                                {r.category}
                              </span>
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {r.description || '無描述'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {formatDate(r.created_at)}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-extrabold text-slate-900 flex-shrink-0">
                            HK$ {r.amount.toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 細項工序進度區塊 */}
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
                    const catKey = `CATEGORY_ENABLED-${stage.category}`
                    const isCategoryEnabled = stagesState[catKey] !== false

                    if (!isCategoryEnabled) return null

                    const categoryCompletedCount = stage.items.filter((item) => {
                      const itemKey = `${stage.category}-${item}`
                      return !!stagesState[itemKey]
                    }).length

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
                            const itemKey = `${stage.category}-${item}`
                            const isChecked = !!stagesState[itemKey]

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
