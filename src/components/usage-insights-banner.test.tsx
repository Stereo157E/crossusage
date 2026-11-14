import { act, fireEvent, render, screen, cleanup } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { UsageInsightsBanner } from "./usage-insights-banner"
import { useAppUiStore } from "@/stores/app-ui-store"
import { computeRollingRollup } from "@/lib/weekly-rollup"

const props = {
  insights: [], rollup: null, rollup30: null,
  persistEnabled: false, nowMs: 0,
}

const hint = vi.hoisted(() => ({ dismissed: false, items: {} as Record<string, number> }))
vi.mock("@/lib/settings", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/settings")>(),
  loadUsageHistoryHintDismissed: async () => hint.dismissed,
  saveUsageHistoryHintDismissed: async () => { hint.dismissed = true },
  loadUsageInsightDismissals: async () => hint.items,
  saveUsageInsightDismissal: async (key: string, until: number) => { hint.items[key] = until },
}))

beforeEach(() => {
  hint.dismissed = false
  hint.items = {}
  const storage = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) },
  })
  useAppUiStore.getState().resetState()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe("usage history reminder", () => {
  it("dismisses each summary and the trend separately, hiding only an empty box", async () => {
    const now = new Date(2026, 10, 14)
    const dailyRows = Array.from({ length: 7 }, (_, index) => ({
      instanceId: "claude", displayName: "Claude", dayKey: `2026-11-${String(8 + index).padStart(2, "0")}`,
      totalTokens: 100, inputTokens: null, outputTokens: null,
      costUsd: 1, source: "ccusage", ingestedAtMs: 0,
    }))
    render(<UsageInsightsBanner {...props} persistEnabled nowMs={now.getTime()} dailyRows={dailyRows}
      rollup={computeRollingRollup(dailyRows, 7, now)} rollup30={computeRollingRollup(dailyRows, 30, now)} />)
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss 7-day summary" }))
    expect(screen.queryByText(/This 7d:/)).toBeNull()
    expect(screen.getByText(/This 30d:/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Dismiss 30-day summary" }))
    expect(screen.queryByText(/This 30d:/)).toBeNull()
    expect(screen.getByText("Last 7d (all accounts)")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Dismiss 7-day usage trend" }))
    expect(screen.queryByRole("region", { name: "Usage insights" })).toBeNull()
  })

  it("dismisses snapshots independently across remounts, then expires", async () => {
    const populated = { ...props, persistEnabled: true, historyTightest: [{
      instanceId: "claude", displayName: "Claude", primaryPercent: 16,
      remainingPercent: 84, capturedAtMs: 0, resetTime: null,
    }, { instanceId: "codex", displayName: "Codex", primaryPercent: 3, remainingPercent: 97, capturedAtMs: 0, resetTime: null }] }
    const { unmount } = render(<UsageInsightsBanner {...populated} />)
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss Claude snapshot" }))
    expect(screen.queryByText(/Claude.*saved snapshot/)).toBeNull()
    expect(screen.getByText(/Codex.*saved snapshot/)).toBeTruthy()
    unmount()
    const next = render(<UsageInsightsBanner {...populated} />)
    await act(async () => {})
    expect(screen.queryByText(/Claude.*saved snapshot/)).toBeNull()
    expect(screen.getByText(/Codex.*saved snapshot/)).toBeTruthy()
    next.rerender(<UsageInsightsBanner {...populated} nowMs={86_400_000} />)
    expect(screen.getByText(/Claude.*saved snapshot/)).toBeTruthy()
  })

  it("immediately removes a dismissed live insight with unchanged props", async () => {
    render(<UsageInsightsBanner {...props} persistEnabled insights={[{
      kind: "tight", instanceId: "claude", displayName: "Claude",
      lineLabel: "Weekly", message: "Almost at limit", sortKey: 0,
    }]} />)
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss insight" }))
    expect(screen.queryByText("Almost at limit")).toBeNull()
  })

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
