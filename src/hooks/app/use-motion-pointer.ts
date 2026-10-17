import { useCallback, useEffect, useState } from "react"

/** Cursor spotlight via --mx/--my. No panel tilt/scale — that warped the window. */
export function useMotionPointer(enabled: boolean) {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const ref = useCallback((el: HTMLDivElement | null) => {
    setNode(el)
  }, [])

  useEffect(() => {
    const el = node
    if (!el) return

    let frame: number | null = null
    let pointerX = 0
    let pointerY = 0

    const reset = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame)
        frame = null
      }
      el.style.setProperty("--mx", "0.5")
      el.style.setProperty("--my", "0.5")
      el.style.removeProperty("--tilt-x")
      el.style.removeProperty("--tilt-y")
      el.style.removeProperty("--panel-scale")
    }

    if (!enabled) {
      reset()
      return
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onMotionPreferenceChange = () => {
      if (reducedMotion.matches) reset()
    }

    const updatePointer = () => {
      frame = null
      const box = el.getBoundingClientRect()
      if (box.width <= 0 || box.height <= 0) return
      const x = Math.min(1, Math.max(0, (pointerX - box.left) / box.width))
      const y = Math.min(1, Math.max(0, (pointerY - box.top) / box.height))
      el.style.setProperty("--mx", x.toFixed(3))
      el.style.setProperty("--my", y.toFixed(3))
    }

    // Pointer events can arrive faster than the display refreshes. Read layout
    // and update the inherited CSS variables once per frame, using the latest position.
    const onMove = (event: PointerEvent) => {
      // CSS hides the spotlight in this mode; don't invalidate its subtree anyway.
      if (reducedMotion.matches) return
      pointerX = event.clientX
      pointerY = event.clientY
      if (frame === null) frame = window.requestAnimationFrame(updatePointer)
    }

    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerleave", reset)
    reducedMotion.addEventListener("change", onMotionPreferenceChange)
    reset()
    return () => {
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", reset)
      reducedMotion.removeEventListener("change", onMotionPreferenceChange)
      reset()
    }
  }, [enabled, node])

  return ref
}
