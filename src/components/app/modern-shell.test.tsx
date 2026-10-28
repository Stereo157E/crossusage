import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { invoke } from "@tauri-apps/api/core"
import { openUrl } from "@tauri-apps/plugin-opener"

const { openUrlMock, invokeMock } = vi.hoisted(() => ({
  openUrlMock: vi.fn(() => Promise.resolve()),
  invokeMock: vi.fn(() => Promise.resolve()),
}))

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: openUrlMock }))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
  isTauri: () => false,
}))

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn(() => Promise.resolve("1.0.0")),
  getIdentifier: vi.fn(() => Promise.resolve("com.barramee27.crossusage")),
  getTauriVersion: vi.fn(() => Promise.resolve("2.0.0")),
}))

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    async get() {
      return undefined
    }
    async set() {}
    async save() {}
  },
}))

import { ModernShell } from "./modern-shell"
import type { AppContentActionProps } from "./app-content"
import { useAppPluginStore } from "@/stores/app-plugin-store"
import { useAppUiStore } from "@/stores/app-ui-store"
import { useProductPollsStore } from "@/stores/product-polls-store"

/** ModernShell only reads handlers on the dashboard screen; stub the rest. */
function stubActionProps(): AppContentActionProps {
  return new Proxy({} as Record<string, unknown>, { get: () => () => {} }) as AppContentActionProps
}

const shellProps = {
  onRefreshAll: () => {},
  displayPlugins: [],
  settingsPlugins: [],
  autoUpdateNextAt: null,
  updateStatus: { status: "idle" },
  onUpdateInstall: () => {},
  onUpdateCheck: () => {},
  appContentProps: stubActionProps(),
  showOnboardingWizard: false,
  onOnboardingComplete: () => {},
  onOnboardingSkip: () => {},
  preferWeeklyLimit: false,
}

beforeEach(() => {
  openUrlMock.mockImplementation(() => Promise.resolve())
  invokeMock.mockImplementation(() => Promise.resolve())
  useAppUiStore.getState().resetState()
  useAppPluginStore.getState().resetState()
  useProductPollsStore.getState().resetState()
})

describe("ModernShell", () => {
  it("shows a Help entry that opens the issue tracker and hides the panel", async () => {
    render(<ModernShell {...shellProps} />)

    const help = screen.getByRole("button", { name: "Help" })
    await userEvent.click(help)

    expect(openUrlMock).toHaveBeenCalledWith("https://github.com/barramee27/crossusage/issues")
    expect(invokeMock).toHaveBeenCalledWith("hide_panel")
  })
})
