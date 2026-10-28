import { act, fireEvent, render, screen, cleanup } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { UsageInsightsBanner } from "./usage-insights-banner"
import { useAppUiStore } from "@/stores/app-ui-store"

const props = {
  insights: [], rollup: null, rollup30: null,
  persistEnabled: false, nowMs: 0,
}

const hint = vi.hoisted(() => ({ dismissed: false }))
vi.mock("@/lib/settings", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/settings")>(),
  loadUsageHistoryHintDismissed: async () => hint.dismissed,
  saveUsageHistoryHintDismissed: async () => { hint.dismissed = true },
}))

beforeEach(() => {
  hint.dismissed = false
  useAppUiStore.getState().resetState()
})
afterEach(() => { cleanup() })

describe("usage history reminder", () => {
  it("opens settings with a request to focus usage history", async () => {
    render(<UsageInsightsBanner {...props} />)
    fireEvent.click(await screen.findByRole("button", { name: "Enable usage history for weekly totals." }))
    expect(useAppUiStore.getState().activeView).toBe("settings")
    expect(useAppUiStore.getState().usageHistoryRequested).toBe(true)
  })

  it("removes an empty banner and remembers dismissal after remount", async () => {
    const { unmount } = render(<UsageInsightsBanner {...props} />)
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss usage history reminder" }))
    expect(screen.queryByRole("region", { name: "Usage insights" })).toBeNull()
    expect(useAppUiStore.getState().activeView).toBe("home")
    unmount()
    render(<UsageInsightsBanner {...props} />)
    await act(async () => {})
    expect(hint.dismissed).toBe(true)
    expect(screen.queryByText("Enable usage history for weekly totals.")).toBeNull()
  })
})
