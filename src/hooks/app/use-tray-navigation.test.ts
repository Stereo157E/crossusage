import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { isTauriMock, listenMock, unlistenMock } = vi.hoisted(() => ({
  isTauriMock: vi.fn(),
  listenMock: vi.fn(),
  unlistenMock: vi.fn(),
}))

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => isTauriMock(),
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: listenMock,
}))

import { useTrayNavigation } from "@/hooks/app/use-tray-navigation"

type TrayEvent = { payload: unknown }

describe("useTrayNavigation", () => {
  const callbacks = new Map<string, (event: TrayEvent) => void>()

  beforeEach(() => {
    isTauriMock.mockReset()
    listenMock.mockReset()
    unlistenMock.mockReset()
    callbacks.clear()

    isTauriMock.mockReturnValue(true)
    listenMock.mockImplementation(
      (event: string, cb: (event: TrayEvent) => void) => {
        callbacks.set(event, cb)
        return Promise.resolve(unlistenMock)
      },
    )
  })

  it("routes tray:navigate payloads to onNavigate", async () => {
    const onNavigate = vi.fn()
    renderHook(() => useTrayNavigation(onNavigate, vi.fn()))

    await waitFor(() => {
      expect(callbacks.has("tray:navigate")).toBe(true)
    })

    await act(async () => {
      callbacks.get("tray:navigate")?.({ payload: "settings" })
      callbacks.get("tray:navigate")?.({ payload: "home" })
    })

    expect(onNavigate).toHaveBeenNthCalledWith(1, "settings")
    expect(onNavigate).toHaveBeenNthCalledWith(2, "home")
  })

  it("calls onShowAbout for tray:show-about", async () => {
    const onShowAbout = vi.fn()
    renderHook(() => useTrayNavigation(vi.fn(), onShowAbout))

    await waitFor(() => {
      expect(callbacks.has("tray:show-about")).toBe(true)
    })

    await act(async () => {
      callbacks.get("tray:show-about")?.({ payload: null })
    })

    expect(onShowAbout).toHaveBeenCalledTimes(1)
  })

  it("does not register listeners outside Tauri", () => {
    isTauriMock.mockReturnValue(false)
    renderHook(() => useTrayNavigation(vi.fn(), vi.fn()))
    expect(listenMock).not.toHaveBeenCalled()
  })

  it("unsubscribes both listeners on unmount", async () => {
    const { unmount } = renderHook(() => useTrayNavigation(vi.fn(), vi.fn()))
    await waitFor(() => {
      expect(listenMock).toHaveBeenCalledTimes(2)
    })
    unmount()
    expect(unlistenMock).toHaveBeenCalledTimes(2)
  })
})
