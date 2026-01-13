import { useState, useEffect, useRef } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ===== TYPES =====
type Kosakata = {
  id: number
  english: string
  indonesia: string
}

type KosokataStore = {
  words: Kosakata[]
  addWord: (word: Omit<Kosakata, 'id'>) => void
  deleteWord: (id: number) => void
  importWords: (words: Kosakata[]) => void
}

// ===== STORE =====
const useKosokataStore = create<KosokataStore>()(
  persist(
    (set) => ({
      words: [],
      addWord: (word) =>
        set((state) => ({
          words: [
            ...state.words,
            { ...word, id: Date.now() + Math.random() }
          ]
        })),
      deleteWord: (id) =>
        set((state) => ({
          words: state.words.filter((w) => w.id !== id)
        })),
      importWords: (newWords) =>
        set((state) => {
          const existingIds = new Set(state.words.map(w => w.id))
          const wordsToAdd = newWords.filter(w => !existingIds.has(w.id))
          return { words: [...state.words, ...wordsToAdd] }
        })
    }),
    {
      name: 'kosakata-storage'
    }
  )
)

// ===== SPEECH UTILS =====
const speak = (text: string, lang: 'en' | 'id') => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang === 'en' ? 'en-US' : 'id-ID'
    utterance.rate = 0.9
    utterance.pitch = 1

    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find((v) =>
      lang === 'en'
        ? v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))
        : v.lang === 'id-ID'
    )
    if (voice) utterance.voice = voice

    window.speechSynthesis.speak(utterance)
  }
}

// ===== MAIN COMPONENT =====
export default function Kosakata() {
  const { words, addWord, deleteWord, importWords } = useKosokataStore()
  
  const [english, setEnglish] = useState('')
  const [indonesia, setIndonesia] = useState('')
  const [mode, setMode] = useState<'tabel' | 'otomatis'>('tabel')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showIndonesia, setShowIndonesia] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [showImport, setShowImport] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Handle tambah kata
  const handleAdd = () => {
    if (english.trim() && indonesia.trim()) {
      addWord({ english: english.trim(), indonesia: indonesia.trim() })
      setEnglish('')
      setIndonesia('')
    }
  }

  // Export JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(words, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kosakata-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Import JSON (menambahkan, bukan replace)
  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      if (Array.isArray(parsed)) {
        importWords(parsed)
        setJsonInput('')
        setShowImport(false)
        alert('Berhasil menambahkan ' + parsed.length + ' kata!')
      } else {
        alert('Format harus berupa array')
      }
    } catch (e) {
      alert('JSON tidak valid: ' + e.message)
    }
  }

  // Auto play mode
  useEffect(() => {
    if (mode === 'otomatis' && isPlaying && words.length > 0) {
      startAutoPlay()
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, mode, words, currentIndex])

  const startAutoPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    setShowIndonesia(false)
    const current = words[currentIndex]
    speak(current.english, 'en')

    const timeout1 = setTimeout(() => {
      setShowIndonesia(true)
      speak(current.indonesia, 'id')
    }, 3000)

    const timeout2 = setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex((prev) => prev + 1)
      } else {
        setIsPlaying(false)
        setCurrentIndex(0)
      }
    }, 6000)

    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
    }
  }

  const sampleJSON = `[
  { "id": 1, "english": "suddenly", "indonesia": "tiba-tiba" },
  { "id": 2, "english": "although", "indonesia": "meskipun" },
  { "id": 3, "english": "immediately", "indonesia": "segera" }
]`

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-cyan-400">📚 Kosakata</h1>

        {/* Input Form */}
        <div className="bg-slate-800 p-6 rounded-lg mb-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-2 text-gray-300">English</label>
              <input
                type="text"
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="e.g. suddenly"
                className="w-full bg-slate-700 p-3 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-300">Indonesia</label>
              <input
                type="text"
                value={indonesia}
                onChange={(e) => setIndonesia(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="e.g. tiba-tiba"
                className="w-full bg-slate-700 p-3 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              className="bg-cyan-600 hover:bg-cyan-500 px-6 py-2 rounded font-semibold flex items-center gap-2 transition-colors"
            >
              <span className="text-xl">+</span>
              Tambah Kata
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded font-semibold transition-colors"
            >
              {showImport ? 'Tutup Import' : '📥 Import JSON'}
            </button>
            <button
              onClick={handleExport}
              disabled={words.length === 0}
              className="bg-green-700 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed px-6 py-2 rounded font-semibold transition-colors"
            >
              📤 Export JSON
            </button>
          </div>

          {showImport && (
            <div className="mt-4 p-4 bg-slate-700 rounded">
              <p className="text-sm text-gray-300 mb-2">Format JSON (data akan ditambahkan, tidak replace):</p>
              <pre className="text-xs bg-black p-3 rounded mb-3 overflow-x-auto text-green-400">
                {sampleJSON}
              </pre>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste JSON array di sini..."
                className="w-full bg-slate-800 p-3 rounded border border-slate-600 h-32 font-mono text-sm"
              />
              <button
                onClick={handleImport}
                className="mt-2 bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-semibold transition-colors"
              >
                Import & Tambahkan
              </button>
            </div>
          )}
        </div>

        {/* Mode Selector */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => {
              setMode('tabel')
              setIsPlaying(false)
            }}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              mode === 'tabel'
                ? 'bg-cyan-600 text-white shadow-lg scale-105'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            📋 Mode Tabel
          </button>
          <button
            onClick={() => setMode('otomatis')}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              mode === 'otomatis'
                ? 'bg-cyan-600 text-white shadow-lg scale-105'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            🎯 Mode Hafalan Otomatis
          </button>
        </div>

        {/* Content */}
        {mode === 'tabel' ? (
          <div className="bg-slate-800 rounded-lg overflow-hidden shadow-xl">
            {words.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-xl">Belum ada kosakata. Tambahkan kata pertama Anda!</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="p-4 text-left">No</th>
                    <th className="p-4 text-left">English</th>
                    <th className="p-4 text-left">Indonesia</th>
                    <th className="p-4 text-center w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((word, idx) => (
                    <tr key={word.id} className="border-t border-slate-700 hover:bg-slate-750">
                      <td className="p-4 text-gray-400">{idx + 1}</td>
                      <td className="p-4 font-semibold text-cyan-300">
                        <div className="flex items-center gap-2">
                          {word.english}
                          <button
                            onClick={() => speak(word.english, 'en')}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Dengar English"
                          >
                            🔊
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {word.indonesia}
                          <button
                            onClick={() => speak(word.indonesia, 'id')}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Dengar Indonesia"
                          >
                            🔊
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => deleteWord(word.id)}
                          className="text-red-400 hover:text-red-300 transition-colors px-3 py-1"
                          title="Hapus"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="bg-black rounded-lg p-12 min-h-[500px] flex flex-col items-center justify-center shadow-2xl">
            {words.length === 0 ? (
              <p className="text-2xl text-gray-500">Tambahkan kata terlebih dahulu</p>
            ) : (
              <>
                <div className="text-center mb-8 w-full max-w-2xl">
                  {!isPlaying ? (
                    <button
                      onClick={() => {
                        setCurrentIndex(0)
                        setShowIndonesia(false)
                        setIsPlaying(true)
                      }}
                      className="bg-green-600 hover:bg-green-500 px-8 py-4 rounded-lg font-bold text-xl flex items-center gap-3 mx-auto transition-all shadow-lg"
                    >
                      <span className="text-2xl">▶️</span>
                      Mulai Hafalan
                    </button>
                  ) : (
                    <>
                      <div className="mb-6">
                        <div className="text-6xl font-bold text-white mb-8 animate-fadeIn">
                          {words[currentIndex].english}
                        </div>
                        {showIndonesia && (
                          <div className="text-5xl font-medium text-cyan-400 animate-fadeIn">
                            {words[currentIndex].indonesia}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4 justify-center items-center">
                        <button
                          onClick={() => {
                            setIsPlaying(false)
                            window.speechSynthesis.cancel()
                          }}
                          className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
                        >
                          <span className="text-xl">⏸️</span>
                          Stop
                        </button>
                        <span className="text-gray-400 text-lg">
                          {currentIndex + 1} / {words.length}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

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