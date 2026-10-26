import { create } from "zustand"
import type { ActiveView } from "@/components/side-nav"

type AppUiStore = {
  activeView: ActiveView
  showAbout: boolean
  usageHistoryRequested: boolean
  openUsageHistory: () => void
  clearUsageHistoryRequest: () => void
  setActiveView: (view: ActiveView) => void
  setShowAbout: (value: boolean) => void
  resetState: () => void
}

const initialState = {
  activeView: "home" as ActiveView,
  showAbout: false,
  usageHistoryRequested: false,
}

export const useAppUiStore = create<AppUiStore>((set) => ({
  ...initialState,
  openUsageHistory: () => set({ activeView: "settings", usageHistoryRequested: true }),
  clearUsageHistoryRequest: () => set({ usageHistoryRequested: false }),
  setActiveView: (view) => set({ activeView: view }),
  setShowAbout: (value) => set({ showAbout: value }),
  resetState: () => set(initialState),
}))
