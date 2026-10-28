import { useEffect } from "react"
import { invoke, isTauri } from "@tauri-apps/api/core"

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  if (target.isContentEditable) return true
  if (target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")) {
    return true
  }

  return false
}

/**
 * Hide the panel window on Escape, mirroring the classic shell's `usePanel`
 * behavior without touching it. Pass `enabled: false` while a dialog that
 * handles Escape itself (e.g. the About dialog) is open.
 */
export function useEscapeHidePanel(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !isTauri()) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (e.defaultPrevented) return
      if (isEditableTarget(e.target)) return
      void invoke("hide_panel")
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [enabled])
}
