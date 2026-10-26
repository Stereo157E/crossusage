import { beforeEach, describe, expect, it, vi } from "vitest"
import { Image } from "@tauri-apps/api/image"

const { invokeMock, getByIdMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  getByIdMock: vi.fn(),
}))
vi.mock("@tauri-apps/api/core", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tauri-apps/api/core")>(),
  invoke: invokeMock,
}))
vi.mock("@tauri-apps/api/tray", () => ({ TrayIcon: { getById: getByIdMock } }))

import { getTrayHandle } from "./tray-backend"

describe("tray backend", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("updates Linux image resources, file icons and tooltips through KSNI", async () => {
    invokeMock.mockResolvedValueOnce("linux")
    const tray = await getTrayHandle()
    await tray!.setIcon(new Image(42))
    await tray!.setIcon("/resource/icons/tray-icon.png")
    await tray!.setTooltip!("Provider 50%")
    expect(invokeMock).toHaveBeenCalledWith("set_linux_tray_icon", { icon: 42 })
    expect(invokeMock).toHaveBeenCalledWith("set_linux_tray_icon", { icon: "/resource/icons/tray-icon.png" })
    expect(invokeMock).toHaveBeenCalledWith("set_linux_tray_tooltip", { tooltip: "Provider 50%" })
    expect(getByIdMock).not.toHaveBeenCalled()
  })

  it("restores the embedded Linux default without requiring a packaged icon path", async () => {
    invokeMock.mockResolvedValueOnce("linux")
    const tray = await getTrayHandle()
    await tray!.resetIcon!()
    expect(invokeMock).toHaveBeenCalledWith("set_linux_tray_icon", { icon: null })
  })

  it("propagates failed Linux icon updates", async () => {
    invokeMock.mockResolvedValueOnce("linux").mockRejectedValueOnce(new Error("tray stopped"))
    const tray = await getTrayHandle()
    await expect(tray!.setIcon(new Image(42))).rejects.toThrow("tray stopped")
  })

  it.each(["macos", "windows"])("retains the native Tauri tray on %s", async (platform) => {
    const nativeTray = { setIcon: vi.fn() }
    invokeMock.mockResolvedValueOnce(platform)
    getByIdMock.mockResolvedValueOnce(nativeTray)
    expect(await getTrayHandle()).toBe(nativeTray)
    expect(getByIdMock).toHaveBeenCalledWith("tray")
    expect(invokeMock).toHaveBeenCalledTimes(1)
  })
})
