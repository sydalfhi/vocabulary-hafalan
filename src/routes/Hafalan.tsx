import { useState, useEffect, useRef } from 'react'
import { useVocabularyStore } from '../store/useVocabularyStore'
import { speak } from '../utils/speech'
import { PlayIcon, PauseIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid'

export default function Hafalan() {
    const { data } = useVocabularyStore()
    const [bahasa, setBahasa] = useState<'en' | 'id'>('en')
    const [mode, setMode] = useState<'manual' | 'otomatis'>('manual')
    const [acak, setAcak] = useState(false)
    const [dariHari, setDariHari] = useState(1)
    const [sampaiHari, setSampaiHari] = useState(1)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isFocusMode, setIsFocusMode] = useState(false)

    // State tampilan
    const [showFirst, setShowFirst] = useState(true)
    const [showSecond, setShowSecond] = useState(false)
    const [currentItem, setCurrentItem] = useState<any>(null)
    const [listItem, setListItem] = useState<any[]>([])

    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Ambil data sesuai rentang & acak/urut
    useEffect(() => {
        const selected = data
            .filter((h) => h.id_hari >= dariHari && h.id_hari <= sampaiHari)
            .flatMap((h) => h.isi)

        let finalList = [...selected]
        if (acak) {
            for (let i = finalList.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [finalList[i], finalList[j]] = [finalList[j], finalList[i]]
            }
        }
        setListItem(finalList)
    }, [data, dariHari, sampaiHari, acak])

    // Auto play
    useEffect(() => {
        if (mode === 'otomatis' && isPlaying && listItem.length > 0) {
            startAuto()
        } else {
            if (intervalRef.current) clearTimeout(intervalRef.current)
        }
        return () => {
            if (intervalRef.current) clearTimeout(intervalRef.current)
        }
    }, [isPlaying, mode, listItem, bahasa])

    const startAuto = () => {
        let index = 0
        const playNext = () => {
            if (index >= listItem.length) {
                setIsPlaying(false)
                return
            }
            const item = listItem[index]
            setCurrentItem(item)
            setShowFirst(true)
            setShowSecond(false)

            speak(bahasa === 'en' ? item.english : item.indonesia, bahasa)

            setTimeout(() => {
                setShowSecond(true)
                speak(bahasa === 'en' ? item.indonesia : item.english, bahasa === 'en' ? 'id' : 'en')
            }, 3000)

            index++
            intervalRef.current = setTimeout(playNext, 6000)
        }
        playNext()
    }

    const handleManualClick = () => {
        if (!currentItem && listItem.length > 0) {
            setCurrentItem(listItem[0])
            setShowFirst(true)
            setShowSecond(false)
            speak(bahasa === 'en' ? listItem[0].english : listItem[0].indonesia, bahasa)
            return
        }

        if (showFirst && !showSecond) {
            setShowSecond(true)
            speak(bahasa === 'en' ? currentItem.indonesia : currentItem.english, bahasa === 'en' ? 'id' : 'en')
        } else {
            const idx = listItem.findIndex((i: any) => i.id === currentItem.id)
            if (idx < listItem.length - 1) {
                const next = listItem[idx + 1]
                setCurrentItem(next)
                setShowFirst(true)
                setShowSecond(false)
                speak(bahasa === 'en' ? next.english : next.indonesia, bahasa)
            }
        }
    }

    return (
        <div className={`min-h-screen flex flex-col ${isFocusMode ? 'bg-black' : 'bg-slate-900'}`}>
            {/* Tombol Mode Fokus – Selalu ada di kanan bawah */}
            <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                className="fixed bottom-6 right-6 z-50 bg-cyan-600 hover:bg-cyan-500 text-white p-4 rounded-full shadow-2xl transition-all"
                title={isFocusMode ? "Keluar Mode Fokus" : "Masuk Mode Fokus"}
            >
                {isFocusMode ? <EyeSlashIcon className="w-7 h-7" /> : <EyeIcon className="w-7 h-7" />}
            </button>

            {/* Setting – Hanya muncul kalau TIDAK fokus */}
            {!isFocusMode && (
                <div className="p-4 bg-slate-800 border-b border-slate-700">
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <select value={bahasa} onChange={(e) => setBahasa(e.target.value as 'en' | 'id')} className="bg-slate-700 p-2 rounded">
                            <option value="en">English → Indonesia</option>
                            <option value="id">Indonesia → English</option>
                        </select>
                        <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="bg-slate-700 p-2 rounded">
                            <option value="manual">Manual</option>
                            <option value="otomatis">Otomatis</option>
                        </select>
                        <label className="col-span-2 flex items-center gap-2">
                            <input type="checkbox" checked={acak} onChange={(e) => setAcak(e.target.checked)} className="w-5 h-5" />
                            <span>Acak (semua muncul sekali)</span>
                        </label>
                        <div className="flex gap-2 items-center col-span-2 text-sm">
                            <span>Dari hari</span>
                            <input type="number" value={dariHari} onChange={(e) => setDariHari(Number(e.target.value))} className="w-16 bg-slate-700 p-2 rounded text-center" min="1" />
                            <span>s/d</span>
                            <input type="number" value={sampaiHari} onChange={(e) => setSampaiHari(Number(e.target.value))} className="w-16 bg-slate-700 p-2 rounded text-center" min="1" />
                        </div>
                    </div>

                    {mode === 'otomatis' && (
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-lg ${isPlaying ? 'bg-red-600' : 'bg-green-600'}`}
                        >
                            {isPlaying ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />}
                            {isPlaying ? 'Stop' : 'Play Otomatis'}
                        </button>
                    )}
                </div>
            )}

            {/* Layar Hafalan – Selalu penuh */}
            <div
                className="flex-1 flex items-center justify-center bg-black cursor-pointer relative"
                onClick={mode === 'manual' ? handleManualClick : undefined}
            >
                {currentItem ? (
                    <div className="text-center p-8 max-w-4xl">
                        {showFirst && (
                            <div className="text-5xl md:text-7xl font-bold mb-10 text-white animate-fadeIn">
                                {bahasa === 'en' ? currentItem.english : currentItem.indonesia}
                            </div>
                        )}
                        {showSecond && (
                            <div className="text-4xl md:text-6xl font-medium text-cyan-400 animate-fadeIn">
                                {bahasa === 'en' ? currentItem.indonesia : currentItem.english}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-2xl md:text-4xl text-gray-500 text-center px-8">
                        {mode === 'manual'
                            ? 'Tap layar untuk mulai menghafal'
                            : 'Atur setting lalu tekan Play Otomatis'}
                    </div>
                )}
            </div>

            {/* Animasi fade in */}
            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
        </div>
    )
}