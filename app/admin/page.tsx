'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Project {
  id: string
  address: string
  status: string
  stages_state?: Record<string, boolean>
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

  // 日誌發佈表單
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [photos, setPhotos] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setProjects(data)
      setSelectedProjectId(data[0].id)
      
      // 預設將未說明的類別設為「啟用 (true)」
      const initialState = data[0].stages_state || {}
      INITIAL_STAGES.forEach(stage => {
        const catKey = `CATEGORY_ENABLED-${stage.category}`
        if (initialState[catKey] === undefined) {
          initialState[catKey] = true
        }
      })
      setStagesState(initialState)
    }
  }

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    const proj = projects.find((p) => p.id === projectId)
    if (proj) {
      const state = proj.stages_state || {}
      INITIAL_STAGES.forEach(stage => {
        const catKey = `CATEGORY_ENABLED-${stage.category}`
        if (state[catKey] === undefined) {
          state[catKey] = true
        }
      })
      setStagesState(state)
    }
  }

  // 自動儲存到 Supabase
  const saveStagesToSupabase = async (newState: Record<string, boolean>) => {
    if (!selectedProjectId) return
    setSaving(true)

    const { error } = await supabase
      .from('projects')
      .update({ stages_state: newState })
      .eq('id', selectedProjectId)

    if (error) {
      console.error('儲存失敗:', error)
    } else {
      setProjects((prev) =>
        prev.map((p) => (p.id === selectedProjectId ? { ...p, stages_state: newState } : p))
      )
    }
    setSaving(false)
  }

  // 切換大類別啟用/禁用
  const toggleCategory = (category: string) => {
    const catKey = `CATEGORY_ENABLED-${category}`
    const updated = {
      ...stagesState,
      [catKey]: !stagesState[catKey]
    }
    setStagesState(updated)
    saveStagesToSupabase(updated)
  }

  // 切換細項勾選
  const toggleStageItem = (category: string, item: string) => {
    const itemKey = `${category}-${item}`
    const updated = {
      ...stagesState,
      [itemKey]: !stagesState[itemKey]
    }
    setStagesState(updated)
    saveStagesToSupabase(updated)
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
              <option key={p.id} value={p.id}>
                {p.address}
              </option>
            ))}
          </select>
          {saving && <span className="text-xs text-blue-500 font-medium animate-pulse">儲存中...</span>}
        </div>

        {/* 9 大工程管理清單 */}
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 border-b pb-2">工程階段項目設定（勾選即自動同步客戶端）</h2>

          <div className="space-y-6">
            {INITIAL_STAGES.map((stage) => {
              const catKey = `CATEGORY_ENABLED-${stage.category}`
              const isCategoryEnabled = stagesState[catKey] !== false // 預設為 true

              return (
                <div
                  key={stage.category}
                  className={`border rounded-xl p-4 transition ${
                    isCategoryEnabled ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200/50 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-slate-800">{stage.category}</span>

                    {/* 大項開關按鈕 */}
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

                  {/* 細項列表：大項禁用時灰色凍結 */}
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
