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

      if (!res.ok || !data.success) {
        throw new Error(data.error || '登入失敗，請確認電話與 PIN 碼')
      }

      window.location.href = '/dashboard'
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f1ee] text-stone-800 flex flex-col">
      <header className="bg-[#1c1917] text-stone-100 border-b border-stone-700/60">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-teal-400/90 font-medium">Progress Portal</p>
          <h1 className="text-lg sm:text-xl font-semibold tracking-wide mt-0.5">裝修工程進度查詢</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-stone-200/90 shadow-[0_1px_2px_rgba(28,25,23,0.04)] overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100 bg-gradient-to-br from-white to-stone-50">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">客戶登入</p>
              <h2 className="text-xl font-semibold text-stone-900 mt-1">查閱你的工程進度</h2>
              <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                請輸入我們提供的電話號碼與 4 位數 PIN 碼
              </p>
            </div>

            <form onSubmit={handleLogin} className="px-6 py-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium leading-relaxed">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500 mb-1.5">
                  電話號碼
                </label>
                <input
                  type="tel"
                  required
                  maxLength={8}
                  inputMode="numeric"
                  placeholder="8 位電話號碼"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500 mb-1.5">
                  PIN 碼
                </label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="4 位 PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700 transition tracking-[0.35em]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1c1917] hover:bg-stone-800 disabled:opacity-60 text-stone-50 font-semibold py-3 rounded-lg transition text-sm mt-1"
              >
                {loading ? '驗證中…' : '進入進度查詢'}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-stone-400 mt-5 tracking-wide">
            如未能登入，請聯絡你的工程負責人
          </p>
        </div>
      </main>
    </div>
  )
}
