import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Item = {
  id: number;
  english: string;
  indonesia: string;
};

export type Hari = {
  id_hari: number;
  label: string;
  isi: Item[];
};

type Store = {
  data: Hari[];
  setData: (data: Hari[]) => void;
  addHari: (hari: Hari) => void;
  updateHari: (id_hari: number, hari: Hari) => void;
  deleteHari: (id_hari: number) => void;
};

export const useVocabularyStore = create<Store>()(
  persist(
    (set) => ({
      data: [],
      setData: (data) => set({ data }),
      addHari: (hari) => set((state) => ({ data: [...state.data, hari] })),
      updateHari: (id_hari, updated) =>
        set((state) => ({
          data: state.data.map((h) => (h.id_hari === id_hari ? updated : h)),
        })),
      deleteHari: (id_hari) =>
        set((state) => ({
          data: state.data.filter((h) => h.id_hari !== id_hari),
        })),
    }),
    {
      name: "vocabulary-storage",
    }
  )
);
