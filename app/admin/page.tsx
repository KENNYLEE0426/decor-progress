'use client'

import { useEffect, useState } from 'react'
import { INITIAL_STAGES } from '@/lib/stages'
import { readJsonSafe, uploadAdminPhoto } from '@/lib/admin-upload'

interface Project {
  id: string
  address: string
  client_name?: string | null
  status: string
  created_at?: string
}

interface PaymentPhase {
  id: string
  phase_number: number
  status: string
  paid_at: string | null
}

interface Receipt {
  id: string
  project_id: string
  phase_id: string
  category: string
  amount: number
  description: string
  photo_url: string
  created_at: string
}

interface ProgressLog {
  id: string
  project_id: string
  title?: string
  description?: string
  photo_urls?: string[]
  created_at: string
}

interface WeeklyReport {
  id: string
  project_id?: string
  title: string
  report_date?: string | null
  image_url: string
  created_at: string
}

interface StageState {
  [category: string]: {
    enabled: boolean
    items: { [item: string]: boolean }
  }
}

const CATEGORIES = INITIAL_STAGES.map((s) => s.category)

const inputClass =
  'w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition'
const labelClass = 'block text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500 mb-1.5'
const cardClass =
  'bg-white rounded-xl border border-stone-200/90 shadow-[0_1px_2px_rgba(28,25,23,0.04)] overflow-hidden'
const primaryBtnClass =
  'w-full bg-[#1c1917] hover:bg-stone-800 disabled:opacity-60 text-stone-50 font-semibold py-2.5 rounded-lg transition text-sm'
const secondaryBtnClass =
  'bg-teal-800 hover:bg-teal-900 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition'
const dangerBtnClass =
  'px-2.5 py-1 bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-700 border border-stone-200 text-xs font-medium rounded transition'

export default function AdminPage() {
  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState(false)
  const [loginErrorMsg, setLoginErrorMsg] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const [currentPhase, setCurrentPhase] = useState<PaymentPhase | null>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [receiptCategory, setReceiptCategory] = useState(CATEGORIES[0])
  const [receiptAmount, setReceiptAmount] = useState('')
  const [receiptDescription, setReceiptDescription] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const [receiptStatusMsg, setReceiptStatusMsg] = useState('')

  const [logs, setLogs] = useState<ProgressLog[]>([])
  const [logContent, setLogContent] = useState('')
  const [logFiles, setLogFiles] = useState<File[]>([])
  const [logFilePreviews, setLogFilePreviews] = useState<string[]>([])
  const [isUploadingLog, setIsUploadingLog] = useState(false)
  const [logStatusMsg, setLogStatusMsg] = useState('')

  const MAX_LOG_PHOTOS = 5

  useEffect(() => {
    const urls = logFiles.map((f) => URL.createObjectURL(f))
    setLogFilePreviews(urls)
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [logFiles])

  const [stageState, setStageState] = useState<StageState>({})
  const [isSavingStages, setIsSavingStages] = useState(false)

  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([])
  const [reportTitle, setReportTitle] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [isUploadingReport, setIsUploadingReport] = useState(false)
  const [reportStatusMsg, setReportStatusMsg] = useState('')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/admin/check')
        if (res.ok) {
          setIsAuthenticated(true)
          await fetchProjects()
        }
      } finally {
        setAuthChecking(false)
      }
    }
    check()
  }, [])

  const fetchProjects = async (preferredId?: string) => {
    const res = await fetch('/api/admin/projects')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data.error || '載入工程單位失敗')
      return
    }
    const list: Project[] = data.projects || []
    setProjects(list)
    if (list.length > 0) {
      const nextId =
        (preferredId && list.some((p) => p.id === preferredId) && preferredId) || list[0].id
      setSelectedProjectId(nextId)
      await loadProjectData(nextId)
    }
  }

  const loadProjectData = async (projectId: string) => {
    setCurrentPhase(null)
    setReceipts([])
    setLogs([])
    setWeeklyReports([])
    setReceiptStatusMsg('')
    setLogStatusMsg('')
    setReportStatusMsg('')

    const res = await fetch(`/api/admin/projects/${projectId}/bundle`)
    if (!res.ok) {
      alert('載入工程資料失敗')
      return
    }
    const data = await res.json()
    setCurrentPhase(data.currentPhase || null)
    setReceipts(data.receipts || [])
    setLogs(data.logs || [])
    setWeeklyReports(data.weeklyReports || [])
    setStageState(data.stages_state || {})
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(false)
    setLoginErrorMsg('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoginError(true)
        setLoginErrorMsg(data.error || '密碼錯誤，請重新輸入')
        return
      }
      setIsAuthenticated(true)
      setPasswordInput('')
      await fetchProjects()
    } catch {
      setLoginError(true)
      setLoginErrorMsg('登入失敗，請稍後再試')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setIsAuthenticated(false)
    setProjects([])
    setSelectedProjectId('')
  }

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    loadProjectData(projectId)
  }

  const handleAddReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !currentPhase || !receiptAmount) {
      alert('請輸入有效金額')
      return
    }

    setIsUploadingReceipt(true)
    setReceiptStatusMsg('處理中…')

    try {
      let photoUrl = ''
      if (receiptFile) {
        setReceiptStatusMsg('上傳相片中…')
        photoUrl = await uploadAdminPhoto(receiptFile, 'receipts')
      }

      const res = await fetch('/api/admin/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          phaseId: currentPhase.id,
          category: receiptCategory,
          amount: receiptAmount,
          description: receiptDescription,
          photoUrl,
        }),
      })
      const { data } = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || '新增失敗')

      setReceiptStatusMsg('單據新增成功')
      setReceiptAmount('')
      setReceiptDescription('')
      setReceiptFile(null)
      await loadProjectData(selectedProjectId)
    } catch (err: any) {
      setReceiptStatusMsg(`新增失敗：${err.message || '未知錯誤'}`)
    } finally {
      setIsUploadingReceipt(false)
    }
  }

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!confirm('確定要刪除這筆單據嗎？')) return

    const res = await fetch('/api/admin/receipts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: receiptId }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(`刪除失敗: ${data.error || '未知錯誤'}`)
      return
    }
    await loadProjectData(selectedProjectId)
  }

  const handleConfirmPhasePayment = async () => {
    if (!currentPhase || !selectedProjectId) return
    if (!confirm(`確定第 ${currentPhase.phase_number} 期已收到所有款項並開展下一期？`)) return

    const res = await fetch('/api/admin/phases/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseId: currentPhase.id, projectId: selectedProjectId }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || '操作失敗')
      return
    }
    await loadProjectData(selectedProjectId)
  }

  const handleAddProgressLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !logContent) {
      alert('請輸入施工進度描述')
      return
    }

    setIsUploadingLog(true)
    setLogStatusMsg('處理中…')

    try {
      const photoUrls: string[] = []
      if (logFiles.length > 0) {
        for (let i = 0; i < logFiles.length; i++) {
          setLogStatusMsg(`上傳相片中…（${i + 1}/${logFiles.length}）`)
          const url = await uploadAdminPhoto(logFiles[i], 'logs')
          photoUrls.push(url)
        }
      }

      const res = await fetch('/api/admin/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          description: logContent,
          photo_urls: photoUrls,
        }),
      })
      const { data } = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || '新增失敗')

      setLogStatusMsg('施工動態新增成功')
      setLogContent('')
      setLogFiles([])
      await loadProjectData(selectedProjectId)
    } catch (err: any) {
      setLogStatusMsg(`新增失敗：${err.message || '未知錯誤'}`)
    } finally {
      setIsUploadingLog(false)
    }
  }

  const handlePickLogFiles = (fileList: FileList | null) => {
    if (!fileList) return
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    setLogFiles((prev) => {
      const merged = [...prev, ...incoming].slice(0, MAX_LOG_PHOTOS)
      return merged
    })
  }

  const removeLogFile = (index: number) => {
    setLogFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('確定要刪除這條施工動態嗎？')) return

    const res = await fetch('/api/admin/logs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: logId }),
    })
    if (!res.ok) {
      const data = await res.json()
      alert(`刪除失敗: ${data.error || '未知錯誤'}`)
      return
    }
    await loadProjectData(selectedProjectId)
  }

  const handleToggleCategory = async (category: string) => {
    const previous = stageState
    const updated = {
      ...stageState,
      [category]: {
        ...stageState[category],
        enabled: !stageState[category]?.enabled,
      },
    }
    setStageState(updated)
    const ok = await saveStages(updated)
    if (!ok) setStageState(previous)
  }

  const handleToggleStageItem = async (category: string, item: string) => {
    const previous = stageState
    const updated = {
      ...stageState,
      [category]: {
        ...stageState[category],
        items: {
          ...stageState[category]?.items,
          [item]: !stageState[category]?.items?.[item],
        },
      },
    }
    setStageState(updated)
    const ok = await saveStages(updated)
    if (!ok) setStageState(previous)
  }

  const saveStages = async (updatedState: StageState) => {
    if (!selectedProjectId) return false
    setIsSavingStages(true)
    try {
      const res = await fetch('/api/admin/stages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, stages_state: updatedState }),
      })
      const { data } = await readJsonSafe(res)
      if (!res.ok) {
        alert(`同步失敗: ${data.error || '未知錯誤'}`)
        return false
      }
      return true
    } catch (err: any) {
      alert(`同步失敗: ${err.message || '未知錯誤'}`)
      return false
    } finally {
      setIsSavingStages(false)
    }
  }

  const handleAddWeeklyReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !reportTitle.trim() || !reportFile) {
      alert('請填寫報告標題並選擇 JPG 圖片')
      return
    }

    setIsUploadingReport(true)
    setReportStatusMsg('上傳報告中…')

    try {
      const imageUrl = await uploadAdminPhoto(reportFile, 'reports')
      const res = await fetch('/api/admin/weekly-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: reportTitle.trim(),
          reportDate: reportDate || null,
          imageUrl,
        }),
      })
      const { data } = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || '新增失敗')

      setReportStatusMsg('週報新增成功')
      setReportTitle('')
      setReportDate('')
      setReportFile(null)
      await loadProjectData(selectedProjectId)
    } catch (err: any) {
      setReportStatusMsg(`新增失敗：${err.message || '未知錯誤'}`)
    } finally {
      setIsUploadingReport(false)
    }
  }

  const handleDeleteWeeklyReport = async (id: string) => {
    if (!confirm('確定刪除這份週期報告？')) return
    const res = await fetch('/api/admin/weekly-reports', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const { data } = await readJsonSafe(res)
      alert(data.error || '刪除失敗')
      return
    }
    await loadProjectData(selectedProjectId)
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#f3f1ee] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-500 text-sm tracking-wide">驗證登入狀態中</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f3f1ee] text-stone-800 flex flex-col">
        <header className="bg-[#1c1917] text-stone-100 border-b border-stone-700/60">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-teal-400/90 font-medium">Admin Portal</p>
            <h1 className="text-lg sm:text-xl font-semibold tracking-wide mt-0.5">工程管理後台</h1>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className={`w-full max-w-md ${cardClass}`}>
            <div className="px-6 py-5 border-b border-stone-100 bg-gradient-to-br from-white to-stone-50">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">管理員登入</p>
              <h2 className="text-xl font-semibold text-stone-900 mt-1">進入工程管理</h2>
              <p className="text-xs text-stone-500 mt-2">請輸入管理員密碼</p>
            </div>
            <form onSubmit={handleLogin} className="px-6 py-6 space-y-4">
              <div>
                <label className={labelClass}>密碼</label>
                <input
                  type="password"
                  placeholder="管理員密碼"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className={inputClass}
                />
              </div>
              {loginError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  {loginErrorMsg || '密碼錯誤，請重新輸入'}
                </p>
              )}
              <button type="submit" disabled={loginLoading} className={primaryBtnClass}>
                {loginLoading ? '登入中…' : '登入後台'}
              </button>
            </form>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f1ee] text-stone-800 pb-16">
      <header className="bg-[#1c1917] text-stone-100 sticky top-0 z-40 border-b border-stone-700/60">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-teal-400/90 font-medium">Admin Portal</p>
            <h1 className="text-lg sm:text-xl font-semibold tracking-wide mt-0.5">工程管理後台</h1>
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
        <section className={`${cardClass} p-5 space-y-2`}>
          <label className={labelClass}>選擇工程單位</label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleSelectProject(e.target.value)}
            className={`${inputClass} font-semibold`}
          >
            {projects.length === 0 ? (
              <option value="" disabled>
                暫無工程單位
              </option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client_name?.trim() ? `${p.client_name.trim()} · ${p.address}` : p.address}
                </option>
              ))
            )}
          </select>
        </section>

        <section className={cardClass}>
          <div className="px-5 sm:px-6 py-4 border-b border-stone-100 bg-gradient-to-br from-white to-stone-50">
            <h2 className="text-base font-semibold text-stone-900">新增施工動態</h2>
            <p className="text-xs text-stone-500 mt-1">發佈進度說明與現場照片</p>
          </div>

          <div className="px-5 sm:px-6 py-5 space-y-4">
            <form onSubmit={handleAddProgressLog} className="space-y-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
              <div>
                <label className={labelClass}>施工紀錄描述</label>
                <textarea
                  rows={3}
                  placeholder="例：今日已完成大廳電線開槽及埋喉工作"
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>現場相片（可選，最多 {MAX_LOG_PHOTOS} 張）</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handlePickLogFiles(e.target.files)
                    e.target.value = ''
                  }}
                  className={`${inputClass} file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-stone-200 file:text-stone-700 file:text-xs`}
                />
                {logFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {logFiles.map((file, index) => (
                      <div key={`${file.name}-${file.size}-${index}`} className="relative aspect-square">
                        <img
                          src={logFilePreviews[index] || ''}
                          alt={`預覽 ${index + 1}`}
                          className="w-full h-full object-cover rounded-md border border-stone-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeLogFile(index)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-stone-800 text-white text-xs leading-none"
                          aria-label="移除相片"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-stone-400 mt-1.5">
                  已選 {logFiles.length} / {MAX_LOG_PHOTOS} 張
                </p>
              </div>

              <button type="submit" disabled={isUploadingLog} className={primaryBtnClass}>
                {isUploadingLog ? '發佈中…' : '發佈施工動態'}
              </button>

              {logStatusMsg && (
                <p
                  className={`text-xs text-center font-medium ${
                    logStatusMsg.includes('失敗') ? 'text-red-700' : 'text-teal-800'
                  }`}
                >
                  {logStatusMsg}
                </p>
              )}
            </form>

            <div className="space-y-3 pt-1">
              <h3 className="text-sm font-semibold text-stone-900">
                歷史紀錄
                <span className="ml-2 text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded tabular-nums">
                  {logs.length} 筆
                </span>
              </h3>
              {logs.length === 0 ? (
                <p className="text-xs text-stone-400 py-2">暫無施工紀錄</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {logs.map((log) => {
                    const photos = log.photo_urls && log.photo_urls.length > 0 ? log.photo_urls : []
                    const text = log.description || ''

                    return (
                      <div
                        key={log.id}
                        className="flex justify-between items-start bg-white p-3 rounded-lg border border-stone-200 gap-3"
                      >
                        <div className="min-w-0 space-y-2 flex-1">
                          <p className="text-sm font-medium text-stone-900 whitespace-pre-wrap">{text}</p>
                          {photos.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {photos.map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt={`Progress ${i + 1}`}
                                  className="w-12 h-12 object-cover rounded-md border border-stone-200"
                                />
                              ))}
                            </div>
                          )}
                          <p className="text-[11px] text-stone-400 tabular-nums">
                            {new Date(log.created_at).toLocaleString('zh-HK')}
                            {photos.length > 0 ? ` · ${photos.length} 張相` : ''}
                          </p>
                        </div>
                        <button onClick={() => handleDeleteLog(log.id)} className={`${dangerBtnClass} flex-shrink-0`}>
                          刪除
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className="px-5 sm:px-6 py-4 border-b border-stone-100 bg-gradient-to-br from-white to-stone-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-semibold text-stone-900">材料收費管理</h2>
              <p className="text-xs text-teal-800 font-medium mt-1">
                當前：第 {currentPhase?.phase_number || 1} 期收款
              </p>
            </div>
            <button onClick={handleConfirmPhasePayment} className={secondaryBtnClass}>
              確認第 {currentPhase?.phase_number || 1} 期已收款
            </button>
          </div>

          <div className="px-5 sm:px-6 py-5 space-y-5">
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-4">
              <h3 className="text-sm font-semibold text-stone-900">
                新增材料單據（第 {currentPhase?.phase_number || 1} 期）
              </h3>

              <form onSubmit={handleAddReceipt} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>所屬工程</label>
                    <select
                      value={receiptCategory}
                      onChange={(e) => setReceiptCategory(e.target.value)}
                      className={inputClass}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>單據金額 (HKD)</label>
                    <input
                      type="number"
                      placeholder="例：1500"
                      value={receiptAmount}
                      onChange={(e) => setReceiptAmount(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>單據相片</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className={`${inputClass} file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-stone-200 file:text-stone-700 file:text-xs`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>單據描述／備註</label>
                  <input
                    type="text"
                    placeholder="例：買客廳電線喉管及制面"
                    value={receiptDescription}
                    onChange={(e) => setReceiptDescription(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <button type="submit" disabled={isUploadingReceipt} className={primaryBtnClass}>
                  {isUploadingReceipt ? '正在新增…' : '新增此單據'}
                </button>

                {receiptStatusMsg && (
                  <p
                    className={`text-xs text-center font-medium ${
                      receiptStatusMsg.includes('失敗') ? 'text-red-700' : 'text-teal-800'
                    }`}
                  >
                    {receiptStatusMsg}
                  </p>
                )}
              </form>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-900">
                本期單據
                <span className="ml-2 text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded tabular-nums">
                  {receipts.length} 筆
                </span>
              </h3>

              {receipts.length === 0 ? (
                <p className="text-xs text-stone-400 py-2">本期暫無單據</p>
              ) : (
                <div className="space-y-2">
                  {receipts.map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between items-center bg-white p-3 rounded-lg border border-stone-200 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {r.photo_url ? (
                          <img
                            src={r.photo_url}
                            alt="Receipt"
                            className="w-10 h-10 object-cover rounded-md border border-stone-200"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-stone-100 rounded-md border border-stone-200 flex items-center justify-center text-[10px] text-stone-400">
                            無圖
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-900">
                            <span className="text-stone-500">[{r.category}]</span> {r.description || '無備註'}
                          </p>
                          <p className="text-[11px] text-stone-400 tabular-nums">
                            {new Date(r.created_at).toLocaleDateString('zh-HK')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-semibold tabular-nums text-stone-900">HK$ {r.amount}</span>
                        <button onClick={() => handleDeleteReceipt(r.id)} className={dangerBtnClass}>
                          刪除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className="px-5 sm:px-6 py-4 border-b border-stone-100 bg-gradient-to-br from-white to-stone-50 flex justify-between items-center">
            <div>
              <h2 className="text-base font-semibold text-stone-900">各項工序完成度</h2>
              <p className="text-xs text-stone-500 mt-1">勾選後會自動同步至前台</p>
            </div>
            {isSavingStages && (
              <span className="text-[11px] font-medium text-teal-800 animate-pulse">儲存中…</span>
            )}
          </div>

          <div className="px-5 sm:px-6 py-5 space-y-3">
            {INITIAL_STAGES.map((stage) => {
              const category = stage.category
              const isCategoryEnabled = stageState[category]?.enabled ?? true

              return (
                <div key={category} className="border border-stone-200 p-4 rounded-lg space-y-3 bg-stone-50/70">
                  <div className="flex justify-between items-center gap-3">
                    <h3 className="text-sm font-semibold text-stone-900">{category}</h3>
                    <button
                      onClick={() => handleToggleCategory(category)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded transition ${
                        isCategoryEnabled
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-stone-200 text-stone-600 border border-stone-300'
                      }`}
                    >
                      {isCategoryEnabled ? '需要做' : '不需要'}
                    </button>
                  </div>

                  {isCategoryEnabled && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {stage.items.map((item) => {
                        const isChecked = stageState[category]?.items?.[item] ?? false

                        return (
                          <label
                            key={item}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition select-none ${
                              isChecked
                                ? 'bg-teal-50 border-teal-200 text-teal-900'
                                : 'bg-white border-stone-300 text-stone-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleStageItem(category, item)}
                              className="rounded text-teal-700"
                            />
                            {item}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className={cardClass}>
          <div className="px-5 sm:px-6 py-4 border-b border-stone-100 bg-gradient-to-br from-white to-stone-50">
            <h2 className="text-base font-semibold text-stone-900">週期工作進度報告</h2>
            <p className="text-xs text-stone-500 mt-1">上載每週 JPG 報告，前台最底可撳開睇</p>
          </div>

          <div className="px-5 sm:px-6 py-5 space-y-4">
            <form onSubmit={handleAddWeeklyReport} className="space-y-4 bg-stone-50 p-4 rounded-lg border border-stone-200">
              <div>
                <label className={labelClass}>報告標題</label>
                <input
                  type="text"
                  placeholder="例：第 12 週進度報告"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>報告日期（可選）</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>報告圖片（JPG）</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                  className={`${inputClass} file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-stone-200 file:text-stone-700 file:text-xs`}
                  required
                />
                {reportFile && (
                  <p className="text-[11px] text-stone-500 mt-1.5">已選：{reportFile.name}</p>
                )}
              </div>
              <button type="submit" disabled={isUploadingReport} className={primaryBtnClass}>
                {isUploadingReport ? '上載中…' : '新增週期報告'}
              </button>
              {reportStatusMsg && (
                <p
                  className={`text-xs text-center font-medium ${
                    reportStatusMsg.includes('失敗') ? 'text-red-700' : 'text-teal-800'
                  }`}
                >
                  {reportStatusMsg}
                </p>
              )}
            </form>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-stone-900">
                已上載報告
                <span className="ml-2 text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded tabular-nums">
                  {weeklyReports.length} 份
                </span>
              </h3>
              {weeklyReports.length === 0 ? (
                <p className="text-xs text-stone-400 py-2">暫無週期報告</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {weeklyReports.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-stone-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={r.image_url}
                          alt={r.title}
                          className="w-14 h-14 object-cover rounded-md border border-stone-200 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">{r.title}</p>
                          <p className="text-[11px] text-stone-400 tabular-nums">
                            {r.report_date
                              ? new Date(r.report_date).toLocaleDateString('zh-HK')
                              : new Date(r.created_at).toLocaleDateString('zh-HK')}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteWeeklyReport(r.id)} className={dangerBtnClass}>
                        刪除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
