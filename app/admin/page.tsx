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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminUser, setAdminUser] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [loginError, setLoginError] = useState('')

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({})
  const [photoUrl, setPhotoUrl] = useState('')
  const [photosList, setPhotosList] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // 1. 帳密驗證：KENNYBBB / 0828
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminUser === 'KENNYBBB' && adminPass === '0828') {
      setIsAuthenticated(true)
      setLoginError('')
    } else {
      setLoginError('帳號或密碼錯誤！')
    }
  }

  // 2. 抓取專案資料
  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*')
    if (data && data.length > 0) {
      setProjects(data)
      if (!selectedProjectId) {
        setSelectedProjectId(data[0].id)
        setCompletedItems(data[0].checklist || {})
        setPhotosList(data[0].photos || [])
      } else {
        const current = data.find((p) => p.id === selectedProjectId)
        if (current) {
          setCompletedItems(current.checklist || {})
          setPhotosList(current.photos || [])
        }
      }
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value
    setSelectedProjectId(pId)
    const p = projects.find((item) => item.id === pId)
    if (p) {
      setCompletedItems(p.checklist || {})
      setPhotosList(p.photos || [])
    }
  }

  const handleCheckChange = (item: string) => {
    setCompletedItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }))
  }

  const handleRemovePhoto = (index: number) => {
    const updated = photosList.filter((_, i) => i !== index)
    setPhotosList(updated)
  }

  const handleUpdate = async () => {
    if (!selectedProjectId) return
    setLoading(true)

    const total = DEFAULT_CHECKLIST.length
    const doneCount = DEFAULT_CHECKLIST.filter((item) => completedItems[item]).length
    const progressPercentage = Math.round((doneCount / total) * 100)

    const updatedPhotos = photoUrl.trim() ? [...photosList, photoUrl.trim()] : photosList

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

  // 登入驗證遮罩
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form onSubmit={handleAdminLogin} className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
          <h1 className="text-xl font-bold mb-4 text-center text-gray-800">工程後台管理員登入</h1>
          {loginError && <p className="text-red-500 text-sm mb-3 text-center font-medium">{loginError}</p>}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1 text-gray-700">管理員帳號</label>
            <input
              type="text"
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="請輸入帳號"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-1 text-gray-700">管理員密碼</label>
            <input
              type="password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="請輸入密碼"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition">
            登入後台
          </button>
        </form>
      </div>
    )
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">裝修進度 - 後台管理</h1>
        <button
          onClick={() => setIsAuthenticated(false)}
          className="text-sm bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-300"
        >
          登出
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md mb-6 space-y-6">
        <div>
          <label className="block font-semibold mb-2 text-gray-700">選擇工程單位：</label>
          <select
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="w-full p-2.5 border rounded-lg bg-gray-50 font-medium"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address} ({p.client_phone})
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-blue-900">目前預算進度：</span>
              <span className="text-lg font-bold text-blue-600">{selectedProject.progress}%</span>
            </div>
            <div className="w-full bg-blue-200 h-3 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${selectedProject.progress}%` }}></div>
            </div>
          </div>
        )}

        <div>
          <h2 className="font-semibold text-lg mb-3 text-gray-800">施工 Checklist：</h2>
          <div className="space-y-2">
            {DEFAULT_CHECKLIST.map((item) => (
              <label key={item} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100 transition">
                <input
                  type="checkbox"
                  checked={!!completedItems[item]}
                  onChange={() => handleCheckChange(item)}
                  className="w-5 h-5 accent-blue-600 rounded"
                />
                <span className="text-gray-800 font-medium">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-lg mb-2 text-gray-800">現場相片管理：</h2>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="新增相片 URL"
            className="w-full p-2.5 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {photosList.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {photosList.map((url, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border">
                  <img src={url} alt={`Photo ${idx}`} className="w-full h-20 object-cover" />
                  <button
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded opacity-90 hover:opacity-100"
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleUpdate}
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-blue-700 transition"
        >
          {loading ? '更新中...' : '儲存並更新進度'}
        </button>
      </div>
    </div>
  )
}
