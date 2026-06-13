import { create } from 'zustand'

interface SidebarState {
  isOpen: boolean // Mobile drawer state
  isCollapsed: boolean // Desktop collapsed state
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  isCollapsed: false,
  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
  toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}))
