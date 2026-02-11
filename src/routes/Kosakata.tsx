import { useState, useEffect, useRef } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ===== TYPES =====
type Kosakata = {
  id: number;
  english: string;
  indonesia: string;
};

type KosokataStore = {
  words: Kosakata[];
  addWord: (word: Omit<Kosakata, "id">) => void;
  deleteWord: (id: number) => void;
  importWords: (words: Kosakata[]) => void;
  clearAll: () => void;
};

// ===== STORE =====
const useKosokataStore = create<KosokataStore>()(
  persist(
    (set) => ({
      words: [],
      addWord: (word) =>
        set((state) => ({
          words: [...state.words, { ...word, id: Date.now() + Math.random() }],
        })),
      deleteWord: (id) =>
        set((state) => ({
          words: state.words.filter((w) => w.id !== id),
        })),
      importWords: (newWords) =>
        set((state) => {
          const existingIds = new Set(state.words.map((w) => w.id));
          const wordsToAdd = newWords.filter((w) => !existingIds.has(w.id));
          return { words: [...state.words, ...wordsToAdd] };
        }),
      clearAll: () => set({ words: [] }),
    }),
    {
      name: "kosakata-storage",
    },
  ),
);

// ===== SPEECH UTILS =====
const speak = (text: string, lang: "en" | "id") => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en" ? "en-US" : "id-ID";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) =>
      lang === "en"
        ? v.lang.startsWith("en") &&
          (v.name.includes("Google") || v.name.includes("Natural"))
        : v.lang === "id-ID",
    );
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  }
};

// ===== MAIN COMPONENT =====
export default function Kosakata() {
  const { words, addWord, deleteWord, importWords, clearAll } =
    useKosokataStore();

  const [textInput, setTextInput] = useState("");
  const [mode, setMode] = useState<"tabel" | "otomatis" | "input">("tabel");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showIndonesia, setShowIndonesia] = useState(false);
  const [preview, setPreview] = useState<Kosakata[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Parse text menjadi array words
  const parseText = () => {
    const lines = textInput.split("\n").filter((line) => line.trim());
    const items: Kosakata[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

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
        id: Date.now() + Math.random() + index,
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

  const handleSaveWords = () => {
    const items = parseText();
    if (!items) return;

    items.forEach((item) => {
      addWord({ english: item.english, indonesia: item.indonesia });
    });

    alert(`✅ ${items.length} kata berhasil ditambahkan!`);
    setTextInput("");
    setShowPreview(false);
    setMode("tabel");
  };

  // Export JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(words, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kosakata-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJSON = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        importWords(parsed);
        alert("✅ Berhasil menambahkan " + parsed.length + " kata!");
      } else {
        alert("❌ Format harus berupa array");
      }
    } catch (e: any) {
      alert("❌ JSON tidak valid: " + e.message);
    }
  };

  // Wake Lock - Keep screen awake saat mode otomatis
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request(
            "screen",
          );
          console.log("Wake Lock active - layar tetap nyala");
        }
      } catch (err) {
        console.log("Wake Lock tidak didukung atau gagal:", err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log("Wake Lock released");
        } catch (err) {
          console.log("Error releasing wake lock:", err);
        }
      }
    };

    if (mode === "otomatis" && isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [mode, isPlaying]);

  // Auto play mode
  useEffect(() => {
    if (mode === "otomatis" && isPlaying && words.length > 0) {
      startAutoPlay();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, mode, words, currentIndex]);

  const startAutoPlay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    setShowIndonesia(false);
    const current = words[currentIndex];
    speak(current.english, "en");

    const timeout1 = setTimeout(() => {
      setShowIndonesia(true);
      speak(current.indonesia, "id");
    }, 2500);

    const timeout2 = setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
        setCurrentIndex(0);
      }
    }, 5500);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            📚 Kosakata
          </h1>
          <p className="text-gray-400">
            Belajar vocabulary dengan mudah dan menyenangkan
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={() => {
              setMode("input");
              setIsPlaying(false);
            }}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              mode === "input"
                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105"
                : "bg-slate-700 text-gray-300 hover:bg-slate-600"
            }`}
          >
            ➕ Tambah Kata
          </button>
          <button
            onClick={() => {
              setMode("tabel");
              setIsPlaying(false);
            }}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              mode === "tabel"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg scale-105"
                : "bg-slate-700 text-gray-300 hover:bg-slate-600"
            }`}
          >
            📋 Lihat Tabel ({words.length})
          </button>
          <button
            onClick={() => setMode("otomatis")}
            disabled={words.length === 0}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              mode === "otomatis"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105"
                : "bg-slate-700 text-gray-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            🎯 Hafalan Otomatis
          </button>
        </div>

        {/* Content */}
        {mode === "input" && (
          <div className="space-y-6">
            {/* Textarea Input */}
            <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-slate-600/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-lg font-semibold text-gray-300">
                  📝 Masukkan Kata-kata Baru
                </label>
                <button
                  onClick={handleUseExample}
                  className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-all"
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
                  💡 <strong>Tips:</strong> Satu baris = satu kata. Pisahkan
                  dengan tanda{" "}
                  <code className="bg-slate-700 px-1 rounded">=</code>
                </p>
              </div>

              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`Ketik atau paste kata-kata di sini...\n\nContoh:\nhello = halo\ngood morning = selamat pagi\nthank you = terima kasih`}
                className="w-full h-96 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500 font-mono text-sm resize-none"
                spellCheck={false}
              />

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-400">
                  {textInput.split("\n").filter((l) => l.trim()).length} baris
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={handlePreview}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg text-white font-semibold transition-all"
                  >
                    👁️ Preview
                  </button>
                  <button
                    onClick={handleSaveWords}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 px-6 py-2.5 rounded-lg text-white font-bold transition-all shadow-lg"
                  >
                    💾 Simpan Semua
                  </button>
                </div>
              </div>
            </div>

            {/* Preview */}
            {showPreview && preview.length > 0 && (
              <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-green-400 flex items-center gap-2">
                    ✅ Preview ({preview.length} kata)
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
                      className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/50"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-gray-500 text-sm font-mono min-w-[2.5rem]">
                          #{index + 1}
                        </span>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs text-gray-400 block mb-1">
                              🇬🇧 English
                            </span>
                            <span className="text-white font-semibold">
                              {item.english}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400 block mb-1">
                              🇮🇩 Indonesia
                            </span>
                            <span className="text-cyan-400 font-semibold">
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

            {/* Import/Export */}
            <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-300">
                📥 Import / Export Data
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  disabled={words.length === 0}
                  className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  📤 Export ke JSON ({words.length} kata)
                </button>
                <button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = (e: any) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          handleImportJSON(e.target?.result as string);
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                  className="flex-1 bg-blue-700 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  📥 Import dari JSON
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === "tabel" && (
          <div className="bg-slate-800/50 rounded-xl overflow-hidden shadow-xl border border-slate-700/50">
            {words.length === 0 ? (
              <div className="p-16 text-center">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-2xl text-gray-400 mb-2">
                  Belum ada kosakata
                </p>
                <p className="text-gray-500 mb-6">
                  Tambahkan kata pertama Anda untuk mulai belajar!
                </p>
                <button
                  onClick={() => setMode("input")}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-8 py-3 rounded-lg font-bold transition-all shadow-lg"
                >
                  ➕ Tambah Kata Sekarang
                </button>
              </div>
            ) : (
              <>
                <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-cyan-400">
                    Total: {words.length} kata
                  </h2>
                  <button
                    onClick={() => {
                      if (
                        confirm("Hapus semua kata? Ini tidak bisa dibatalkan!")
                      ) {
                        clearAll();
                        alert("✅ Semua kata berhasil dihapus");
                      }
                    }}
                    className="text-red-400 hover:text-red-300 text-sm font-semibold"
                  >
                    🗑️ Hapus Semua
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="p-4 text-left">No</th>
                        <th className="p-4 text-left">🇬🇧 English</th>
                        <th className="p-4 text-left">🇮🇩 Indonesia</th>
                        <th className="p-4 text-center w-32">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {words.map((word, idx) => (
                        <tr
                          key={word.id}
                          className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="p-4 text-gray-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="p-4 font-semibold text-cyan-300">
                            <div className="flex items-center gap-3">
                              {word.english}
                              <button
                                onClick={() => speak(word.english, "en")}
                                className="text-blue-400 hover:text-blue-300 transition-colors text-lg"
                                title="Dengar English"
                              >
                                🔊
                              </button>
                            </div>
                          </td>
                          <td className="p-4 font-medium">
                            <div className="flex items-center gap-3">
                              {word.indonesia}
                              <button
                                onClick={() => speak(word.indonesia, "id")}
                                className="text-blue-400 hover:text-blue-300 transition-colors text-lg"
                                title="Dengar Indonesia"
                              >
                                🔊
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => {
                                if (confirm(`Hapus kata "${word.english}"?`)) {
                                  deleteWord(word.id);
                                }
                              }}
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
                </div>
              </>
            )}
          </div>
        )}

        {mode === "otomatis" && (
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-xl p-12 min-h-[600px] flex flex-col items-center justify-center shadow-2xl border border-slate-800">
            {words.length === 0 ? (
              <div className="text-center">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-3xl text-gray-500 mb-6">
                  Tidak ada kata untuk dihafal
                </p>
                <button
                  onClick={() => setMode("input")}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-8 py-3 rounded-lg font-bold transition-all shadow-lg"
                >
                  ➕ Tambah Kata Dulu
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8 w-full max-w-3xl">
                  {!isPlaying ? (
                    <div className="space-y-4">
                      <button
                        onClick={() => {
                          setCurrentIndex(0);
                          setShowIndonesia(false);
                          setIsPlaying(true);
                        }}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 px-12 py-5 rounded-xl font-bold text-2xl flex items-center gap-4 mx-auto transition-all shadow-2xl transform hover:scale-105"
                      >
                        <span className="text-3xl">▶️</span>
                        Mulai Hafalan
                      </button>
                      <p className="text-gray-400 text-lg">
                        {words.length} kata siap untuk dipelajari
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-10">
                        <div className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-12 animate-fadeIn drop-shadow-lg">
                          {words[currentIndex].english}
                        </div>
                        {showIndonesia && (
                          <div className="text-5xl md:text-7xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 animate-fadeIn drop-shadow-lg">
                            {words[currentIndex].indonesia}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4 justify-center items-center flex-wrap">
                        <button
                          onClick={() => {
                            setIsPlaying(false);
                            window.speechSynthesis.cancel();
                          }}
                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all shadow-lg"
                        >
                          <span className="text-2xl">⏸️</span>
                          Stop
                        </button>
                        <div className="bg-slate-800/50 px-6 py-4 rounded-xl border border-slate-700">
                          <span className="text-gray-400 text-lg font-semibold">
                            {currentIndex + 1} / {words.length}
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-8 w-full max-w-md mx-auto">
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                            style={{
                              width: `${((currentIndex + 1) / words.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Helper Info */}
        {mode === "input" && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 mt-6">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">
              💡 Tips Cepat:
            </h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>• Bisa copy-paste dari Excel/Google Sheets langsung</li>
              <li>• Setiap baris = 1 kata</li>
              <li>
                • Format:{" "}
                <code className="bg-slate-700 px-2 py-0.5 rounded">
                  english = indonesia
                </code>
              </li>
              <li>• Klik "Preview" untuk cek sebelum simpan</li>
              <li>• Baris kosong akan diabaikan otomatis</li>
              <li>• Data disimpan otomatis di browser (LocalStorage)</li>
            </ul>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
}
