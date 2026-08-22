'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const DEFAULT_CHECKLIST = [
  '保護工程', '清拆工程', '水電隱蔽工程', 
  '泥水防水工程', '木工泥水封板', '油漆工程', 
  '傢俬安裝', '清潔及驗收'
]

export default function AdminPage() {
  // Admin 驗證狀態
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminUser, setAdminUser] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [loginError, setLoginError] = useState('')

  // 專案管理狀態
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({})
  const [photoUrl, setPhotoUrl] = useState('')
  const [photosList, setPhotosList] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

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

  // 抓取 Supabase 所有專案
  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setProjects(data)
      // 若尚未選擇專案，預設選第一個
      if (!selectedProjectId) {
        setSelectedProjectId(data[0].id)
        setCompletedItems(data[0].checklist || {})
        setPhotosList(data[0].photos || [])
      }
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // 切換選擇工程單位
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value
    setSelectedProjectId(pId)
    const current = projects.find((p) => p.id === pId)
    if (current) {
      setCompletedItems(current.checklist || {})
      setPhotosList(current.photos || [])
    }
  }

  // 切換 Checklist 勾選狀態
  const handleCheckChange = (item: string) => {
    setCompletedItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }))
  }

  // 新增相片 URL 到清單
  const handleAddPhoto = () => {
    if (!photoUrl.trim()) return
    setPhotosList((prev) => [...prev, photoUrl.trim()])
    setPhotoUrl('')
  }

  // 刪除相片
  const handleRemovePhoto = (index: number) => {
    setPhotosList((prev) => prev.filter((_, i) => i !== index))
  }

  // 儲存更新到 Supabase
  const handleUpdate = async () => {
    if (!selectedProjectId) return
    setLoading(true)
    setStatusMessage('')

    const total = DEFAULT_CHECKLIST.length
    const doneCount = DEFAULT_CHECKLIST.filter((item) => completedItems[item]).length
    const progressPercentage = Math.round((doneCount / total) * 100)

    // 合併現有照片與輸入框可能未按新增的照片
    const finalPhotos = photoUrl.trim() ? [...photosList, photoUrl.trim()] : photosList

    const { error } = await supabase
      .from('projects')
      .update({
        checklist: completedItems,
        progress: progressPercentage,
        photos: finalPhotos,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedProjectId)

    setLoading(false)
    if (!error) {
      setStatusMessage('✅ 進度已順利更新並同步至客戶端！')
      setPhotoUrl('')
      fetchProjects()
    } else {
      setStatusMessage('❌ 更新失敗：' + error.message)
    }
  }

  // 未驗證：顯示管理員登入介面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <form onSubmit={handleAdminLogin} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-slate-800">裝修管理後台</h1>
            <p className="text-sm text-slate-500 mt-1">請登入以管理工程進度</p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-semibold text-center">
              {loginError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">管理員帳號</label>
            <input
              type="text"
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
              className="w-full border border-slate-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition font-medium"
              placeholder="輸入帳號"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">管理員密碼</label>
            <input
              type="password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              className="w-full border border-slate-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition font-medium"
              placeholder="輸入密碼"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition duration-200"
          >
            驗證並登入
          </button>
        </form>
      </div>
    )
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  // 已驗證：完整版管理介面
  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-800">工程進度管理控制台</h1>
            <p className="text-xs text-slate-500 mt-0.5">目前登入身份：KENNYBBB</p>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl transition"
          >
            登出
          </button>
        </div>

        {statusMessage && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-800 font-semibold text-center shadow-sm">
            {statusMessage}
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8">
          {/* 專案選擇 */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">選擇單位 / 工程：</label>
            <select
              value={selectedProjectId}
              onChange={handleProjectChange}
              className="w-full p-3.5 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address} | 電話: {p.client_phone} | PIN: {p.client_pin}
                </option>
              ))}
            </select>
          </div>

          {/* 目前進度條 */}
          {selectedProject && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-600">即時整體進度</span>
                <span className="text-xl font-black text-blue-600">{selectedProject.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-500 ease-out"
                  style={{ width: `${selectedProject.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Checklist 項目 */}
          <div>
            <h2 className="font-bold text-slate-800 text-lg mb-4">更新施工進度 Checklist：</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEFAULT_CHECKLIST.map((item) => (
                <label
                  key={item}
                  className={`flex items-center space-x-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                    completedItems[item]
                      ? 'bg-blue-50/60 border-blue-200 text-blue-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 font-medium hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!completedItems[item]}
                    onChange={() => handleCheckChange(item)}
                    className="w-5 h-5 accent-blue-600 rounded"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 現場照片上傳與預覽 */}
          <div>
            <h2 className="font-bold text-slate-800 text-lg mb-2">現場相片網址管理：</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="貼上相片 URL (例: https://imgur.com/xxx.jpg)"
                className="flex-1 p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 rounded-xl transition"
              >
                加入
              </button>
            </div>

            {photosList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photosList.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-28">
                    <img src={url} alt={`現場照片 ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-md hover:bg-red-700 transition"
                    >
                      刪除
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">目前無相片清單</p>
            )}
          </div>

          {/* 儲存按鈕 */}
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-lg py-4 rounded-xl shadow-lg transition duration-200"
          >
            {loading ? '正在同步至 Supabase...' : '儲存並同步進度'}
          </button>
        </div>
      </div>
    </div>
  )
}
