import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useVocabularyStore,
  type Hari,
  type Item,
} from "../store/useVocabularyStore";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function InputHari() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, addHari, updateHari } = useVocabularyStore();

  // Kalau ada state dari navigasi (edit mode)
  const editHari: Hari | null = location.state?.hari || null;

  // Convert existing data ke format text untuk edit mode
  const initialText =
    editHari?.isi
      .map((item) => `${item.english} = ${item.indonesia}`)
      .join("\n") || "";

  const [idHari, setIdHari] = useState(editHari?.id_hari?.toString() || "");
  const [label, setLabel] = useState(editHari?.label || "");
  const [textInput, setTextInput] = useState(initialText);
  const [preview, setPreview] = useState<Item[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Generate id_hari otomatis (max + 1)
  const nextIdHari =
    data.length > 0 ? Math.max(...data.map((h) => h.id_hari)) + 1 : 1;

  // Parse text menjadi array items
  const parseText = () => {
    const lines = textInput.split("\n").filter((line) => line.trim());
    const items: Item[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Cek format: english = indonesia
      if (!trimmed.includes("=")) {
        errors.push(
          `Baris ${index + 1}: Format salah, harus "english = indonesia"`,
        );
        return;
      }

      const parts = trimmed.split("=").map((p) => p.trim());
      if (parts.length !== 2) {
        errors.push(`Baris ${index + 1}: Harus ada 1 tanda "=" saja`);
        return;
      }

      const [english, indonesia] = parts;
      if (!english || !indonesia) {
        errors.push(
          `Baris ${index + 1}: English dan Indonesia tidak boleh kosong`,
        );
        return;
      }

      items.push({
        id: index + 1,
        english,
        indonesia,
      });
    });

    if (errors.length > 0) {
      alert("Ada kesalahan format:\n\n" + errors.join("\n"));
      return null;
    }

    if (items.length === 0) {
      alert("Tidak ada data yang valid. Minimal harus ada 1 kata.");
      return null;
    }

    return items;
  };

  const handlePreview = () => {
    const items = parseText();
    if (items) {
      setPreview(items);
      setShowPreview(true);
    }
  };

  const handleSubmit = () => {
    // Validasi id_hari dan label
    const numIdHari = editHari?.id_hari || parseInt(idHari) || nextIdHari;

    if (!label.trim()) {
      alert("Label hari wajib diisi!");
      return;
    }

    // Parse ulang untuk submit
    const items = parseText();
    if (!items) return;

    const newHari: Hari = {
      id_hari: numIdHari,
      label: label.trim(),
      isi: items,
    };

    if (editHari) {
      updateHari(editHari.id_hari, newHari);
      alert(
        `✅ Hari "${label}" berhasil diperbarui!\n${items.length} kata disimpan.`,
      );
    } else {
      addHari(newHari);
      alert(
        `✅ Hari "${label}" berhasil ditambahkan!\n${items.length} kata disimpan.`,
      );
    }

    navigate("/");
  };

  const exampleText = `hello = halo
good morning = selamat pagi
thank you = terima kasih
how are you = apa kabar
see you later = sampai jumpa`;

  const handleUseExample = () => {
    setTextInput(exampleText);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-cyan-500/20 backdrop-blur-sm z-10 shadow-xl">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-all"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            {editHari ? "✏️ Edit Hari" : "➕ Tambah Hari Baru"}
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* ID Hari - hanya tampil saat tambah baru */}
        {!editHari && (
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-slate-600/50 rounded-xl p-5">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              📌 ID Hari (Nomor urut)
            </label>
            <input
              type="number"
              value={idHari}
              onChange={(e) => setIdHari(e.target.value)}
              placeholder={`Otomatis: ${nextIdHari}`}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
            />
            <p className="text-xs text-gray-400 mt-2">
              Kosongkan untuk auto-generate:{" "}
              <span className="text-cyan-400 font-semibold">{nextIdHari}</span>
            </p>
          </div>
        )}

        {/* Label Hari */}
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-slate-600/50 rounded-xl p-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            🏷️ Label Hari <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Contoh: Hafalan 1, Hari Ke-5, Week 1, dll"
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
          />
        </div>

        {/* Textarea Input */}
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-slate-600/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-300">
              📝 Daftar Kata-kata <span className="text-red-400">*</span>
            </label>
            <button
              onClick={handleUseExample}
              className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-all"
            >
              Pakai Contoh
            </button>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-300 font-medium mb-2">
              📖 Format Penulisan:
            </p>
            <code className="text-sm text-gray-300 block bg-slate-900/50 p-3 rounded-lg">
              english = indonesia
              <br />
              english = indonesia
              <br />
              english = indonesia
            </code>
            <p className="text-xs text-gray-400 mt-3">
              💡 <strong>Tips:</strong> Satu baris = satu kata. Pisahkan dengan
              tanda <code className="bg-slate-700 px-1 rounded">=</code>
            </p>
          </div>

          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`Ketik atau paste kata-kata di sini...\n\nContoh:\nhello = halo\ngood morning = selamat pagi\nthank you = terima kasih`}
            className="w-full h-80 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500 font-mono text-sm resize-none"
            spellCheck={false}
          />

          <div className="flex items-center justify-between mt-3 text-sm text-gray-400">
            <span>
              {textInput.split("\n").filter((l) => l.trim()).length} baris
            </span>
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-white transition-all"
            >
              <DocumentTextIcon className="w-5 h-5" />
              Preview
            </button>
          </div>
        </div>

        {/* Preview */}
        {showPreview && preview.length > 0 && (
          <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                <CheckCircleIcon className="w-6 h-6" />
                Preview ({preview.length} kata)
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-sm text-gray-400 hover:text-white"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {preview.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/50"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 text-sm font-mono min-w-[2rem]">
                      #{index + 1}
                    </span>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">
                          🇬🇧 English
                        </span>
                        <span className="text-white font-medium">
                          {item.english}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">
                          🇮🇩 Indonesia
                        </span>
                        <span className="text-green-400 font-medium">
                          {item.indonesia}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="flex gap-3 pt-6">
          <button
            onClick={() => navigate("/")}
            className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-all"
          >
            ❌ Batal
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            {editHari ? "💾 Update Hari" : "✅ Simpan Hari"}
          </button>
        </div>

        {/* Helper Info */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">
            💡 Tips Cepat:
          </h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Bisa copy-paste dari Excel/Google Sheets langsung</li>
            <li>• Setiap baris = 1 kata</li>
            <li>
              • Format:{" "}
              <code className="bg-slate-700 px-1 rounded">
                english = indonesia
              </code>
            </li>
            <li>• Klik "Preview" untuk cek sebelum simpan</li>
            <li>• Baris kosong akan diabaikan otomatis</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
