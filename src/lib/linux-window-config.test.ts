import { describe, expect, it } from "vitest"
import linuxConfig from "../../src-tauri/tauri.linux.conf.json"

describe("Linux native window controls", () => {
  it("enables native decorations and resizing at window creation", () => {
    const main = linuxConfig.app.windows.find((window) => window.label === "main")
    expect(main?.decorations).toBe(true)
    expect(main?.resizable).toBe(true)
  })
})
