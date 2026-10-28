import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterAll } from "vitest"

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}))

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => globalThis.isTauri === true,
  invoke: (...args: unknown[]) => invokeMock(...args),
}))

import { useEscapeHidePanel } from "./use-escape-hide-panel"

declare global {
  // eslint-disable-next-line no-var
  var isTauri: boolean | undefined
}

function dispatchKeyDown(target: EventTarget, key = "Escape") {
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }))
  })
}

describe("useEscapeHidePanel", () => {
  const originalIsTauri = globalThis.isTauri

  beforeEach(() => {
    invokeMock.mockReset()
    invokeMock.mockResolvedValue(undefined)
    globalThis.isTauri = true
  })

  afterAll(() => {
    if (originalIsTauri === undefined) {
      delete globalThis.isTauri
    } else {
      globalThis.isTauri = originalIsTauri
    }
  })

  it("invokes hide_panel when Escape is pressed", () => {
    renderHook(() => useEscapeHidePanel(true))
    dispatchKeyDown(document)
    expect(invokeMock).toHaveBeenCalledWith("hide_panel")
  })

  it("ignores keys other than Escape", () => {
    renderHook(() => useEscapeHidePanel(true))
    dispatchKeyDown(document, "a")
    dispatchKeyDown(document, "Enter")
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it("does not hide while typing in an input", () => {
    const input = document.createElement("input")
    document.body.appendChild(input)
    renderHook(() => useEscapeHidePanel(true))
    dispatchKeyDown(input)
    input.remove()
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it("does not hide while typing in a contenteditable element", () => {
    const editor = document.createElement("div")
    editor.setAttribute("contenteditable", "true")
    document.body.appendChild(editor)
    renderHook(() => useEscapeHidePanel(true))
    dispatchKeyDown(editor)
    editor.remove()
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it("does not hide when a dialog already handled the Escape key", () => {
    const dialogListener = vi.fn((e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault()
    })
    document.addEventListener("keydown", dialogListener)
    renderHook(() => useEscapeHidePanel(true))
    dispatchKeyDown(document)
    document.removeEventListener("keydown", dialogListener)
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it("does not hide while disabled (dialog open)", () => {
    const { rerender } = renderHook(({ enabled }) => useEscapeHidePanel(enabled), {
      initialProps: { enabled: false },
    })
    dispatchKeyDown(document)
    expect(invokeMock).not.toHaveBeenCalled()

    rerender({ enabled: true })
    dispatchKeyDown(document)
    expect(invokeMock).toHaveBeenCalledWith("hide_panel")
  })

  it("does not invoke outside Tauri", () => {
    globalThis.isTauri = false
    renderHook(() => useEscapeHidePanel(true))
    dispatchKeyDown(document)
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it("stops handling after unmount", () => {
    const { unmount } = renderHook(() => useEscapeHidePanel(true))
    dispatchKeyDown(document)
    expect(invokeMock).toHaveBeenCalledTimes(1)
    unmount()
    dispatchKeyDown(document)
    expect(invokeMock).toHaveBeenCalledTimes(1)
  })
})
