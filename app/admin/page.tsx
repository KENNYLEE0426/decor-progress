'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Project {
  id: string
  address: string
  access_code: string
  status: string
  created_at: string
}

interface PaymentPhase {
  id: string
  phase_number: number
  status: string
  paid_at: string | null
}

const CATEGORIES = ['電器/燈飾', '泥水/磁磚', '油漆/建材', '五金/水電', '傢俬/訂造', '其他雜項']

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  
  // Receipt Form State
  const [phases, setPhases] = useState<PaymentPhase[]>([])
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('')
  const [receiptCategory, setReceiptCategory] = useState(CATEGORIES[0])
  const [receiptAmount, setReceiptAmount] = useState('')
  const [receiptDescription, setReceiptDescription] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [receiptStatusMsg, setReceiptStatusMsg] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
      fetchProjects()
    }
  }, [])

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setProjects(data)
      if (!selectedProjectId) {
        setSelectedProjectId(data[0].id)
        fetchPhases(data[0].id)
      }
    }
  }

  const fetchPhases = async (projectId: string) => {
    let { data: phaseData } = await supabase
      .from('payment_phases')
      .select('*')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true })

    if (!phaseData || phaseData.length === 0) {
      const { data: newPhase } = await supabase
        .from('payment_phases')
        .insert({ project_id: projectId, phase_number: 1, status: 'pending' })
        .select()
        .single()

      if (newPhase) {
        phaseData = [newPhase]
      }
    }

    if (phaseData) {
      setPhases(phaseData)
      setSelectedPhaseId(phaseData[0].id)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError(false)

    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        localStorage.setItem('admin_auth', 'true')
        setIsAuthenticated(true)
        fetchProjects()
      } else {
        setLoginError(true)
      }
    } catch (err) {
      setLoginError(true)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    fetchPhases(projectId)
  }

  const handleAddReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !receiptAmount) {
      alert('請填寫完整單據資料與金額')
      return
    }

    setIsUploading(true)
    setReceiptStatusMsg('處理中...')

    try {
      let photoUrl = ''

      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop()
        const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `receipts/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('progress-photos')
          .upload(filePath, receiptFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('progress-photos')
          .getPublicUrl(filePath)

        photoUrl = publicUrlData.publicUrl
      }

      let currentPhaseId = selectedPhaseId
      if (!currentPhaseId) {
        const { data: newPhase } = await supabase
          .from('payment_phases')
          .insert({ project_id: selectedProjectId, phase_number: 1, status: 'pending' })
          .select()
          .single()
        if (newPhase) currentPhaseId = newPhase.id
      }

      const { error: insertError } = await supabase.from('receipts').insert({
        project_id: selectedProjectId,
        phase_id: currentPhaseId,
        category: receiptCategory,
        amount: parseFloat(receiptAmount),
        description: receiptDescription,
        photo_url: photoUrl
      })

      if (insertError) throw insertError

      setReceiptStatusMsg('✅ 單據新增成功！')
      setReceiptAmount('')
      setReceiptDescription('')
      setReceiptFile(null)
      fetchPhases(selectedProjectId)
    } catch (err: any) {
      console.error(err)
      setReceiptStatusMsg(`❌ 新增失敗: ${err.message || '未知錯誤'}`)
    } finally {
      setIsUploading(false)
    }
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
            className="w-full p-2 border rounded-lg text-sm text-slate-800"
          />
          {loginError && <p className="text-xs text-red-500 text-center">密碼錯誤，請重新輸入</p>}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50"
          >
            {isLoggingIn ? '驗證中...' : '登入系統'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
          <h1 className="text-xl font-bold">工程後台管理系統</h1>
          <button
            onClick={() => {
              localStorage.removeItem('admin_auth')
              setIsAuthenticated(false)
            }}
            className="text-xs text-red-500 font-bold"
          >
            登出
          </button>
        </div>

        {/* 選擇單位 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
          <label className="text-sm font-bold text-slate-700 block">選擇工程單位：</label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleSelectProject(e.target.value)}
            className="w-full p-2.5 border rounded-lg bg-slate-50 font-bold text-slate-800"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address} (進場 Code: {p.access_code})
              </option>
            ))}
          </select>
        </div>

        {/* 上傳單據 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-800">🧾 新增材料單據</h2>
          <form onSubmit={handleAddReceipt} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">期數選擇</label>
                <select
                  value={selectedPhaseId}
                  onChange={(e) => setSelectedPhaseId(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm bg-slate-50 font-bold text-slate-800"
                >
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      第 {p.phase_number} 期 ({p.status === 'paid' ? '已付清' : '進行中'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">材料類別</label>
                <select
                  value={receiptCategory}
                  onChange={(e) => setReceiptCategory(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm bg-slate-50 font-bold text-slate-800"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">金額 (HKD)</label>
                <input
                  type="number"
                  placeholder="例如: 1500"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">單據照片 / 截圖</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full p-1.5 border rounded-lg text-xs bg-slate-50 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">備註 / 說明</label>
              <input
                type="text"
                placeholder="例如: 客廳磁磚補料 5 箱"
                value={receiptDescription}
                onChange={(e) => setReceiptDescription(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm text-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition text-sm disabled:opacity-50"
            >
              {isUploading ? '正在上傳與寫入...' : '新增此單據'}
            </button>

            {receiptStatusMsg && (
              <p className={`text-xs font-bold text-center ${receiptStatusMsg.includes('❌') ? 'text-red-500' : 'text-emerald-600'}`}>
                {receiptStatusMsg}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
