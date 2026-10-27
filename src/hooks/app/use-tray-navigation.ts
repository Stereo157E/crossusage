import { useEffect, useRef } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

/**
 * Tray menu navigation bridge. The Rust side (`tray::handle_menu_action`) shows
 * the panel, then emits `tray:navigate` ("home" | "settings") for "Show Stats" /
 * "Go to Settings" and `tray:show-about` for "About CrossUsage". The shell
 * decides which screen each view maps to.
 */
export function useTrayNavigation(
  onNavigate: (view: string) => void,
  onShowAbout: () => void,
) {
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate
  const onShowAboutRef = useRef(onShowAbout)
  onShowAboutRef.current = onShowAbout

  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    const unlisteners: (() => void)[] = []

    async function setup() {
      const u1 = await listen<string>("tray:navigate", (event) => {
        onNavigateRef.current(event.payload)
      })
      if (cancelled) {
        u1()
        return
      }
      unlisteners.push(u1)

      const u2 = await listen("tray:show-about", () => {
        onShowAboutRef.current()
      })
      if (cancelled) {
        u2()
        return
      }
      unlisteners.push(u2)
    }

    void setup()

    return () => {
      cancelled = true
      for (const fn of unlisteners) fn()
    }
  }, [])
}
