import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AppState {
  // Sidebar state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Conversation state
  currentConversation: string | null;
  setCurrentConversation: (id: string | null) => void;

  // Selection state
  selectedStudents: string[];
  setSelectedStudents: (ids: string[]) => void;
  toggleStudentSelection: (id: string) => void;
  clearStudentSelection: () => void;

  // UI state
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;

  // Filters
  filters: Record<string, any>;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Conversation
      currentConversation: null,
      setCurrentConversation: (id) => set({ currentConversation: id }),

      // Student selection
      selectedStudents: [],
      setSelectedStudents: (ids) => set({ selectedStudents: ids }),
      toggleStudentSelection: (id) =>
        set((state) => ({
          selectedStudents: state.selectedStudents.includes(id)
            ? state.selectedStudents.filter((studentId) => studentId !== id)
            : [...state.selectedStudents, id],
        })),
      clearStudentSelection: () => set({ selectedStudents: [] }),

      // Modal
      activeModal: null,
      setActiveModal: (modal) => set({ activeModal: modal }),

      // Filters
      filters: {},
      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),
      clearFilters: () => set({ filters: {} }),
    }),
    {
      name: "umar-academy-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        filters: state.filters,
      }),
    },
  ),
);
