/** macOS popover panel sizing shared by the classic and modern shells. */

export const PANEL_WIDTH = 600
export const MAX_HEIGHT_FALLBACK_PX = 560
export const MAX_HEIGHT_FRACTION_OF_MONITOR = 0.76

export type PanelMaxHeight = {
  logicalPx: number
  physicalPx: number
}

/**
 * Clamp target for the macOS popover window: 76% of the current monitor, or
 * 76% of the available screen height when no monitor can be resolved.
 * Returns both physical (window `setSize`) and logical (CSS) pixels.
 */
export function computeMaxPanelHeight(
  monitorHeightPhysical: number | null,
  devicePixelRatio: number,
  availHeight: number,
): PanelMaxHeight {
  const factor =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1

  if (monitorHeightPhysical && monitorHeightPhysical > 0) {
    const physicalPx = Math.floor(monitorHeightPhysical * MAX_HEIGHT_FRACTION_OF_MONITOR)
    return { physicalPx, logicalPx: Math.floor(physicalPx / factor) }
  }

  const logicalPx = Math.floor(
    (Number(availHeight) || MAX_HEIGHT_FALLBACK_PX) * MAX_HEIGHT_FRACTION_OF_MONITOR,
  )
  return { logicalPx, physicalPx: Math.floor(logicalPx * factor) }
}
