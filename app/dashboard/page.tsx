'use client'

import { useEffect, useState } from 'react'
import { INITIAL_STAGES } from '@/lib/stages'

interface ProgressLog {
  id: string
  title?: string
  description?: string
  photo_urls?: string[]
  created_at: string
}

interface Project {
  id: string
  address: string
  status: string
  stages_state?: Record<string, any>
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

export default function DashboardPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [logs, setLogs] = useState<ProgressLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [showStageDetails, setShowStageDetails] = useState(true)
  const [showReceipts, setShowReceipts] = useState(true)
  const [showLogsSection, setShowLogsSection] = useState(true)
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set())
  const [phases, setPhases] = useState<PaymentPhase[]>([])
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('')
  const [receipts, setReceipts] = useState<Receipt[]>([])

  const handleLogout = async () => {
    await fetch('/api/client/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const loadDashboard = async () => {
    const res = await fetch('/api/client/dashboard')
    if (res.status === 401) {
      window.location.href = '/login'
      return
    }
    if (!res.ok) {
      throw new Error('載入失敗')
    }
    const data = await res.json()
    const nextLogs: ProgressLog[] = data.logs || []
    setProject(data.project)
    setLogs(nextLogs)
    setPhases(data.phases || [])
    setSelectedPhaseId(data.selectedPhaseId || '')
    setReceipts(data.receipts || [])
    setExpandedLogIds((prev) => {
      if (prev.size > 0) {
        const valid = new Set([...prev].filter((id) => nextLogs.some((l) => l.id === id)))
        if (valid.size > 0) return valid
      }
      return nextLogs[0] ? new Set([nextLogs[0].id]) : new Set()
    })
  }

  useEffect(() => {
    loadDashboard()
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))

    const timer = setInterval(() => {
      loadDashboard().catch(() => {})
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  const handlePhaseChange = async (phaseId: string) => {
    setSelectedPhaseId(phaseId)
    const res = await fetch(`/api/client/receipts?phaseId=${encodeURIComponent(phaseId)}`)
    if (res.ok) {
      const data = await res.json()
      setReceipts(data.receipts || [])
    }
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

  const isItemChecked = (category: string, item: string, state: Record<string, any>) => {
    if (!state?.[category]?.items) return false
    return state[category].items[item] === true
  }

  const toggleLog = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAllLogs = () => setExpandedLogIds(new Set(logs.map((l) => l.id)))
  const collapseAllLogs = () => setExpandedLogIds(new Set())

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f1ee] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-500 text-sm tracking-wide">載入工程資料中</p>
        </div>
      </div>
    )
  }

  const stagesState = project?.stages_state || {}

  let totalStageItemsCount = 0
  let completedStageItemsCount = 0

  INITIAL_STAGES.forEach((stage) => {
    const isCategoryEnabled = stagesState[stage.category]?.enabled ?? true
    if (isCategoryEnabled) {
      stage.items.forEach((item) => {
        totalStageItemsCount++
        if (isItemChecked(stage.category, item, stagesState)) {
          completedStageItemsCount++
        }
      })
    }
  })

  const currentProgress =
    totalStageItemsCount > 0 ? Math.round((completedStageItemsCount / totalStageItemsCount) * 100) : 0

  const totalAmount = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const currentSelectedPhase = phases.find((p) => p.id === selectedPhaseId)

  return (
    <div className="min-h-screen bg-[#f3f1ee] text-stone-800 pb-16">
      <header className="bg-[#1c1917] text-stone-100 sticky top-0 z-40 border-b border-stone-700/60">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-teal-400/90 font-medium">Progress Portal</p>
            <h1 className="text-lg sm:text-xl font-semibold tracking-wide mt-0.5">裝修工程進度查詢</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-stone-600 text-stone-300 hover:bg-stone-800 hover:text-white transition"
          >
            登出
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-5">
        {project && (
          <section className="bg-white rounded-xl border border-stone-200/90 shadow-[0_1px_2px_rgba(28,25,23,0.04)] overflow-hidden">
            <div className="px-5 sm:px-6 py-5 border-b border-stone-100 bg-gradient-to-br from-white to-stone-50">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">工程單位</span>
                  <h2 className="text-xl sm:text-2xl font-semibold text-stone-900 mt-1 leading-snug">
                    {project.address}
                  </h2>
                </div>
                <div className="sm:text-right">
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">整體進度</span>
                  <p className="text-3xl font-semibold tabular-nums text-teal-800 mt-0.5">{currentProgress}%</p>
                </div>
              </div>

              <div className="mt-4 h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-700 transition-all duration-700 ease-out"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>

            <div className="px-5 sm:px-6 py-2 border-b border-stone-100">
              <button
                type="button"
                onClick={() => setShowReceipts(!showReceipts)}
                className="w-full flex justify-between items-center py-3 text-sm font-semibold text-stone-800 hover:text-teal-800 transition"
              >
                <span>材料收費明細</span>
                <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded">
                  {showReceipts ? '收起' : '展開'}
                </span>
              </button>

              {showReceipts && (
                <div className="pb-5 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-stone-50 p-3.5 rounded-lg border border-stone-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-stone-500">期數</span>
                      <select
                        value={selectedPhaseId}
                        onChange={(e) => handlePhaseChange(e.target.value)}
                        className="text-xs p-1.5 border border-stone-300 rounded bg-white font-semibold text-stone-800"
                      >
                        {phases.map((p) => (
                          <option key={p.id} value={p.id}>
                            第 {p.phase_number} 期 {p.status === 'paid' ? '（已結清）' : '（進行中）'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-stone-400 block">本期材料總額</span>
                      <span className="text-lg font-semibold tabular-nums text-stone-900">
                        HK$ {totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {currentSelectedPhase && (
                    <div className="flex justify-between items-center text-xs text-stone-500 px-0.5">
                      <span>
                        {currentSelectedPhase.status === 'paid' ? '狀態：已付清' : '狀態：待付款／核對中'}
                      </span>
                      {currentSelectedPhase.paid_at && (
                        <span>
                          清繳日期：{new Date(currentSelectedPhase.paid_at).toLocaleDateString('zh-HK')}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    {receipts.length === 0 ? (
                      <p className="text-xs text-stone-400 text-center py-4">本期暫無材料單據</p>
                    ) : (
                      receipts.map((r) => (
                        <div
                          key={r.id}
                          className="bg-white p-3 rounded-lg border border-stone-200 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {r.photo_url ? (
                              <img
                                src={r.photo_url}
                                alt="單據"
                                onClick={() => setActiveImage(r.photo_url)}
                                className="w-12 h-12 object-cover rounded-md border border-stone-200 cursor-pointer hover:opacity-80 transition flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-stone-100 rounded-md border border-stone-200 flex items-center justify-center text-stone-400 text-[10px] flex-shrink-0">
                                無圖
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-600 mb-1">
                                {r.category}
                              </span>
                              <p className="text-xs font-medium text-stone-800 truncate">
                                {r.description || '無描述'}
                              </p>
                              <p className="text-[10px] text-stone-400">{formatDate(r.created_at)}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-stone-900 flex-shrink-0">
                            HK$ {r.amount.toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 sm:px-6 py-2">
              <button
                type="button"
                onClick={() => setShowStageDetails(!showStageDetails)}
                className="w-full flex justify-between items-center py-3 text-sm font-semibold text-stone-800 hover:text-teal-800 transition"
              >
                <span>各項工序完成度</span>
                <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded">
                  {showStageDetails ? '收起' : '展開'}
                </span>
              </button>

              {showStageDetails && (
                <div className="pb-5 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {INITIAL_STAGES.map((stage) => {
                    const isCategoryEnabled = stagesState[stage.category]?.enabled ?? true
                    if (!isCategoryEnabled) return null

                    const categoryCompletedCount = stage.items.filter((item) =>
                      isItemChecked(stage.category, item, stagesState)
                    ).length
                    const isFullyCompleted = categoryCompletedCount === stage.items.length

                    return (
                      <div key={stage.category} className="border border-stone-200 rounded-lg p-4 bg-stone-50/70">
                        <div className="flex justify-between items-center mb-2.5">
                          <span className="font-semibold text-stone-800 text-sm">{stage.category}</span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                              isFullyCompleted
                                ? 'bg-teal-50 text-teal-800'
                                : categoryCompletedCount > 0
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-stone-200/80 text-stone-500'
                            }`}
                          >
                            {categoryCompletedCount} / {stage.items.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {stage.items.map((item) => {
                            const isChecked = isItemChecked(stage.category, item, stagesState)
                            return (
                              <div
                                key={item}
                                className={`flex items-center gap-2 p-2 rounded-md text-xs font-medium border ${
                                  isChecked
                                    ? 'bg-teal-50/90 border-teal-200 text-teal-900'
                                    : 'bg-white border-stone-200 text-stone-400'
                                }`}
                              >
                                <span
                                  className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    isChecked ? 'bg-teal-600' : 'bg-stone-300'
                                  }`}
                                />
                                <span>{item}</span>
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
          </section>
        )}

        <section className="bg-white rounded-xl border border-stone-200/90 shadow-[0_1px_2px_rgba(28,25,23,0.04)] overflow-hidden">
          <div className="px-5 sm:px-6 py-3 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowLogsSection(!showLogsSection)}
              className="flex items-center justify-between sm:justify-start gap-3 text-left"
            >
              <h3 className="text-base font-semibold text-stone-900">施工動態紀錄</h3>
              <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded tabular-nums">
                {logs.length} 筆
              </span>
            </button>

            {showLogsSection && logs.length > 0 && (
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={expandAllLogs}
                  className="px-2.5 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
                >
                  全部展開
                </button>
                <button
                  type="button"
                  onClick={collapseAllLogs}
                  className="px-2.5 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
                >
                  全部收起
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogsSection(false)}
                  className="px-2.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition sm:hidden"
                >
                  收起區塊
                </button>
              </div>
            )}

            {!showLogsSection && (
              <button
                type="button"
                onClick={() => setShowLogsSection(true)}
                className="text-[11px] font-medium text-teal-800 hover:underline self-start sm:self-auto"
              >
                展開區塊
              </button>
            )}
          </div>

          {showLogsSection && (
            <div className="divide-y divide-stone-100">
              {logs.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-stone-400">尚未發布任何施工日誌</div>
              ) : (
                logs.map((log) => {
                  const displayContent = log.description || ''
                  const photos = log.photo_urls && log.photo_urls.length > 0 ? log.photo_urls : []
                  const isOpen = expandedLogIds.has(log.id)
                  const preview =
                    displayContent.length > 48 ? `${displayContent.slice(0, 48)}…` : displayContent

                  return (
                    <article key={log.id} className="bg-white">
                      <button
                        type="button"
                        onClick={() => toggleLog(log.id)}
                        className="w-full px-5 sm:px-6 py-4 flex items-start justify-between gap-3 text-left hover:bg-stone-50/80 transition"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h4 className="text-sm font-semibold text-stone-900">
                              {log.title || '現場施工進度'}
                            </h4>
                            <time className="text-[11px] text-stone-400 tabular-nums">
                              {formatDate(log.created_at)}
                            </time>
                          </div>
                          {!isOpen && (
                            <p className="text-xs text-stone-500 truncate">
                              {preview || (photos.length > 0 ? `${photos.length} 張現場照片` : '無內容摘要')}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-stone-500 mt-0.5 flex-shrink-0">
                          {isOpen ? '收起' : '展開'}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-5 sm:px-6 pb-5 space-y-3">
                          {displayContent && (
                            <p className="text-sm leading-relaxed text-stone-600 bg-stone-50 p-3.5 rounded-lg border border-stone-100 whitespace-pre-line">
                              {displayContent}
                            </p>
                          )}

                          {photos.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                                現場照片 · {photos.length}
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {photos.map((url, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => setActiveImage(url)}
                                    className="relative aspect-square bg-stone-100 rounded-lg overflow-hidden border border-stone-200 hover:opacity-90 transition"
                                  >
                                    <img
                                      src={url}
                                      alt={`施工照片 ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })
              )}
            </div>
          )}
        </section>
      </main>

      {activeImage && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute -top-12 right-0 text-stone-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm transition"
            >
              關閉
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
