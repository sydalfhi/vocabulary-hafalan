import { useState, useMemo } from 'react'
import { useVocabularyStore } from '../store/useVocabularyStore'
import { speak } from '../utils/speech'
import { SpeakerWaveIcon } from '@heroicons/react/24/outline'

export default function Home() {
    const { data } = useVocabularyStore()
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const perPage = 10

    // Flatten semua kata untuk search
    const allItems = useMemo(() => {
        return data.flatMap((hari) =>
            hari.isi.map((item) => ({ ...item, hariLabel: hari.label, id_hari: hari.id_hari }))
        )
    }, [data])

    const filtered = useMemo(() => {
        return allItems.filter(
            (i) =>
                i.english.toLowerCase().includes(search.toLowerCase()) ||
                i.indonesia.toLowerCase().includes(search.toLowerCase())
        )
    }, [allItems, search])

    const paginated = filtered.slice((page - 1) * perPage, page * perPage)
    const totalPages = Math.ceil(filtered.length / perPage)

    const exportJson = () => {
        const json = JSON.stringify({ data }, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'vocabulary.json'
        a.click()
    }

    const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const obj = JSON.parse(ev.target?.result as string)
                useVocabularyStore.getState().setData(obj.data || obj)
                alert('Import berhasil!')
            } catch (err) {
                alert('File JSON tidak valid')
            }
        }
        reader.readAsText(file)
    }

    return (
        <div className="pb-20 pt-4 px-4">
            <h1 className="text-2xl font-bold mb-4">Daftar Hafalan</h1>

            <div className="flex gap-2 mb-4 flex-wrap">
                <input
                    type="text"
                    placeholder="Cari English / Indonesia..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                    }}
                    className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-sm"
                />
                <label className="bg-green-600 px-4 py-2 rounded-lg text-sm cursor-pointer">
                    Import
                    <input type="file" accept=".json" onChange={importJson} className="hidden" />
                </label>
                <button onClick={exportJson} className="bg-cyan-600 px-4 py-2 rounded-lg text-sm">
                    Export
                </button>
                <button
                    onClick={() => {
                        if (confirm('Yakin ingin menghapus SEMUA data hafalan? Tidak bisa dikembalikan!')) {
                            localStorage.removeItem('vocabulary-storage')
                            window.location.reload()
                        }
                    }}
                    className="bg-red-600 px-4 py-2 rounded-lg text-sm"
                >
                    🗑️ Reset Semua Data
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="text-left py-2">Hari</th>
                            <th className="text-left py-2">English</th>
                            <th className="text-left py-2">Indonesia</th>
                            <th className="w-20"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-800">
                                <td className="py-3">{item.hariLabel}</td>
                                <td className="py-3">{item.english}</td>
                                <td className="py-3">{item.indonesia}</td>
                                <td className="py-3 flex gap-1">
                                    <button onClick={() => speak(item.english, 'en')}>
                                        <SpeakerWaveIcon className="w-5 h-5 text-cyan-400" />
                                    </button>
                                    <button onClick={() => speak(item.indonesia, 'id')}>
                                        <SpeakerWaveIcon className="w-5 h-5 text-green-400" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i + 1)}
                            className={`px-3 py-1 rounded ${page === i + 1 ? 'bg-cyan-600' : 'bg-slate-700'}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}