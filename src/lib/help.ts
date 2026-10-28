import { invoke } from "@tauri-apps/api/core"
import { openUrl } from "@tauri-apps/plugin-opener"
import { FORK_REPO_URL } from "./fork-meta"

/** Shared Help behavior: open the fork's issue tracker, then hide the panel. */
export function openHelp() {
  openUrl(`${FORK_REPO_URL}/issues`).catch(console.error)
  invoke("hide_panel").catch(console.error)
}
