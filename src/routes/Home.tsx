import { useState, useMemo } from "react";
import { useVocabularyStore } from "../store/useVocabularyStore";
import { speak } from "../utils/speech";
import {
  SpeakerWaveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

export default function Home() {
  const { data } = useVocabularyStore();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Flatten semua kata untuk search
  const allItems = useMemo(() => {
    return data.flatMap((hari) =>
      hari.isi.map((item) => ({
        ...item,
        hariLabel: hari.label,
        id_hari: hari.id_hari,
      })),
    );
  }, [data]);

  const filtered = useMemo(() => {
    return allItems.filter(
      (i) =>
        i.english.toLowerCase().includes(search.toLowerCase()) ||
        i.indonesia.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allItems, search]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  // Fungsi untuk generate pagination items (lebih compact)
  const getPaginationItems = () => {
    if (totalPages <= 1) return [];

    const items = [];
    const maxVisiblePages = 3; // Kurangi dari 5 menjadi 3 untuk mobile

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      // Always show first page
      items.push(1);

      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      if (page <= 2) {
        end = 3;
      }

      if (page >= totalPages - 1) {
        start = totalPages - 2;
      }

      if (start > 2) {
        items.push("...");
      }

      for (let i = start; i <= end; i++) {
        items.push(i);
      }

      if (end < totalPages - 1) {
        items.push("...");
      }

      items.push(totalPages);
    }

    return items;
  };

  const exportJson = () => {
    const json = JSON.stringify({ data }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vocabulary.json";
    a.click();
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target?.result as string);
        useVocabularyStore.getState().setData(obj.data || obj);
        alert("Import berhasil!");
      } catch (err) {
        alert("File JSON tidak valid");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="pb-20 pt-4 px-4">
      <h1 className="text-2xl font-bold mb-4">Daftar Hafalan</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Cari English / Indonesia..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-sm"
        />
        <label className="bg-green-600 px-4 py-2 rounded-lg text-sm cursor-pointer">
          Import
          <input
            type="file"
            accept=".json"
            onChange={importJson}
            className="hidden"
          />
        </label>
        <button
          onClick={exportJson}
          className="bg-cyan-600 px-4 py-2 rounded-lg text-sm"
        >
          Export
        </button>
        <button
          onClick={() => {
            if (
              confirm(
                "Yakin ingin menghapus SEMUA data hafalan? Tidak bisa dikembalikan!",
              )
            ) {
              localStorage.removeItem("vocabulary-storage");
              window.location.reload();
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
              <th className="text-left py-2">Day</th>
              <th className="text-left py-2">English</th>
              <th className="text-left py-2">Indonesia</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-800">
                <td className="py-3">{item.id_hari}</td>
                <td className="py-3">{item.english}</td>
                <td className="py-3">{item.indonesia}</td>
                <td className="py-3 flex gap-1">
                  <button onClick={() => speak(item.english, "en")}>
                    <SpeakerWaveIcon className="w-5 h-5 text-cyan-400" />
                  </button>
                  <button onClick={() => speak(item.indonesia, "id")}>
                    <SpeakerWaveIcon className="w-5 h-5 text-green-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Mobile Friendly */}
      {totalPages > 1 && (
        <div className="mt-6">
          {/* Info halaman */}
          <div className="text-center text-sm text-slate-400 mb-3">
            Halaman {page} dari {totalPages} • Menampilkan{" "}
            {(page - 1) * perPage + 1} -{" "}
            {Math.min(page * perPage, filtered.length)} dari {filtered.length}{" "}
            item
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            {/* Navigasi utama - horizontal untuk mobile */}
            <div className="flex items-center gap-1 order-2 sm:order-1">
              {/* Previous */}
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                title="Sebelumnya"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>

              {/* Page numbers - compact */}
              {getPaginationItems().map((item, index) => (
                <button
                  key={index}
                  onClick={() => typeof item === "number" && setPage(item)}
                  disabled={item === "..."}
                  className={`min-w-[36px] h-9 rounded text-sm ${
                    item === page
                      ? "bg-cyan-600 text-white"
                      : item === "..."
                        ? "bg-transparent cursor-default"
                        : "bg-slate-700 hover:bg-slate-600 transition-colors"
                  }`}
                >
                  {item}
                </button>
              ))}

              {/* Next */}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                title="Selanjutnya"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Navigasi cepat - vertikal di mobile */}
            <div className="flex items-center gap-1 order-1 sm:order-2 mb-2 sm:mb-0">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-2 rounded bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors text-xs"
              >
                First
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-2 rounded bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors text-xs"
              >
                Last
              </button>
            </div>
          </div>

          {/* Input langsung untuk desktop */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-sm text-slate-400">Lompat ke:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={page}
              onChange={(e) => {
                const newPage = Math.max(
                  1,
                  Math.min(totalPages, parseInt(e.target.value) || 1),
                );
                setPage(newPage);
              }}
              className="w-16 px-2 py-1 bg-slate-800 rounded text-sm text-center"
            />
            <span className="text-sm text-slate-400">/ {totalPages}</span>
          </div>
        </div>
      )}
    </div>
  );
}
