import { useEffect, useMemo, useState } from "react"
import {
  loadUsageHistoryHintDismissed,
  saveUsageHistoryHintDismissed,
  loadUsageInsightDismissals,
  saveUsageInsightDismissal,
} from "@/lib/settings"
import { useAppPreferencesStore } from "@/stores/app-preferences-store"
import { UsageSparkline } from "@/components/usage-sparkline"
import { dismissInsight, filterDismissedInsights } from "@/lib/insight-dismiss"
import type { UsageInsight } from "@/lib/usage-insights"
import {
  buildAggregatedSparklinePoints,
  countDistinctDaysInWindow,
} from "@/lib/usage-daily-sparkline"
import type { UsageDailyRow } from "@/lib/usage-daily"
import {
  formatRollupSummary,
  rollingWindowDays,
  type WeeklyRollupResult,
} from "@/lib/weekly-rollup"
import {
  formatHistoryTightestMessage,
  type HistoryInsightTightest,
} from "@/lib/usage-history-insights"
import { cn } from "@/lib/utils"
import { useAppUiStore } from "@/stores/app-ui-store"


type UsageInsightsBannerProps = {
  insights: UsageInsight[]
  historyTightest?: HistoryInsightTightest[]
  rollup: WeeklyRollupResult | null
  rollup30: WeeklyRollupResult | null
  dailyRows?: UsageDailyRow[]
  persistEnabled: boolean
  nowMs: number
  onSelectProvider?: (instanceId: string) => void
  onOpenUsageHistory?: () => void
  className?: string
}

function insightIcon(kind: UsageInsight["kind"]): string {
  if (kind === "pace") return "⚠"
  if (kind === "tight") return "◎"
  return "↻"
}

export function UsageInsightsBanner({
  insights,
  historyTightest = [],
  rollup,
  rollup30,
  dailyRows = [],
  persistEnabled,
  nowMs,
  onSelectProvider,
  onOpenUsageHistory,
  className,
}: UsageInsightsBannerProps) {
  const [dismissRevision, bump] = useState(0)
  useAppPreferencesStore((s) => s.displayCurrency)
  useAppPreferencesStore((s) => s.appLocale)
  useAppPreferencesStore((s) => s.exchangeRatesRevision)
  const [dismissals, setDismissals] = useState<Record<string, number> | null>(null)
  const openUsageHistory = useAppUiStore((s) => s.openUsageHistory)
  // null until loaded from the settings store, so a dismissed hint never flashes.
  const [historyHintDismissed, setHistoryHintDismissed] = useState<boolean | null>(null)
  useEffect(() => {
    let mounted = true
    loadUsageInsightDismissals()
      .then((values) => { if (mounted) setDismissals(values) })
      .catch((error) => console.error("loadUsageInsightDismissals:", error))
    loadUsageHistoryHintDismissed()
      .then((dismissed) => {
        if (mounted) setHistoryHintDismissed(dismissed)
      })
      .catch((error) => console.error("loadUsageHistoryHintDismissed:", error))
    return () => {
      mounted = false
    }
  }, [])

  const visibleInsights = useMemo(
    () => filterDismissedInsights(insights, nowMs),
    [insights, nowMs, dismissRevision],
  )

  const sparklineWindow = rollingWindowDays(7, new Date(nowMs)).current
  const sparklinePoints = useMemo(
    () => buildAggregatedSparklinePoints(dailyRows, sparklineWindow),
    [dailyRows, sparklineWindow.startDay, sparklineWindow.endDay],
  )
  const isVisible = (key: string) => nowMs >= (dismissals?.[key] ?? 0)
  const visibleHistory = historyTightest.filter((row) => isVisible(`snapshot:${row.instanceId}`))
  const showSparkline =
    persistEnabled && sparklinePoints.length >= 2 && isVisible("sparkline")

  const showRollup30 =
    rollup30 != null && isVisible("rollup:30") &&
    countDistinctDaysInWindow(dailyRows, rollup30.currentWindow) >= 7

  const showRollupHint = !persistEnabled && historyHintDismissed === false
  const hasInsights = visibleInsights.length > 0
  const hasHistoryTightest = persistEnabled && visibleHistory.length > 0
  const hasRollup = rollup != null && isVisible("rollup:7")

  const hasContent = hasInsights || hasHistoryTightest || hasRollup || showRollup30 || showSparkline || showRollupHint
  if (dismissals === null || !hasContent) {
    return null
  }

  const handleDismiss = (row: UsageInsight, e: React.MouseEvent) => {
    e.stopPropagation()
    const until = row.dismissUntilMs ?? nowMs + 86_400_000
    dismissInsight(row, until)
    bump((n) => n + 1)
  }

  const dismissItem = (key: string) => {
    const until = nowMs + 86_400_000
    setDismissals((current) => ({ ...current, [key]: until }))
    void saveUsageInsightDismissal(key, until).catch((error) => {
      setDismissals((current) => ({ ...current, [key]: 0 }))
      console.error("Could not save usage insight dismissal", error)
    })
  }

  return (
    <section
      className={cn(
        "mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs space-y-1.5",
        className,
      )}
      aria-label="Usage insights"
    >
      {hasInsights ? (
        <ul className="space-y-1">
          {visibleInsights.map((row) => (
            <li
              key={`${row.kind}-${row.instanceId}-${row.lineLabel}`}
              className="flex items-start gap-1 text-foreground/90"
            >
              <button
                type="button"
                className="flex-1 text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                onClick={() => onSelectProvider?.(row.instanceId)}
              >
                <span className="text-muted-foreground mr-1.5" aria-hidden>
                  {insightIcon(row.kind)}
                </span>
                {row.message}
              </button>
              <button
                type="button"
                className="shrink-0 px-1 text-muted-foreground hover:text-foreground"
                aria-label="Dismiss insight"
                onClick={(e) => handleDismiss(row, e)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {hasHistoryTightest ? (
        <ul className="space-y-1">
          {visibleHistory.map((row) => (
            <li key={`history-${row.instanceId}`} className="text-foreground/90">
              <DismissibleRow label={`${row.displayName} snapshot`} onDismiss={() => dismissItem(`snapshot:${row.instanceId}`)}>
              <button
                type="button"
                className="text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                onClick={() => onSelectProvider?.(row.instanceId)}
              >
                <span className="text-muted-foreground mr-1.5" aria-hidden>
                  ⧉
                </span>
                {formatHistoryTightestMessage(row)}
              </button>
              </DismissibleRow>
            </li>
          ))}
        </ul>
      ) : null}

      {hasRollup ? (
        <DismissibleRow label="7-day summary" onDismiss={() => dismissItem("rollup:7")}>
        <p className="text-foreground/90">
          <span className="text-muted-foreground mr-1.5" aria-hidden>
            ∑
          </span>
          {formatRollupSummary(rollup)}
          {rollup.topContributors.length > 0 ? (
            <span className="text-muted-foreground">
              {" "}
              — {rollup.topContributors.map((c) => c.displayName).join(", ")}
            </span>
          ) : null}
        </p>
        </DismissibleRow>
      ) : null}

      {showRollup30 ? (
        <DismissibleRow label="30-day summary" onDismiss={() => dismissItem("rollup:30")}>
        <p className="text-foreground/90">
          <span className="text-muted-foreground mr-1.5" aria-hidden>
            ∑
          </span>
          {formatRollupSummary(rollup30!)}
        </p>
        </DismissibleRow>
      ) : null}

      {showSparkline ? (
        <DismissibleRow label="7-day usage trend" onDismiss={() => dismissItem("sparkline")}>
        <UsageSparkline
          label="Last 7d (all accounts)"
          points={sparklinePoints}
          note="Estimated from local logs (not billing)."
        />
        </DismissibleRow>
      ) : null}

      {(hasRollup || showRollup30) && !showSparkline ? (
        <span className="block text-[10px] text-muted-foreground">
          Estimated from local logs (not billing).
        </span>
      ) : null}

      {showRollupHint ? (
        <div className="flex items-start gap-1 text-muted-foreground">
          <button
            type="button"
            className="flex-1 text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            onClick={onOpenUsageHistory ?? openUsageHistory}
          >
            Enable usage history for weekly totals.
          </button>
          <button
            type="button"
            className="shrink-0 px-1 hover:text-foreground"
            aria-label="Dismiss usage history reminder"
            onClick={() => {
              setHistoryHintDismissed(true)
              saveUsageHistoryHintDismissed().catch((error) => {
                console.error("Could not save usage history reminder dismissal", error)
              })
            }}
          >
            ×
          </button>
        </div>
      ) : null}
    </section>
  )
}

function DismissibleRow({ label, onDismiss, children }: {
  label: string
  onDismiss: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">{children}</div>
      <button type="button"
        className="shrink-0 px-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Dismiss ${label}`} title="Dismiss for 24 hours" onClick={onDismiss}>
        ×
      </button>
    </div>
  )
}
