import { useEffect, useRef } from "react"
import { invoke, isTauri } from "@tauri-apps/api/core"

/**
 * Fallback for tray menu clicks that race webview startup. Tauri app-level
 * events are not buffered, so "Show Stats" / "Go to Settings" / "About
 * CrossUsage" picked before `useTrayNavigation`/`usePanel` register their
 * `listen()` calls are dropped by Rust. Rust also stores the latest request
 * (`tray::PendingTrayNavigation`); we consume it exactly once here and apply
 * it the same way the event handlers do.
 */
/** The event path handled the click: drop the stored copy so a later mount does not replay it. */
export function clearPendingTrayNavigation() {
  invoke("consume_pending_tray_navigation").catch((error) => {
    console.error("Failed to clear pending tray navigation:", error)
  })
}

export function usePendingTrayNavigation(
  onNavigate: (view: string) => void,
  onShowAbout: () => void,
) {
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate
  const onShowAboutRef = useRef(onShowAbout)
  onShowAboutRef.current = onShowAbout

  useEffect(() => {
    if (!isTauri()) return
    invoke<string | null>("consume_pending_tray_navigation")
      .then((target) => {
        if (!target) return
        if (target === "about") {
          onShowAboutRef.current()
        } else {
          onNavigateRef.current(target)
        }
      })
      .catch((error) => {
        console.error("Failed to consume pending tray navigation:", error)
      })
  }, [])
}
