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

          <div className="mt-5 space-y-3 text-center">
            <p className="text-[11px] text-stone-400 tracking-wide leading-relaxed">
              如未能登入或有其他問題，請聯絡裝修仔 Kenny
            </p>
            <a
              href="https://wa.me/85298182741"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full max-w-md mx-auto px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#128C7E] hover:bg-[#0e6f64] transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp 聯絡 Kenny
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
