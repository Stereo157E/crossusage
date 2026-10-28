import { describe, expect, it, vi } from "vitest"
import { invoke } from "@tauri-apps/api/core"
import { openUrl } from "@tauri-apps/plugin-opener"

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(() => Promise.resolve()),
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve()),
}))

import { openHelp } from "./help"

describe("openHelp", () => {
  it("opens the fork issue tracker and hides the panel", async () => {
    openHelp()
    await Promise.resolve()

    expect(openUrl).toHaveBeenCalledWith("https://github.com/barramee27/crossusage/issues")
    expect(invoke).toHaveBeenCalledWith("hide_panel")
  })
})
