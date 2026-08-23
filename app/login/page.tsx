'use client'

import { useState } from 'react'

export default function LoginNewPage() {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '登入失敗')
      }

      if (data.projectId) {
        localStorage.removeItem('client_project_id')
        localStorage.setItem('client_project_id', data.projectId)
        window.location.href = '/dashboard'
      } else {
        throw new Error('登入失敗：未取得有效的工程 ID')
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-xl mb-2 text-xl font-bold">
            🏠
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            裝修工程進度查詢
          </h1>
          <p className="text-xs text-slate-500">
            請輸入我們提供給您的電話號碼與 4 位數 PIN 碼
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium leading-relaxed">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              電話號碼
            </label>
            <input
              type="tel"
              required
              maxLength={8}
              placeholder="請輸入電話號碼"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              4 位數 PIN 碼
            </label>
            <input
              type="password"
              required
              maxLength={4}
              placeholder="請輸入4位PIN碼"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition tracking-widest"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition active:scale-[0.99] text-sm mt-2"
          >
            {loading ? '驗證身份中...' : '登入系統'}
          </button>
        </form>
      </div>
    </div>
  )
}
