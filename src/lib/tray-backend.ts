import { invoke } from "@tauri-apps/api/core"
import { transformImage } from "@tauri-apps/api/image"
import { TrayIcon } from "@tauri-apps/api/tray"

export type TrayHandle = Pick<TrayIcon, "setIcon" | "setIconAsTemplate"> &
  Partial<Pick<TrayIcon, "setTitle" | "setTooltip">> & {
    resetIcon?: () => Promise<void>
  }

/** Keep the existing renderer connected to the platform's actual tray backend. */
export async function getTrayHandle(): Promise<TrayHandle | null> {
  const platform = await invoke<string>("get_platform")
  if (platform !== "linux") return TrayIcon.getById("tray")

  return {
    setIcon: (icon) => invoke("set_linux_tray_icon", { icon: transformImage(icon) }),
    resetIcon: () => invoke("set_linux_tray_icon", { icon: null }),
    // Linux uses colored pixels, without macOS template-image tinting.
    setIconAsTemplate: async () => {},
    setTooltip: (tooltip) => invoke("set_linux_tray_tooltip", { tooltip }),
  }
}
