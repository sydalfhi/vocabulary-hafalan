import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useVocabularyStore, type Hari, type Item } from '../store/useVocabularyStore'
import { PlusIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function InputHari() {
    const navigate = useNavigate()
    const location = useLocation()
    const { data, addHari, updateHari } = useVocabularyStore()

    // Kalau ada state dari navigasi (edit mode)
    const editHari: Hari | null = location.state?.hari || null

    const [label, setLabel] = useState(editHari?.label || '')
    const [items, setItems] = useState<Item[]>(
        editHari?.isi.length
            ? editHari.isi
            : [{ id: 1, english: '', indonesia: '' }]
    )

    // Generate id_hari otomatis (max + 1)
    const nextIdHari = data.length > 0 ? Math.max(...data.map(h => h.id_hari)) + 1 : 1

    const handleAddRow = () => {
        const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1
        setItems([...items, { id: newId, english: '', indonesia: '' }])
    }

    const handleRemoveRow = (id: number) => {
        if (items.length === 1) {
            alert('Minimal harus ada 1 kata')
            return
        }
        setItems(items.filter(i => i.id !== id))
    }

    const handleItemChange = (id: number, field: 'english' | 'indonesia', value: string) => {
        setItems(items.map(i =>
            i.id === id ? { ...i, [field]: value } : i
        ))
    }

    const handleSubmit = () => {
        // Validasi
        if (!label.trim()) {
            alert('Label hari wajib diisi')
            return
        }
        if (items.some(i => !i.english.trim() || !i.indonesia.trim())) {
            alert('Semua kata English & Indonesia harus diisi')
            return
        }

        const newHari: Hari = {
            id_hari: editHari?.id_hari || nextIdHari,
            label: label.trim(),
            isi: items.map((item, idx) => ({
                ...item,
                id: idx + 1 // renumber ulang supaya rapi
            }))
        }

        if (editHari) {
            updateHari(editHari.id_hari, newHari)
            alert('Hari berhasil diperbarui!')
        } else {
            addHari(newHari)
            alert('Hari baru berhasil ditambahkan!')
        }

        navigate('/')
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24">
            {/* Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 z-10">
                <div className="flex items-center justify-between p-4">
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">
                        {editHari ? 'Edit Hari' : 'Tambah Hari Baru'}
                    </h1>
                    <div className="w-10" />
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Label Hari */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Label Hari <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Contoh: Hafalan 1, Hari Ke-5, dll"
                        className="w-full px-4 py-3 bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>

                {/* Daftar Kata */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold">
                            Kata-kata ({items.length})
                        </h2>
                        <button
                            onClick={handleAddRow}
                            className="flex items-center gap-2 bg-cyan-600 px-4 py-2 rounded-lg text-sm"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Tambah Baris
                        </button>
                    </div>

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-gray-400">Kata #{index + 1}</span>
                                    {items.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveRow(item.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <input
                                        type="text"
                                        value={item.english}
                                        onChange={(e) => handleItemChange(item.id, 'english', e.target.value)}
                                        placeholder="English..."
                                        className="px-4 py-3 bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <input
                                        type="text"
                                        value={item.indonesia}
                                        onChange={(e) => handleItemChange(item.id, 'indonesia', e.target.value)}
                                        placeholder="Indonesia..."
                                        className="px-4 py-3 bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex gap-3 pt-6">
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 py-4 bg-slate-700 rounded-lg font-medium"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-bold text-lg"
                    >
                        {editHari ? 'Update Hari' : 'Simpan Hari'}
                    </button>
                </div>
            </div>
        </div>
    )
}