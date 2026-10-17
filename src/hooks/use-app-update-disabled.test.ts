import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { check } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import { useAppUpdate } from "@/hooks/use-app-update"

vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true }))
vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn() }))
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }))

afterEach(() => vi.useRealTimers())

it("does not check, schedule, download or install updates in the fork", async () => {
  vi.useFakeTimers()
  const download = vi.fn()
  const install = vi.fn()
  vi.mocked(check).mockResolvedValue({ version: "99.0.0", download, install } as never)
  // Use the real fork policy; Vite's test config already enables UPDATER_IN_DEV.
  const { result, unmount } = renderHook(() => useAppUpdate())

  await act(async () => {
    await result.current.checkForUpdates()
    await result.current.triggerInstall()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
  })

  expect(result.current.updateStatus).toEqual({ status: "idle" })
  expect(check).not.toHaveBeenCalled()
  expect(download).not.toHaveBeenCalled()
  expect(install).not.toHaveBeenCalled()
  expect(relaunch).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
  unmount()
})
