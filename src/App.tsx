import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Home from './routes/Home'
import InputHari from './routes/InputHari'
import Hafalan from './routes/Hafalan'
import { HomeIcon, PlusCircleIcon, BookOpenIcon } from '@heroicons/react/24/outline'

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Tampilkan dialog install dari browser
    deferredPrompt.prompt()

    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('User menginstall app!')
      setShowInstallButton(false)
      setDeferredPrompt(null)
    }
  }
  // === End PWA Logic ===

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-white pb-20 md:pb-0">

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/input" element={<InputHari />} />
          <Route path="/hafalan" element={<Hafalan />} />
        </Routes>

        {/* Bottom Navigation + Install Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-40">
          <div className="flex justify-around items-center py-3">

            <NavLink to="/" className={({ isActive }) => `flex flex-col items-center ${isActive ? 'text-cyan-400' : 'text-gray-400'}`}>
              <HomeIcon className="w-7 h-7" />
              <span className="text-xs">Home</span>
            </NavLink>

            <NavLink to="/input" className={({ isActive }) => `flex flex-col items-center ${isActive ? 'text-cyan-400' : 'text-gray-400'}`}>
              <PlusCircleIcon className="w-7 h-7" />
              <span className="text-xs">Input</span>
            </NavLink>

            <NavLink to="/hafalan" className={({ isActive }) => `flex flex-col items-center ${isActive ? 'text-cyan-400' : 'text-gray-400'}`}>
              <BookOpenIcon className="w-7 h-7" />
              <span className="text-xs">Hafalan</span>
            </NavLink>

            {/* Tombol Install PWA – Hanya muncul kalau bisa diinstall */}
            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                className="flex flex-col items-center text-green-400 animate-bounce"
                title="Install aplikasi ke Layar Utama"
              >
                {/* Icon Download yang benar & cantik */}
                <svg
                  className="w-8 h-8 drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                <span className="text-xs font-bold mt-1">Install</span>
              </button>
            )}
          </div>
        </div>

        {/* Pesan kecil kalau sudah diinstall */}
        {window.matchMedia('(display-mode: standalone)').matches && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full text-sm z-50 animate-pulse">
            Aplikasi berhasil diinstall!
          </div>
        )}
      </div>
    </BrowserRouter>
  )
}