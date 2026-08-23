'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

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

export default function AdminPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [stagesState, setStagesState] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  // 材料收費狀態
  const [phases, setPhases] = useState<PaymentPhase[]>([])
  const [currentPhase, setCurrentPhase] = useState<PaymentPhase | null>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])

  // 新增單據 Form
  const [receiptCategory, setReceiptCategory] = useState(INITIAL_STAGES[0].category)
  const [receiptAmount, setReceiptAmount] = useState('')
  const [receiptDesc, setReceiptDesc] = useState('')
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setProjects(data)
      setSelectedProjectId(data[0].id)
      loadProjectData(data[0].id, data[0])
    }
  }

  const loadProjectData = async (projectId: string, projObj?: Project) => {
    const proj = projObj || projects.find((p) => p.id === projectId)
    if (proj) {
      const state = proj.stages_state || {}
      INITIAL_STAGES.forEach(stage => {
        const catKey = `CATEGORY_ENABLED-${stage.category}`
        if (state[catKey] === undefined) state[catKey] = true
      })
      setStagesState(state)
    }

    // 載入收款期數
    let { data: phaseData } = await supabase
      .from('payment_phases')
      .select('*')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true })

    if (!phaseData || phaseData.length === 0) {
      // 首次建立 Phase 1
      const { data: newPhase } = await supabase
        .from('payment_phases')
        .insert({ project_id: projectId, phase_number: 1, status: 'pending' })
        .select()
        .single()
      if (newPhase) phaseData = [newPhase]
    }

    if (phaseData) {
      setPhases(phaseData)
      const active = phaseData.find(p => p.status === 'pending') || phaseData[phaseData.length - 1]
      setCurrentPhase(active)
      if (active) fetchReceipts(projectId, active.id)
    }
  }

  const fetchReceipts = async (projectId: string, phaseId: string) => {
    const { data } = await supabase
      .from('receipts')
      .select('*')
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .order('created_at', { ascending: false })

    if (data) setReceipts(data)
  }

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    loadProjectData(projectId)
  }

  const saveStagesToSupabase = async (newState: Record<string, boolean>) => {
    if (!selectedProjectId) return
    setSaving(true)
    await supabase.from('projects').update({ stages_state: newState }).eq('id', selectedProjectId)
    setProjects((prev) => prev.map((p) => (p.id === selectedProjectId ? { ...p, stages_state: newState } : p)))
    setSaving(false)
  }

  const toggleCategory = (category: string) => {
    const catKey = `CATEGORY_ENABLED-${category}`
    const updated = { ...stagesState, [catKey]: !stagesState[catKey] }
    setStagesState(updated)
    saveStagesToSupabase(updated)
  }

  const toggleStageItem = (category: string, item: string) => {
    const itemKey = `${category}-${item}`
    const updated = { ...stagesState, [itemKey]: !stagesState[itemKey] }
    setStagesState(updated)
    saveStagesToSupabase(updated)
  }

  // 上傳材料單據
  const handleAddReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !currentPhase || !receiptAmount) return
    setUploadingReceipt(true)

    try {
      let photoUrl = ''
      if (receiptPhoto) {
        const fileExt = receiptPhoto.name.split('.').pop()
        const fileName = `receipt_${Date.now()}.${fileExt}`
        const filePath = `${selectedProjectId}/${fileName}`

        const { error: uploadError } = await supabase.storage.from('progress-photos').upload(filePath, receiptPhoto)
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('progress-photos').getPublicUrl(filePath)
        photoUrl = urlData.publicUrl
      }

      const { data: newReceipt, error } = await supabase.from('receipts').insert({
        project_id: selectedProjectId,
        phase_id: currentPhase.id,
        category: receiptCategory,
        amount: parseFloat(receiptAmount),
        description: receiptDesc,
        photo_url: photoUrl
      }).select().single()

      if (error) throw error

      if (newReceipt) setReceipts([newReceipt, ...receipts])
      setReceiptAmount('')
      setReceiptDesc('')
      setReceiptPhoto(null)
      alert('單據上傳成功！')
    } catch (err: any) {
      alert('上傳失敗: ' + err.message)
    } finally {
      setUploadingReceipt(false)
    }
  }

  // 確認本期收款結清，開展新一期
  const handleConfirmPayment = async () => {
    if (!currentPhase || !selectedProjectId) return
    if (!confirm(`確定已收到第 ${currentPhase.phase_number} 期款項？確認後將會保留舊資料並開展第 ${currentPhase.phase_number + 1} 期。`)) return

    try {
      // 1. 將當前 Phase 設為 paid
      await supabase.from('payment_phases').update({
        status: 'paid',
        paid_at: new Date().toISOString()
      }).eq('id', currentPhase.id)

      // 2. 建立新 Phase
      const nextPhaseNum = currentPhase.phase_number + 1
      const { data: newPhase } = await supabase.from('payment_phases').insert({
        project_id: selectedProjectId,
        phase_number: nextPhaseNum,
        status: 'pending'
      }).select().single()

      alert(`第 ${currentPhase.phase_number} 期已確認收款！已自動開啟第 ${nextPhaseNum} 期。`)
      loadProjectData(selectedProjectId)
    } catch (err: any) {
      alert('確認收款失敗: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Admin 工程管理後台</h1>

        {/* 單位選擇器 */}
        <div className="bg-white p-4 rounded-xl shadow border border-slate-200 flex items-center gap-4">
          <label className="font-semibold text-sm">選擇工程單位：</label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleSelectProject(e.target.value)}
            className="p-2 border rounded-lg flex-1 text-sm bg-slate-50"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>
          {saving && <span className="text-xs text-blue-500 font-medium animate-pulse">儲存中...</span>}
        </div>

        {/* 💰 材料收費區 (ADMIN 上傳與結算) */}
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">🧾 材料收費區管理</h2>
              <p className="text-xs text-slate-500">當前階段：<span className="font-bold text-blue-600">第 {currentPhase?.phase_number || 1} 期收款</span></p>
            </div>
            {currentPhase && currentPhase.status === 'pending' && (
              <button
                onClick={handleConfirmPayment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition"
              >
                ✅ 確認第 {currentPhase.phase_number} 期已收款（開展新一期）
              </button>
            )}
          </div>

          {/* 上傳新單據 Form */}
          <form onSubmit={handleAddReceipt} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-700">新增材料單據（屬於第 {currentPhase?.phase_number || 1} 期）</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">所屬工程</label>
                <select
                  value={receiptCategory}
                  onChange={(e) => setReceiptCategory(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs bg-white"
                >
                  {INITIAL_STAGES.map((s) => (
                    <option key={s.category} value={s.category}>{s.category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">單據金額 (HKD)</label>
                <input
                  type="number"
                  placeholder="例: 1500"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">單據相片</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceiptPhoto(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">單據描述 / 備註</label>
              <input
                type="text"
                placeholder="例: 買客廳電線喉管及制面"
                value={receiptDesc}
                onChange={(e) => setReceiptDesc(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={uploadingReceipt}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
            >
              {uploadingReceipt ? '上傳中...' : '新增此單據'}
            </button>
          </form>

          {/* 當前期數的單據列表 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500">本期已新增單據 ({receipts.length} 筆)</h4>
            {receipts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">本期暫無單據</p>
            ) : (
              <div className="space-y-2">
                {receipts.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-white border rounded-lg text-xs">
                    <div className="flex items-center gap-3">
                      {r.photo_url && (
                        <img src={r.photo_url} alt="receipt" className="w-10 h-10 object-cover rounded border" />
                      )}
                      <div>
                        <span className="font-bold text-blue-600 mr-2">[{r.category}]</span>
                        <span className="font-semibold text-slate-800">{r.description || '無描述'}</span>
                      </div>
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">HK$ {r.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 9 大工程管理清單 */}
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 border-b pb-2">工程階段項目設定（勾選即自動同步客戶端）</h2>
          <div className="space-y-6">
            {INITIAL_STAGES.map((stage) => {
              const catKey = `CATEGORY_ENABLED-${stage.category}`
              const isCategoryEnabled = stagesState[catKey] !== false

              return (
                <div
                  key={stage.category}
                  className={`border rounded-xl p-4 transition ${
                    isCategoryEnabled ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200/50 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-slate-800">{stage.category}</span>
                    <button
                      type="button"
                      onClick={() => toggleCategory(stage.category)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                        isCategoryEnabled
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {isCategoryEnabled ? '✓ 此大項需要做' : '✕ 本單位不需此工程'}
                    </button>
                  </div>

                  {isCategoryEnabled && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {stage.items.map((item) => {
                        const itemKey = `${stage.category}-${item}`
                        const isChecked = !!stagesState[itemKey]
                        return (
                          <label
                            key={item}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium cursor-pointer border transition ${
                              isChecked
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleStageItem(stage.category, item)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>{item}</span>
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
