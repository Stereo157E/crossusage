import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { isTauriMock, invokeMock } = vi.hoisted(() => ({
  isTauriMock: vi.fn(),
  invokeMock: vi.fn(),
}))

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => isTauriMock(),
  invoke: invokeMock,
}))

import { usePendingTrayNavigation } from "@/hooks/app/use-pending-tray-navigation"

describe("usePendingTrayNavigation", () => {
  beforeEach(() => {
    isTauriMock.mockReset()
    invokeMock.mockReset()
    isTauriMock.mockReturnValue(true)
    invokeMock.mockResolvedValue(null)
  })

  it("routes a pending 'settings' navigation to onNavigate", async () => {
    const onNavigate = vi.fn()
    const onShowAbout = vi.fn()
    invokeMock.mockResolvedValue("settings")

    renderHook(() => usePendingTrayNavigation(onNavigate, onShowAbout))

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith("settings")
    })
    expect(onShowAbout).not.toHaveBeenCalled()
  })

  it("routes a pending 'home' navigation to onNavigate", async () => {
    const onNavigate = vi.fn()
    invokeMock.mockResolvedValue("home")

    renderHook(() => usePendingTrayNavigation(onNavigate, vi.fn()))

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith("home")
    })
  })

  it("opens the About dialog for a pending 'about' target", async () => {
    const onNavigate = vi.fn()
    const onShowAbout = vi.fn()
    invokeMock.mockResolvedValue("about")

    renderHook(() => usePendingTrayNavigation(onNavigate, onShowAbout))

    await waitFor(() => {
      expect(onShowAbout).toHaveBeenCalledTimes(1)
    })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it("does nothing when there is no pending navigation", async () => {
    const onNavigate = vi.fn()
    const onShowAbout = vi.fn()

    await act(async () => {
      renderHook(() => usePendingTrayNavigation(onNavigate, onShowAbout))
    })

    expect(invokeMock).toHaveBeenCalledWith("consume_pending_tray_navigation")
    expect(onNavigate).not.toHaveBeenCalled()
    expect(onShowAbout).not.toHaveBeenCalled()
  })

  it("does not invoke outside Tauri", () => {
    isTauriMock.mockReturnValue(false)
    renderHook(() => usePendingTrayNavigation(vi.fn(), vi.fn()))
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it("logs and survives a rejected invoke", async () => {
    invokeMock.mockRejectedValue(new Error("nope"))
    const onNavigate = vi.fn()
    const onShowAbout = vi.fn()
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    await act(async () => {
      renderHook(() => usePendingTrayNavigation(onNavigate, onShowAbout))
    })

    expect(errorSpy).toHaveBeenCalled()
    expect(onNavigate).not.toHaveBeenCalled()
    expect(onShowAbout).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
