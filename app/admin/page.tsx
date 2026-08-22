'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Project {
  id: string
  address: string
}

interface ProgressLog {
  id: string
  title: string
  description: string
  progress_percent: number
  photo_urls: string[]
  created_at: string
}

// 預設工序範本（包含棚架與鋁窗工程）
const INITIAL_STAGES = [
  {
    category: '清拆工程',
    enabled: true,
    items: ['進場清拆', '清拆完成']
  },
  {
    category: '棚架工程',
    enabled: true,
    items: ['搭棚', '拆棚']
  },
  {
    category: '鋁窗工程',
    enabled: true,
    items: ['度尺', '拆舊窗', '換新窗', '封泥', '外部唧膠防水', '窗邊執修']
  },
  {
    category: '電力工程',
    enabled: true,
    items: ['夾位', 'MARK位', '介坑', '放喉', '穿線', '裝制面']
  },
  {
    category: '水喉工程',
    enabled: true,
    items: ['夾位', 'MARK位', '介坑', '放喉', '試水', '封泥']
  },
  {
    category: '泥水工程',
    enabled: true,
    items: [
      '間磚牆', '磚牆批盪', '廚房批盪', '浴室批盪',
      '盪地台', '起基仔', '廚房鋪磚', '浴室鋪磚', '客廳及房間鋪磚'
    ]
  },
  {
    category: '防水工程',
    enabled: true,
    items: ['清潔表面', '第一層防水塗層', '第二層防水塗層', '第三層防水塗層', '第四層防水塗層']
  },
  {
    category: '雲石工程',
    enabled: true,
    items: ['度尺', '裝雲石級咀']
  },
  {
    category: '油漆工程',
    enabled: true,
    items: [
      '剷底', '落批灰角', '批第一浸灰', '批第二浸灰', '批第三浸灰',
      '磨平牆身灰', '油第一浸面油', '油第二浸面油', '油第三浸面油'
    ]
  }
]

export default function AdminPage() {
  // Admin 登入驗證狀態
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminUser, setAdminUser] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [loginError, setLoginError] = useState('')

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [logs, setLogs] = useState<ProgressLog[]>([])

  // 工序狀態管理
  const [stages, setStages] = useState(INITIAL_STAGES)
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({})

  const supabase = createClient()

  // 登入驗證處理
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminUser === 'KENNYBBB' && adminPass === '0828') {
      setIsAuthenticated(true)
      setLoginError('')
    } else {
      setLoginError('帳號或密碼錯誤！')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (selectedProjectId && isAuthenticated) {
      fetchLogs(selectedProjectId)
    }
  }, [selectedProjectId, isAuthenticated])

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, address')
    if (data && data.length > 0) {
      setProjects(data)
      setSelectedProjectId(data[0].id)
    }
  }

  const fetchLogs = async (projectId: string) => {
    const { data } = await supabase
      .from('progress_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (data) setLogs(data)
  }

  // 切換大項啟用狀態
  const toggleStage = (category: string) => {
    setStages((prev) =>
      prev.map((s) => (s.category === category ? { ...s, enabled: !s.enabled } : s))
    )
  }

  // 切換細項完成狀態
  const toggleItem = (itemKey: string) => {
    setCompletedItems((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }))
  }

  // 計算已啟用的總項目數與完成百分比
  const activeItems = stages
    .filter((s) => s.enabled)
    .flatMap((s) => s.items.map((i) => `${s.category}-${i}`))

  const completedCount = activeItems.filter((key) => completedItems[key]).length
  const calculatedProgress =
    activeItems.length > 0 ? Math.round((completedCount / activeItems.length) * 100) : 0

  // 處理相片選取與預覽
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selectedFiles = Array.from(e.target.files)
    setFiles((prev) => [...prev, ...selectedFiles])

    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file))
    setPreviews((prev) => [...prev, ...newPreviews])
  }

  // 移除預覽圖片
  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // 刪除舊日誌
  const handleDeleteLog = async (logId: string) => {
    if (!confirm('確定要刪除這筆施工紀錄嗎？')) return
    const { error } = await supabase.from('progress_logs').delete().eq('id', logId)
    if (!error) {
      setMessage('已成功刪除紀錄！')
      fetchLogs(selectedProjectId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId) {
      alert('請先選擇工程單位')
      return
    }

    setUploading(true)
    setMessage('正在上傳照片與更新進度...')

    try {
      const uploadedUrls: string[] = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random()}.${fileExt}`
        const filePath = `progress/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('project-photos')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('project-photos')
          .getPublicUrl(filePath)

        uploadedUrls.push(urlData.publicUrl)
      }

      const { error: logError } = await supabase.from('progress_logs').insert({
        project_id: selectedProjectId,
        title: title || `工序進度更新 (${calculatedProgress}%)`,
        description,
        progress_percent: calculatedProgress,
        photo_urls: uploadedUrls,
      })

      if (logError) throw logError

      await supabase
        .from('projects')
        .update({ status: `施工中 (${calculatedProgress}%)` })
        .eq('id', selectedProjectId)

      setMessage('成功新增施工進度！')
      setTitle('')
      setDescription('')
      setFiles([])
      setPreviews([])
      fetchLogs(selectedProjectId)
    } catch (err: any) {
      setMessage(`上傳失敗：${err.message || '未知錯誤'}`)
    } finally {
      setUploading(false)
    }
  }

  // 1. 未登入：顯示管理員帳密登入頁面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleAdminLogin} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-slate-800">工程管理員後台</h1>
            <p className="text-xs text-slate-500 mt-1">請輸入管理員帳號與密碼</p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-semibold text-center">
              {loginError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">帳號</label>
            <input
              type="text"
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
              className="w-full border border-slate-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 transition font-medium"
              placeholder="請輸入帳號"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">密碼</label>
            <input
              type="password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              className="w-full border border-slate-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 transition font-medium"
              placeholder="請輸入密碼"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition duration-200"
          >
            登入系統
          </button>
        </form>
      </div>
    )
  }

  // 2. 已登入：顯示你原本的完整版介面
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 md:p-8 pb-20">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 標題卡片 */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">工程管理員後台</h1>
            <p className="text-xs text-slate-400 mt-1">地盤即時拍照與工序進度更新 (KENNYBBB)</p>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg font-medium border border-slate-700 transition"
          >
            登出
          </button>
        </div>

        {message && (
          <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          {/* 1. 選擇單位 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              選擇工程單位
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3.5 text-base bg-slate-50 font-medium text-slate-900 focus:bg-white transition"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address}
                </option>
              ))}
            </select>
          </div>

          {/* 2. 工序進度 Checkbox 清單 */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                施工工序進度勾選
              </label>
              <span className="text-lg font-extrabold text-blue-600">
                自動計算：{calculatedProgress}%
              </span>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {stages.map((stage) => (
                <div key={stage.category} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-slate-900">{stage.category}</span>
                    <button
                      type="button"
                      onClick={() => toggleStage(stage.category)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                        stage.enabled
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {stage.enabled ? '已啟用此工程' : '不需做此項'}
                    </button>
                  </div>

                  {stage.enabled && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {stage.items.map((item) => {
                        const itemKey = `${stage.category}-${item}`
                        const isChecked = !!completedItems[itemKey]
                        return (
                          <label
                            key={item}
                            onClick={() => toggleItem(itemKey)}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition select-none ${
                              isChecked
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span>{item}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. 標題與細節說明 */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                進度標題 (可不填，預設顯示進度 %)
              </label>
              <input
                type="text"
                placeholder="例如：棚架與鋁窗完成 / 泥水試水完成"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                施工細節備註 (業主可見)
              </label>
              <textarea
                rows={3}
                placeholder="輸入地盤備註或提醒業主注意事項..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-900"
              />
            </div>
          </div>

          {/* 4. 相片選擇與縮圖預覽 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              現場施工照片 (可選多張)
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
              <span className="text-2xl mb-1">📷</span>
              <span className="text-sm font-semibold text-slate-700">點擊此處拍照或選擇相片</span>
              <span className="text-xs text-slate-400 mt-1">支援手機一次選擇多張</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* 即時預覽區 */}
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                {previews.map((src, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border bg-slate-100">
                    <img src={src} alt="預覽" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. 大發布按鈕 */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-[0.99] text-base"
          >
            {uploading ? '正在發布更新...' : '🚀 發布施工日誌'}
          </button>
        </form>

        {/* 6. 歷史紀錄管理 */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-base font-bold text-slate-900">歷史發布紀錄 (管理)</h3>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-400">目前尚無歷史發布紀錄。</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border text-sm">
                  <div>
                    <p className="font-bold text-slate-800">{log.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      進度: {log.progress_percent}% | 相片: {log.photo_urls?.length || 0} 張
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="text-xs text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                  >
                    🗑️ 刪除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
