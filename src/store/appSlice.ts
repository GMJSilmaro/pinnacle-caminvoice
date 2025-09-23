import { StateCreator } from "zustand"

export interface AppSlice {
  isNavbarCollapse: boolean
  openNavbar: () => void
  closeNavbar: () => void
  toggleNavbar: () => void
}

const createAppSlice: StateCreator<AppSlice> = (set) => {
  return {
    isNavbarCollapse: false,
    openNavbar: () =>
      set((state) => {
        return { ...state, isNavbarCollapse: false }
      }),
    closeNavbar: () =>
      set((state) => {
        return { ...state, isNavbarCollapse: true }
      }),
    toggleNavbar: () =>
      set((state) => {
        return { ...state, isNavbarCollapse: !state.isNavbarCollapse }
      }),
  }
}

export default createAppSlice
