import { useState, useEffect, useRef } from "react";
import { useVocabularyStore } from "../store/useVocabularyStore";
import { speak } from "../utils/speech";
import {
  PlayIcon,
  PauseIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";

export default function Hafalan() {
  const { data } = useVocabularyStore();
  const [bahasa, setBahasa] = useState<"en" | "id">("en");
  const [mode, setMode] = useState<"manual" | "otomatis">("manual");
  const [acak, setAcak] = useState(false);
  const [dariHari, setDariHari] = useState(1);
  const [sampaiHari, setSampaiHari] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // State tampilan
  const [showFirst, setShowFirst] = useState(true);
  const [showSecond, setShowSecond] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [listItem, setListItem] = useState<any[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Fisher-Yates shuffle untuk acak yang benar
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Ambil data sesuai rentang & acak/urut
  useEffect(() => {
    const selected = data
      .filter((h) => h.id_hari >= dariHari && h.id_hari <= sampaiHari)
      .flatMap((h) => h.isi);

    let finalList = [...selected];
    if (acak) {
      finalList = shuffleArray(finalList);
    }
    setListItem(finalList);
    setCurrentIndex(0);
    setCurrentItem(null);
    setShowFirst(true);
    setShowSecond(false);
  }, [data, dariHari, sampaiHari, acak]);

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

  // Auto play - FIXED: tidak reset saat pause
  useEffect(() => {
    if (mode === "otomatis" && isPlaying && listItem.length > 0) {
      playCurrentItem();
    } else {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying]);

  const playCurrentItem = () => {
    if (currentIndex >= listItem.length) {
      // Selesai semua, reset ke awal
      setCurrentIndex(0);
      setIsPlaying(false);
      return;
    }

    const item = listItem[currentIndex];
    setCurrentItem(item);
    setShowFirst(true);
    setShowSecond(false);

    speak(bahasa === "en" ? item.english : item.indonesia, bahasa);

    // Tampilkan terjemahan setelah 2.5 detik
    setTimeout(() => {
      setShowSecond(true);
      speak(
        bahasa === "en" ? item.indonesia : item.english,
        bahasa === "en" ? "id" : "en",
      );
    }, 2500);

    // Lanjut ke item berikutnya setelah 5.5 detik
    intervalRef.current = setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      // Trigger useEffect untuk play item berikutnya
      if (currentIndex + 1 < listItem.length) {
        playCurrentItem();
      } else {
        setIsPlaying(false);
        setCurrentIndex(0);
      }
    }, 5500);
  };

  // Trigger playCurrentItem saat index berubah dan masih playing
  useEffect(() => {
    if (isPlaying && mode === "otomatis") {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      playCurrentItem();
    }
  }, [currentIndex]);

  const handleManualClick = () => {
    if (!currentItem && listItem.length > 0) {
      setCurrentItem(listItem[0]);
      setCurrentIndex(0);
      setShowFirst(true);
      setShowSecond(false);
      speak(
        bahasa === "en" ? listItem[0].english : listItem[0].indonesia,
        bahasa,
      );
      return;
    }

    if (showFirst && !showSecond) {
      setShowSecond(true);
      speak(
        bahasa === "en" ? currentItem.indonesia : currentItem.english,
        bahasa === "en" ? "id" : "en",
      );
    } else {
      if (currentIndex < listItem.length - 1) {
        const nextIndex = currentIndex + 1;
        const next = listItem[nextIndex];
        setCurrentIndex(nextIndex);
        setCurrentItem(next);
        setShowFirst(true);
        setShowSecond(false);
        speak(bahasa === "en" ? next.english : next.indonesia, bahasa);
      } else {
        // Sudah di akhir, reset ke awal
        setCurrentIndex(0);
        setCurrentItem(listItem[0]);
        setShowFirst(true);
        setShowSecond(false);
        speak(
          bahasa === "en" ? listItem[0].english : listItem[0].indonesia,
          bahasa,
        );
      }
    }
  };

  const handlePlayPause = () => {
    if (!isPlaying && listItem.length > 0) {
      // Mulai dari item saat ini atau dari awal jika belum ada
      if (!currentItem) {
        setCurrentIndex(0);
        setCurrentItem(listItem[0]);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setCurrentItem(null);
    setShowFirst(true);
    setShowSecond(false);
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${isFocusMode ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"}`}
    >
      {/* Tombol Mode Fokus – Selalu ada di kanan bawah */}
      <button
        onClick={() => setIsFocusMode(!isFocusMode)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white p-4 rounded-full shadow-2xl transition-all transform hover:scale-110"
        title={isFocusMode ? "Keluar Mode Fokus" : "Masuk Mode Fokus"}
      >
        {isFocusMode ? (
          <EyeSlashIcon className="w-7 h-7" />
        ) : (
          <EyeIcon className="w-7 h-7" />
        )}
      </button>

      {/* Setting – Hanya muncul kalau TIDAK fokus */}
      {!isFocusMode && (
        <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-cyan-500/20 shadow-xl">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-6">
              Pengaturan Hafalan
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Bahasa */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Arah Terjemahan
                </label>
                <select
                  value={bahasa}
                  onChange={(e) => setBahasa(e.target.value as "en" | "id")}
                  className="w-full bg-slate-700/50 backdrop-blur-sm border border-slate-600 p-3 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
                >
                  <option value="en">🇬🇧 English → 🇮🇩 Indonesia</option>
                  <option value="id">🇮🇩 Indonesia → 🇬🇧 English</option>
                </select>
              </div>

              {/* Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mode Belajar
                </label>
                <select
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value as any);
                    handleReset();
                  }}
                  className="w-full bg-slate-700/50 backdrop-blur-sm border border-slate-600 p-3 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
                >
                  <option value="manual">👆 Manual (Tap Layar)</option>
                  <option value="otomatis">▶️ Otomatis</option>
                </select>
              </div>
            </div>

            {/* Acak */}
            <label className="flex items-center gap-3 mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:bg-slate-700/50 transition-all cursor-pointer">
              <input
                type="checkbox"
                checked={acak}
                onChange={(e) => setAcak(e.target.checked)}
                className="w-5 h-5 rounded accent-cyan-500 cursor-pointer"
              />
              <span className="text-white font-medium">
                🔀 Acak Urutan (semua kata muncul sekali)
              </span>
            </label>

            {/* Rentang Hari */}
            <div className="flex gap-4 items-center mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
              <span className="text-gray-300 font-medium">📅 Dari hari</span>
              <input
                type="number"
                value={dariHari}
                onChange={(e) => setDariHari(Number(e.target.value))}
                className="w-20 bg-slate-700 border border-slate-600 p-2 rounded-lg text-center text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                min="1"
              />
              <span className="text-gray-400">→</span>
              <input
                type="number"
                value={sampaiHari}
                onChange={(e) => setSampaiHari(Number(e.target.value))}
                className="w-20 bg-slate-700 border border-slate-600 p-2 rounded-lg text-center text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                min="1"
              />
              <span className="text-gray-300 text-sm">
                ({listItem.length} kata)
              </span>
            </div>

            {/* Kontrol Otomatis */}
            {mode === "otomatis" && (
              <div className="flex gap-3">
                <button
                  onClick={handlePlayPause}
                  className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all transform hover:scale-105 shadow-lg ${
                    isPlaying
                      ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600"
                      : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600"
                  } text-white`}
                >
                  {isPlaying ? (
                    <PauseIcon className="w-7 h-7" />
                  ) : (
                    <PlayIcon className="w-7 h-7" />
                  )}
                  {isPlaying ? "Pause" : "Play Otomatis"}
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-4 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-bold flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg"
                  title="Reset ke awal"
                >
                  <ArrowPathIcon className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar - hanya muncul saat ada progress */}
      {currentItem && listItem.length > 0 && !isFocusMode && (
        <div className="bg-slate-800/50 px-6 py-2">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>
                {currentIndex + 1} / {listItem.length}
              </span>
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / listItem.length) * 100}%`,
                  }}
                />
              </div>
              <span>
                {Math.round(((currentIndex + 1) / listItem.length) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Layar Hafalan – Selalu penuh */}
      <div
        className={`flex-1 flex items-center justify-center ${
          isFocusMode
            ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
            : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        } ${mode === "manual" ? "cursor-pointer" : ""} relative`}
        onClick={mode === "manual" ? handleManualClick : undefined}
      >
        {currentItem ? (
          <div className="text-center p-8 max-w-5xl w-full">
            {showFirst && (
              <div className="text-5xl md:text-8xl font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 animate-fadeIn drop-shadow-lg">
                {bahasa === "en" ? currentItem.english : currentItem.indonesia}
              </div>
            )}
            {showSecond && (
              <div className="text-4xl md:text-6xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 animate-fadeIn drop-shadow-lg">
                {bahasa === "en" ? currentItem.indonesia : currentItem.english}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center px-8 max-w-2xl">
            <div className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600 mb-6">
              {mode === "manual"
                ? "👆 Tap layar untuk mulai menghafal"
                : "⚙️ Atur setting lalu tekan Play Otomatis"}
            </div>
            <p className="text-gray-500 text-lg">
              {listItem.length} kata siap dipelajari
            </p>
          </div>
        )}

        {/* Hint di pojok untuk mode manual */}
        {mode === "manual" && currentItem && !isFocusMode && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-500 text-sm animate-pulse">
            Tap layar untuk lanjut
          </div>
        )}
      </div>

      {/* Animasi */}
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
