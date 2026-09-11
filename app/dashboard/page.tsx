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
  client_name?: string | null
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

interface WeeklyReport {
  id: string
  title: string
  report_date?: string | null
  image_url: string
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
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([])
  const [showWeeklyReports, setShowWeeklyReports] = useState(true)
  const [showWhatsApp, setShowWhatsApp] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboard_whatsapp_open')
      if (saved === '0') setShowWhatsApp(false)
    } catch {
      // ignore
    }
  }, [])

  const setWhatsAppOpen = (open: boolean) => {
    setShowWhatsApp(open)
    try {
      localStorage.setItem('dashboard_whatsapp_open', open ? '1' : '0')
    } catch {
      // ignore
    }
  }

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
    setWeeklyReports(data.weeklyReports || [])
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
                  {project.client_name?.trim() && (
                    <p className="text-sm text-stone-600 mt-1.5">
                      客戶：<span className="font-medium text-stone-800">{project.client_name.trim()}</span>
                    </p>
                  )}
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
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded border border-stone-200 bg-stone-50 text-base font-semibold text-stone-700 leading-none"
                  aria-hidden="true"
                >
                  {showReceipts ? '－' : '＋'}
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
          </section>
        )}

        <section className="bg-white rounded-xl border border-stone-200/90 shadow-[0_1px_2px_rgba(28,25,23,0.04)] overflow-hidden">
          <div className="px-5 sm:px-6 py-3 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowLogsSection(!showLogsSection)}
              className="flex items-center justify-between sm:justify-start gap-3 text-left w-full sm:w-auto"
            >
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="text-base font-semibold text-stone-900">施工動態紀錄</h3>
                <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded tabular-nums">
                  {logs.length} 筆
                </span>
              </div>
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded border border-stone-200 bg-stone-50 text-base font-semibold text-stone-700 leading-none flex-shrink-0"
                aria-hidden="true"
              >
                {showLogsSection ? '－' : '＋'}
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
              </div>
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
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded border border-stone-200 bg-stone-50 text-base font-semibold text-stone-700 leading-none flex-shrink-0 mt-0.5"
                          aria-hidden="true"
                        >
                          {isOpen ? '－' : '＋'}
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
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
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

        {project && (
          <section className="bg-white rounded-xl border border-stone-200/90 shadow-[0_1px_2px_rgba(28,25,23,0.04)] overflow-hidden">
            <div className="px-5 sm:px-6 py-2">
              <button
                type="button"
                onClick={() => setShowStageDetails(!showStageDetails)}
                className="w-full flex justify-between items-center py-3 text-sm font-semibold text-stone-800 hover:text-teal-800 transition"
              >
                <span>各項工序完成度</span>
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded border border-stone-200 bg-stone-50 text-base font-semibold text-stone-700 leading-none"
                  aria-hidden="true"
                >
                  {showStageDetails ? '－' : '＋'}
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
          <div className="px-5 sm:px-6 py-2">
            <button
              type="button"
              onClick={() => setShowWeeklyReports(!showWeeklyReports)}
              className="w-full flex justify-between items-center py-3 text-sm font-semibold text-stone-800 hover:text-teal-800 transition"
            >
              <span className="flex items-center gap-2">
                週期工作進度報告
                <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded tabular-nums">
                  {weeklyReports.length} 份
                </span>
              </span>
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded border border-stone-200 bg-stone-50 text-base font-semibold text-stone-700 leading-none"
                aria-hidden="true"
              >
                {showWeeklyReports ? '－' : '＋'}
              </span>
            </button>

            {showWeeklyReports && (
              <div className="pb-5 space-y-2">
                {weeklyReports.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-6">暫未上載週期報告</p>
                ) : (
                  weeklyReports.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActiveImage(r.image_url)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-stone-200 bg-stone-50/70 hover:bg-stone-50 hover:border-stone-300 transition text-left"
                    >
                      <img
                        src={r.image_url}
                        alt={r.title}
                        className="w-16 h-16 object-cover rounded-md border border-stone-200 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-900 truncate">{r.title}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5 tabular-nums">
                          {r.report_date
                            ? new Date(r.report_date).toLocaleDateString('zh-HK')
                            : formatDate(r.created_at)}
                        </p>
                        <p className="text-[11px] text-teal-800 mt-1 font-medium">撳此查看報告圖片</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2">
        {showWhatsApp ? (
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setWhatsAppOpen(false)}
              className="text-[11px] font-medium text-stone-600 bg-white/95 border border-stone-200 shadow-sm px-2.5 py-1 rounded-md hover:bg-stone-50 transition"
            >
              收起
            </button>
            <a
              href="https://wa.me/85298182741"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#128C7E] hover:bg-[#0e6f64] shadow-lg transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp 裝修仔Kenny
            </a>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setWhatsAppOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-white bg-[#128C7E] hover:bg-[#0e6f64] shadow-md transition"
            aria-label="展開 WhatsApp 聯絡"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            聯絡
          </button>
        )}
      </div>

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
