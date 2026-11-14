import { afterEach, describe, expect, it } from "vitest"
import { setExchangeRatesForTests } from "@/lib/exchange-rates"
import { setLocaleFormatContext } from "@/lib/locale-format"
import { formatTotalSpendCenter, formatTotalSpendLegend } from "@/lib/total-spend"
import { formatRollupSummary, type WeeklyRollupResult } from "@/lib/weekly-rollup"

afterEach(() => {
  setExchangeRatesForTests(null)
  setLocaleFormatContext({ appLocale: "auto", displayCurrency: "auto" })
})

describe("dashboard display currency", () => {
  it("converts USD totals and per-token costs into the selected euro currency", () => {
    setLocaleFormatContext({ appLocale: "de", displayCurrency: "EUR" })
    setExchangeRatesForTests({ EUR: 0.8 })
    const euros = new Intl.NumberFormat("de", { style: "currency", currency: "EUR" }).format(80)
    expect(formatTotalSpendCenter(100, "cost").primary).toBe(euros)
    expect(formatTotalSpendCenter(100, "costPerMtok").primary).toBe(euros)
    expect(formatTotalSpendLegend(100, "cost")).toBe(euros)
    expect(formatTotalSpendLegend(100, "costPerMtok")).toBe(`${euros}/MTok`)
    for (const windowDays of [7, 30]) {
      const rollup: WeeklyRollupResult = {
        windowDays, current: { totalTokens: 1000, costUsd: 100 },
        prior: { totalTokens: 500, costUsd: 50 }, tokenDeltaPct: 100,
        costDeltaPct: 100, topContributors: [],
        currentWindow: { startDay: "2026-11-08", endDay: "2026-11-14" },
        priorWindow: { startDay: "2026-11-01", endDay: "2026-11-07" },
      }
      expect(formatRollupSummary(rollup)).toContain(`~${euros}`)
      expect(formatRollupSummary(rollup)).not.toContain("$")
    }
  })
})
