'use client'

import { useEffect, useState } from 'react'
import { INITIAL_STAGES } from '@/lib/stages'
import { readJsonSafe, uploadAdminPhoto } from '@/lib/admin-upload'

interface Project {
  id: string
  address: string
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
  content?: string
  photo_url?: string | null
  photo_urls?: string[]
  created_at: string
}

interface StageState {
  [category: string]: {
    enabled: boolean
    items: { [item: string]: boolean }
  }
}

const CATEGORIES = INITIAL_STAGES.map((s) => s.category)

export default function AdminPage() {
  const [authChecking, setAuthChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState(false)
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
  const [logFile, setLogFile] = useState<File | null>(null)
  const [isUploadingLog, setIsUploadingLog] = useState(false)
  const [logStatusMsg, setLogStatusMsg] = useState('')

  const [stageState, setStageState] = useState<StageState>({})
  const [isSavingStages, setIsSavingStages] = useState(false)

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
        (preferredId && list.some((p) => p.id === preferredId) && preferredId) ||
        list[0].id
      setSelectedProjectId(nextId)
      await loadProjectData(nextId)
    }
  }

  const loadProjectData = async (projectId: string) => {
    setCurrentPhase(null)
    setReceipts([])
    setLogs([])
    setReceiptStatusMsg('')
    setLogStatusMsg('')

    const res = await fetch(`/api/admin/projects/${projectId}/bundle`)
    if (!res.ok) {
      alert('載入工程資料失敗')
      return
    }
    const data = await res.json()
    setCurrentPhase(data.currentPhase || null)
    setReceipts(data.receipts || [])
    setLogs(data.logs || [])
    setStageState(data.stages_state || {})
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(false)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })
      if (!res.ok) {
        setLoginError(true)
        return
      }
      setIsAuthenticated(true)
      setPasswordInput('')
      await fetchProjects()
    } catch {
      setLoginError(true)
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
    setReceiptStatusMsg('處理中...')

    try {
      let photoUrl = ''
      if (receiptFile) {
        setReceiptStatusMsg('上傳相片中...')
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

      setReceiptStatusMsg('✅ 單據新增成功！')
      setReceiptAmount('')
      setReceiptDescription('')
      setReceiptFile(null)
      await loadProjectData(selectedProjectId)
    } catch (err: any) {
      setReceiptStatusMsg(`❌ 新增失敗: ${err.message || '未知錯誤'}`)
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
    setLogStatusMsg('處理中...')

    try {
      let photoUrl = ''
      if (logFile) {
        setLogStatusMsg('上傳相片中...')
        photoUrl = await uploadAdminPhoto(logFile, 'logs')
      }

      const res = await fetch('/api/admin/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          description: logContent,
          photoUrl,
        }),
      })
      const { data } = await readJsonSafe(res)
      if (!res.ok) throw new Error(data.error || '新增失敗')

      setLogStatusMsg('✅ 施工動態新增成功！')
      setLogContent('')
      setLogFile(null)
      await loadProjectData(selectedProjectId)
    } catch (err: any) {
      setLogStatusMsg(`❌ 新增失敗: ${err.message || '未知錯誤'}`)
    } finally {
      setIsUploadingLog(false)
    }
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

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        驗證登入狀態中...
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-800 text-center">工程管理員登入</h2>
          <input
            type="password"
            placeholder="請輸入管理員密碼"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full p-2.5 border rounded-lg text-slate-900 text-sm font-bold"
          />
          {loginError && <p className="text-xs text-red-500 text-center font-bold">密碼錯誤，請重新輸入</p>}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
          >
            {loginLoading ? '登入中...' : '登入系統'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 text-slate-900 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Admin 工程管理後台</h1>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition"
          >
            登出系統
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <label className="text-xs font-bold text-slate-700 block">選擇工程單位：</label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleSelectProject(e.target.value)}
            className="w-full p-2.5 border rounded-lg bg-white font-bold text-slate-900 text-base"
          >
            {projects.length === 0 ? (
              <option value="" disabled>
                暫無工程單位
              </option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id} className="text-slate-900 font-bold">
                  {p.address}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">📸 新增施工動態紀錄</h2>

          <form onSubmit={handleAddProgressLog} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">施工紀錄描述 / 進度更新</label>
              <textarea
                rows={3}
                placeholder="例: 今日已完成大廳電線開槽及埋喉工作"
                value={logContent}
                onChange={(e) => setLogContent(e.target.value)}
                className="w-full p-2.5 border rounded-lg text-sm font-bold text-slate-900 placeholder:text-slate-400 bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">現場相片 (可選)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogFile(e.target.files?.[0] || null)}
                className="w-full p-1.5 border rounded-lg text-xs bg-white text-slate-900 font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={isUploadingLog}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition text-sm disabled:opacity-50"
            >
              {isUploadingLog ? '發佈中...' : '發佈施工動態'}
            </button>

            {logStatusMsg && (
              <p className={`text-xs font-bold text-center ${logStatusMsg.includes('❌') ? 'text-red-500' : 'text-emerald-600'}`}>
                {logStatusMsg}
              </p>
            )}
          </form>

          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900">歷史施工動態紀錄 ({logs.length} 筆)</h3>
            {logs.length === 0 ? (
              <p className="text-xs font-bold text-slate-500 italic">暫無施工紀錄</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {logs.map((log) => {
                  const imgUrl =
                    log.photo_urls && log.photo_urls.length > 0 ? log.photo_urls[0] : log.photo_url || null
                  const text = log.description || log.content || ''

                  return (
                    <div
                      key={log.id}
                      className="flex justify-between items-start bg-white p-3 rounded-lg border border-slate-200 shadow-sm gap-3"
                    >
                      <div className="flex gap-3 items-start">
                        {imgUrl && (
                          <img src={imgUrl} alt="Progress" className="w-12 h-12 object-cover rounded-md border flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-900 whitespace-pre-wrap">{text}</p>
                          <p className="text-xs font-bold text-slate-400 mt-1">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold rounded transition flex-shrink-0"
                      >
                        刪除
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">📑 材料收費區管理</h2>
              <p className="text-xs font-bold text-blue-600 mt-0.5">
                當前階段：第 {currentPhase?.phase_number || 1} 期收款
              </p>
            </div>
            <button
              onClick={handleConfirmPhasePayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1"
            >
              ✓ 確認第 {currentPhase?.phase_number || 1} 期已收款（開展新一期）
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              新增材料單據（屬於第 {currentPhase?.phase_number || 1} 期）
            </h3>

            <form onSubmit={handleAddReceipt} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">所屬工程</label>
                  <select
                    value={receiptCategory}
                    onChange={(e) => setReceiptCategory(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm bg-white font-bold text-slate-900"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="text-slate-900 font-bold">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">單據金額 (HKD)</label>
                  <input
                    type="number"
                    placeholder="例: 1500"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm font-bold text-slate-900 placeholder:text-slate-400 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">單據相片</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="w-full p-1.5 border rounded-lg text-xs bg-white text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">單據描述 / 備註</label>
                <input
                  type="text"
                  placeholder="例: 買客廳電線喉管及制面"
                  value={receiptDescription}
                  onChange={(e) => setReceiptDescription(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm font-bold text-slate-900 placeholder:text-slate-400 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isUploadingReceipt}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition text-sm disabled:opacity-50"
              >
                {isUploadingReceipt ? '正在新增...' : '新增此單據'}
              </button>

              {receiptStatusMsg && (
                <p
                  className={`text-xs font-bold text-center ${
                    receiptStatusMsg.includes('❌') ? 'text-red-500' : 'text-emerald-600'
                  }`}
                >
                  {receiptStatusMsg}
                </p>
              )}
            </form>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">本期已新增單據 ({receipts.length} 筆)</h3>

            {receipts.length === 0 ? (
              <p className="text-xs font-bold text-slate-500 italic">本期暫無單據</p>
            ) : (
              <div className="space-y-2">
                {receipts.map((r) => (
                  <div
                    key={r.id}
                    className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {r.photo_url ? (
                        <img src={r.photo_url} alt="Receipt" className="w-10 h-10 object-cover rounded-md border" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-md border flex items-center justify-center text-xs font-bold text-slate-400">
                          無圖
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          <span className="text-blue-600">[{r.category}]</span> {r.description || '無備註'}
                        </p>
                        <p className="text-xs font-bold text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-base font-extrabold text-slate-900">HK$ {r.amount}</span>
                      <button
                        onClick={() => handleDeleteReceipt(r.id)}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold rounded transition"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">📋 各項工序完成度明細</h2>
            {isSavingStages && <span className="text-xs font-bold text-blue-600 animate-pulse">💾 自動儲存中...</span>}
          </div>

          <div className="space-y-4">
            {INITIAL_STAGES.map((stage) => {
              const category = stage.category
              const isCategoryEnabled = stageState[category]?.enabled ?? true

              return (
                <div key={category} className="border border-slate-200 p-4 rounded-xl space-y-3 bg-slate-50">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-900">{category}</h3>
                    <button
                      onClick={() => handleToggleCategory(category)}
                      className={`text-xs font-bold px-3 py-1 rounded-full transition ${
                        isCategoryEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCategoryEnabled ? '✓ 此大項需要做' : '✕ 此大項不需要'}
                    </button>
                  </div>

                  {isCategoryEnabled && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {stage.items.map((item) => {
                        const isChecked = stageState[category]?.items?.[item] ?? false

                        return (
                          <label
                            key={item}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold cursor-pointer transition select-none ${
                              isChecked
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                                : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleStageItem(category, item)}
                              className="rounded text-emerald-600"
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
        </div>
      </div>
    </div>
  )
}
