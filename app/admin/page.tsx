'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 預設 Checklist 項目
const DEFAULT_CHECKLIST = [
  '保護工程', '清拆工程', '水電隱蔽工程',
  '泥水防水工程', '木工泥水封板', '油漆工程',
  '傢俬安裝', '清潔及驗收'
]

export default function AdminPage() {
  // Admin 登入狀態
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminUser, setAdminUser] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [loginError, setLoginError] = useState('')

  // 專案管理狀態
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({})
  const [photoUrl, setPhotoUrl] = useState('')
  const [loading, setLoading] = useState(false)

  // 管理員登入驗證
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // 你可以喺度更改你專屬嘅 Admin 帳號同密碼
    if (adminUser === 'kennybbb' && adminPass === '0828') {
      setIsAuthenticated(true)
      setLoginError('')
    } else {
      setLoginError('帳號或密碼錯誤！')
    }
  }

  // 載入專案列表
  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*')
    if (data && data.length > 0) {
      setProjects(data)
      setSelectedProjectId(data[0].id)
      setCompletedItems(data[0].checklist || {})
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects()
    }
  }, [isAuthenticated])

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value
    setSelectedProjectId(pId)
    const p = projects.find((item) => item.id === pId)
    if (p) setCompletedItems(p.checklist || {})
  }

  const handleCheckChange = (item: string) => {
    setCompletedItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }))
  }

  const handleUpdate = async () => {
    setLoading(true)
    const total = DEFAULT_CHECKLIST.length
    const doneCount = DEFAULT_CHECKLIST.filter((item) => completedItems[item]).length
    const progressPercentage = Math.round((doneCount / total) * 100)

    const selectedProject = projects.find((p) => p.id === selectedProjectId)
    const currentPhotos = selectedProject?.photos || []
    const updatedPhotos = photoUrl.trim() ? [...currentPhotos, photoUrl.trim()] : currentPhotos

    const { error } = await supabase
      .from('projects')
      .update({
        checklist: completedItems,
        progress: progressPercentage,
        photos: updatedPhotos,
      })
      .eq('id', selectedProjectId)

    setLoading(false)
    if (!error) {
      alert('進度更新成功！')
      setPhotoUrl('')
      fetchProjects()
    } else {
      alert('更新失敗：' + error.message)
    }
  }

  // 1. 未登入：顯示 Admin 帳密輸入框
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleAdminLogin} className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm">
          <h1 className="text-xl font-bold mb-4 text-center">工程後台管理員登入</h1>
          {loginError && <p className="text-red-500 text-sm mb-3 text-center">{loginError}</p>}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">管理員帳號</label>
            <input
              type="text"
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="請輸入帳號"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">管理員密碼</label>
            <input
              type="password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="請輸入密碼"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">
            登入後台
          </button>
        </form>
      </div>
    )
  }

  // 2. 已登入：顯示原本嘅後台管理介面
  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">裝修進度 - 後台管理</h1>
        <button
          onClick={() => setIsAuthenticated(false)}
          className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
        >
          登出
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <label className="block font-semibold mb-2">選擇工程單位：</label>
        <select
          value={selectedProjectId}
          onChange={handleProjectChange}
          className="w-full p-2 border rounded-lg mb-4"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.address} ({p.client_phone})
            </option>
          ))}
        </select>

        <h2 className="font-semibold text-lg mb-3">更新施工 Checklist：</h2>
        <div className="space-y-2 mb-6">
          {DEFAULT_CHECKLIST.map((item) => (
            <label key={item} className="flex items-center space-x-3 p-2 bg-gray-50 rounded border cursor-pointer">
              <input
                type="checkbox"
                checked={!!completedItems[item]}
                onChange={() => handleCheckChange(item)}
                className="w-5 h-5 accent-blue-600"
              />
              <span className="text-gray-800 font-medium">{item}</span>
            </label>
          ))}
        </div>

        <h2 className="font-semibold text-lg mb-2">新增現場相片網址：</h2>
        <input
          type="url"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="貼上相片 URL (例如 Imgur / Supabase Storage)"
          className="w-full p-2 border rounded-lg mb-4"
        />

        <button
          onClick={handleUpdate}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow hover:bg-blue-700 transition"
        >
          {loading ? '更新中...' : '儲存並更新進度'}
        </button>
      </div>
    </div>
  )
}
