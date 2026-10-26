import { fireEvent, render, screen, cleanup } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { UsageInsightsBanner } from "./usage-insights-banner"
import { useAppUiStore } from "@/stores/app-ui-store"

const props = {
  insights: [], rollup: null, rollup30: null,
  persistEnabled: false, nowMs: 0,
}

beforeEach(() => {
  const storage = new Map<string, string>()
  vi.spyOn(window, "localStorage", "get").mockReturnValue({
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) },
  } as Storage)
  useAppUiStore.getState().resetState()
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe("usage history reminder", () => {
  it("opens settings with a request to focus usage history", () => {
    render(<UsageInsightsBanner {...props} />)
    fireEvent.click(screen.getByRole("button", { name: "Enable usage history for weekly totals." }))
    expect(useAppUiStore.getState().activeView).toBe("settings")
    expect(useAppUiStore.getState().usageHistoryRequested).toBe(true)
  })

  it("removes an empty banner and remembers dismissal after remount", () => {
    const { unmount } = render(<UsageInsightsBanner {...props} />)
    fireEvent.click(screen.getByRole("button", { name: "Dismiss usage history reminder" }))
    expect(screen.queryByRole("region", { name: "Usage insights" })).toBeNull()
    expect(useAppUiStore.getState().activeView).toBe("home")
    unmount()
    render(<UsageInsightsBanner {...props} />)
    expect(screen.queryByText("Enable usage history for weekly totals.")).toBeNull()
  })
})
