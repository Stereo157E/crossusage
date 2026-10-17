import React from "react";
import ReactDOM from "react-dom/client";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { error as logError, warn as logWarn } from "@tauri-apps/plugin-log";
import { I18nProvider } from "@/components/i18n-provider";
import { App } from "./App";
import "./index.css";
import "@/i18n";

// Forward console.error and console.warn to Tauri log file
function stringify(arg: unknown): string {
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

const originalError = console.error;
console.error = (...args: unknown[]) => {
  originalError(...args);
  logError(args.map(stringify).join(" ")).catch(() => {});
};

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  originalWarn(...args);
  logWarn(args.map(stringify).join(" ")).catch(() => {});
};

/**
 * macOS only: undecorated tray popover look (transparent html/body; see `index.css`).
 * Linux uses an opaque compositor-managed window; Windows uses native chrome.
 */
if (isTauri()) {
  void (async () => {
    const platform = await invoke<string>("get_platform");
    if (platform === "macos") {
      document.documentElement.classList.add("tauri-popover");
    } else if (platform === "linux") {
      document.documentElement.classList.add("tauri-linux");
    }
  })();
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
