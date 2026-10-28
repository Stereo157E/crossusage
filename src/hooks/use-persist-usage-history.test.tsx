import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { usePersistUsageHistory } from "./use-persist-usage-history"
import { UsageInsightsBanner } from "@/components/usage-insights-banner"

const load = vi.hoisted(() => vi.fn(() => Promise.resolve(false)))
vi.mock("@/lib/settings", () => ({
  loadPersistUsageHistory: load,
  loadUsageHistoryHintDismissed: () => Promise.resolve(false),
  saveUsageHistoryHintDismissed: () => Promise.resolve(),
  PERSIST_USAGE_HISTORY_CHANGED_EVENT: "persist-usage-history-changed",
}))

function Banner() {
  const enabled = usePersistUsageHistory()
  return <UsageInsightsBanner insights={[]} rollup={null} rollup30={null} persistEnabled={enabled} nowMs={0} />
}

afterEach(cleanup)

describe("usage history preference updates", () => {
  it("removes the reminder immediately after enabling history", async () => {
    render(<Banner />)
    await waitFor(() => expect(load).toHaveBeenCalled())
    expect(await screen.findByText("Enable usage history for weekly totals.")).toBeInTheDocument()
    act(() => {
      window.dispatchEvent(new CustomEvent("persist-usage-history-changed", { detail: true }))
    })
    expect(screen.queryByRole("region", { name: "Usage insights" })).toBeNull()
  })

  it("does not overwrite a changed preference with a stale initial load", async () => {
    let resolve!: (value: boolean) => void
    load.mockReturnValueOnce(new Promise<boolean>((done) => { resolve = done }))
    render(<Banner />)
    act(() => {
      window.dispatchEvent(new CustomEvent("persist-usage-history-changed", { detail: true }))
    })
    await act(async () => { resolve(false) })
    expect(screen.queryByText("Enable usage history for weekly totals.")).toBeNull()
  })
})
