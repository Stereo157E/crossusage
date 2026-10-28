import { describe, expect, it } from "vitest"
import { computeMaxPanelHeight } from "@/lib/panel-height"

describe("computeMaxPanelHeight", () => {
  it("clamps to 76% of the monitor at dpr 1", () => {
    expect(computeMaxPanelHeight(900, 1, 0)).toEqual({ logicalPx: 684, physicalPx: 684 })
  })

  it("keeps the physical clamp and converts it to logical px on retina", () => {
    // 1800 * 0.76 = 1368 physical → 684 logical at dpr 2
    expect(computeMaxPanelHeight(1800, 2, 0)).toEqual({ logicalPx: 684, physicalPx: 1368 })
  })

  it("matches the classic shell rounding for fractional clamps", () => {
    // 101 * 0.76 = 76.76 → 76 physical → 38 logical at dpr 2 (floor, not round)
    expect(computeMaxPanelHeight(101, 2, 0)).toEqual({ logicalPx: 38, physicalPx: 76 })
  })

  it("falls back to 76% of the screen when no monitor resolves", () => {
    expect(computeMaxPanelHeight(null, 2, 800)).toEqual({ logicalPx: 608, physicalPx: 1216 })
  })

  it("falls back to the constant when the screen height is unavailable", () => {
    // 560 * 0.76 = 425.6 → 425
    expect(computeMaxPanelHeight(null, 1, NaN)).toEqual({ logicalPx: 425, physicalPx: 425 })
  })

  it("does not divide by zero for a missing device pixel ratio", () => {
    expect(computeMaxPanelHeight(900, 0, 0)).toEqual({ logicalPx: 684, physicalPx: 684 })
  })
})
