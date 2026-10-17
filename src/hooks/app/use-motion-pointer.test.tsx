import { act, fireEvent, render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useMotionPointer } from "@/hooks/app/use-motion-pointer"

function Probe({ enabled }: { enabled: boolean }) {
  const ref = useMotionPointer(enabled)
  return <div data-testid="host" ref={ref} />
}

describe("useMotionPointer", () => {
  let pending: Map<number, FrameRequestCallback>
  let nextFrame: number

  beforeEach(() => {
    pending = new Map()
    nextFrame = 0
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      const id = ++nextFrame
      pending.set(id, callback)
      return id
    })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      pending.delete(id)
    })
  })

  function flushFrame() {
    const callbacks = [...pending.values()]
    pending.clear()
    act(() => callbacks.forEach((callback) => callback(16)))
  }

  it("writes --mx/--my only (no panel tilt/scale) and resets when disabled", () => {
    const { getByTestId, rerender } = render(<Probe enabled />)
    const host = getByTestId("host")
    host.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }) as DOMRect

    fireEvent.pointerMove(host, { clientX: 80, clientY: 20 })
    flushFrame()
    expect(host.style.getPropertyValue("--mx")).toBe("0.800")
    expect(host.style.getPropertyValue("--my")).toBe("0.200")
    expect(host.style.getPropertyValue("--tilt-y")).toBe("")
    expect(host.style.getPropertyValue("--panel-scale")).toBe("")

    rerender(<Probe enabled={false} />)
    expect(host.style.getPropertyValue("--mx")).toBe("0.5")
    expect(host.style.getPropertyValue("--tilt-x")).toBe("")
  })

  it("coalesces a burst of pointer events into one layout read using the latest position", () => {
    const { getByTestId } = render(<Probe enabled />)
    const host = getByTestId("host")
    const measure = vi.spyOn(host, "getBoundingClientRect").mockReturnValue(
      { left: 10, top: 20, width: 100, height: 200 } as DOMRect,
    )
    const write = vi.spyOn(host.style, "setProperty")

    for (let i = 0; i < 50; i++) {
      fireEvent.pointerMove(host, { clientX: i + 41, clientY: i + 11 })
    }
    expect(measure).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(pending.size).toBe(1)

    flushFrame()
    expect(measure).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledTimes(2)
    expect(host.style.getPropertyValue("--mx")).toBe("0.800")
    expect(host.style.getPropertyValue("--my")).toBe("0.200")
    expect(pending.size).toBe(0)
  })

  it.each(["leave", "disable", "unmount"] as const)(
    "cancels pending pointer updates on %s",
    (action) => {
      const { getByTestId, rerender, unmount } = render(<Probe enabled />)
      const host = getByTestId("host")
      const measure = vi.spyOn(host, "getBoundingClientRect")
      fireEvent.pointerMove(host, { clientX: 80, clientY: 20 })
      expect(pending.size).toBe(1)

      if (action === "leave") fireEvent.pointerLeave(host)
      else if (action === "disable") rerender(<Probe enabled={false} />)
      else unmount()

      expect(pending.size).toBe(0)
      flushFrame()
      expect(measure).not.toHaveBeenCalled()
      expect(host.style.getPropertyValue("--mx")).toBe("0.5")
      expect(host.style.getPropertyValue("--my")).toBe("0.5")
    },
  )

  it("does no pointer work while system reduced motion is active, including changes at runtime", () => {
    const preference = new EventTarget()
    let reduce = true
    vi.spyOn(window, "matchMedia").mockReturnValue({
      get matches() { return reduce },
      addEventListener: preference.addEventListener.bind(preference),
      removeEventListener: preference.removeEventListener.bind(preference),
    } as MediaQueryList)
    const { getByTestId } = render(<Probe enabled />)
    const host = getByTestId("host")
    const measure = vi.spyOn(host, "getBoundingClientRect")

    fireEvent.pointerMove(host, { clientX: 80, clientY: 20 })
    expect(pending.size).toBe(0)
    expect(measure).not.toHaveBeenCalled()

    reduce = false
    act(() => preference.dispatchEvent(new Event("change")))
    fireEvent.pointerMove(host, { clientX: 80, clientY: 20 })
    expect(pending.size).toBe(1)

    reduce = true
    act(() => preference.dispatchEvent(new Event("change")))
    expect(pending.size).toBe(0)
    flushFrame()
    expect(measure).not.toHaveBeenCalled()
  })
})
