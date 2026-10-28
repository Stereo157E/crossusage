# Breadcrumbs

## 2026-10-19

- Resolved Grok Bot QA notes and CI checks on PR #40: added `crates/crossusage-cli/build.rs` so `embedded_plugins.rs` stages filtered runtime plugins into `$OUT_DIR/bundled_plugins` without requiring `copy-bundled.cjs` first; auto-created the dev CLI sidecar stub in `scripts/tauri-before-dev.cjs` for clean checkouts; localized the Modern top navigation tabs (`dashboard`, `customize`, `polls`, `settings`) in `modern-shell.tsx` across all 13 locales; fixed `cursorPaths.resolveStateDb` zero-argument arity in `host_api.rs`; and silenced Windows dead-code warnings in `chromium_cookies.rs`.
- Ported OpenUsage **v0.7.15** onto `perf/optimize-build-and-size` and bumped CrossUsage to **1.6.1** (PATCH): Codex dashboard link (`chatgpt.com/settings/usage`), Gemini `-n` effort pricing alias, Codex `codex-auto-review` $0 cost since Oct 6 2026, OpenCode Go `20260805200742_import_legacy_credentials` migration check, Ollama `/api/balance` dollar allowance + `Purchased Credits`, Claude `Rate Limit Resets` hourly throttling, and Cursor paged `get-filtered-usage-events` incremental day-by-day history cache (`docs/PORT-0.7.15.md`).
- Replaced legacy macOS `screenshot.png` (1.06 MB) with a native Linux CrossUsage 1.6.1 showcase composite (194 KB) displaying the Modern UI Dashboard, Classic UI Overview, and Classic UI Provider Detail views (`#39`).

## 2026-10-16

- Ported OpenUsage **v0.7.14** onto `perf/optimize-build-and-size`: Codex plan names (`Pro 100`, `Pro 200`, `Pro 500`), Cursor team model pool preference over legacy $20 allowance, OpenCode Go sub-1% Session reset countdowns + 5h placeholder reset drop, and `docs/PORT-0.7.14.md`.

## 2026-10-14

- Build/size optimization pass: added `[profile.release]` (`strip = "symbols"`, `lto = "thin"`, `codegen-units = 1`) and `[profile.dev]` (`debug = 1`); set `src-tauri` `crate-type = ["rlib"]`; skipped `--target` in `prepare-cli-sidecar.sh` when native; replaced `tauri-plugin-aptabase` with direct `reqwest::blocking` POST; gated `tauri-plugin-liquid-glass` to macOS; dropped `rquickjs` `bindgen`, `time`, `users`, `color-eyre`, `textwrap`, `owo-colors`, and unused CLI deps; stripped `*.test.js`/`*.md` from bundled plugins and 6.4 MB of unused icons; code-split frontend views/locales and dropped `@base-ui/react`.

## 2026-10-05

- Ship number on `feat/port-openusage-0.7.13` is **1.6.0** (MINOR). The base account label sets the bump; the v0.7.13 port rides along.

## 2026-10-04

- Port OpenUsage **v0.7.13** on `feat/port-openusage-0.7.13`. Tracker: [PORT-0.7.13.md](./PORT-0.7.13.md).

## 2026-09-25

- Base provider rows can take a display label (`providerLabels`) via Settings → Rename. Add account stays; Remove stays off the base row.

## 2026-09-20

- Port OpenUsage **v0.7.11 + v0.7.12** + Gemini Apps → CrossUsage **1.5.0** (MINOR) on `feat/port-openusage-0.7.12`. Pricing supplement 2026-09-11; pace zero-usage; Grok subagent ledgers; Codex Business Premium + gpt-reserve@Luna + Astra; Antigravity sibling conversation stores; Devin exhausted weekly; Claude null nested model + live `/api/oauth/profile`. Tracker: [PORT-0.7.11-0.7.12.md](./PORT-0.7.11-0.7.12.md).

## 2026-09-14

- Gemini Apps: keep cookies from one Chromium profile; require PSID+SAPISID before skipping `GEMINI_COOKIE`; plan label from `sJBwce` only.
- Ported lab `gemini-apps` onto `feat/gemini-apps` from `origin/feat/linux-windows-native-support` (1.4.4). Host: `chromium_cookies.rs`, `GEMINI_COOKIE`, `http1Only`, Google cookie redaction, `sha1Hex`. Grok.com stays lab.

## 2026-09-02

- Tray readout (provider + meter, portal to `document.body`) + Classic vs Modern tray provider pick + mid-fill style previews. Lab Gemini Apps / Grok.com stay off this branch. Apply keeps other `trayLines` meters; Modern pin-sync does not clobber tray focus. Confirming an already-pinned only meter does not `unshift` it (other providers stay put).

## 2026-08-28

- Port OpenUsage **v0.7.10** → CrossUsage **1.4.3** on `feat/port-openusage-0.7.10`. Pricing supplement 2026-08-26; Cursor Grok Bot; Antigravity/Grok local spend; Claude spend-without-OAuth + Fable + sub-1% countdown; Copilot org credits; OpenRouter key window. Tracker: [PORT-0.7.10.md](./PORT-0.7.10.md).
- Antigravity local spend: `antigravity_proto.rs` + `antigravity_db_usage_scanner.rs`, `host.antigravityLogs.queryDaily` (FelixIsaac #1058/#1120).
- Cursor Grok Bot + dashboard names: rename Auto/API labels, fetch `GetSandUsageStatus`, migrate stored Cursor tray/metric IDs.
- Grok session-ledger spend → `grok_usage_scanner.rs` + `host.grokLogs.queryDaily`.
- Dropped the ~400 LOC file budget (AGENTS.md). Do not split/truncate code to stay under a cap.
- Quiet **Modern** motion: no bar sheen/sparks, no overlay field, no card float. Classic unchanged.

## 2026-08-18

- 1.4.1 motion pass 6: removed **concentric grain rings** (the “100 circles”). Restored orbs. Click ripples still off.
- 1.4.1 motion pass 4: still **no panel tilt/zoom**. Extra overlay FX: dual aurora, parallax grid, dust, slow scan, spark cursor. Reduce animations still kills all FX.

## 2026-08-13

- Port OpenUsage **v0.7.8 + v0.7.9** → CrossUsage **1.4.1** on `feat/port-openusage-0.7.8-0.7.9` (not pushed). Public **v0.7.7** skipped upstream (`v0.7.6...v0.7.8`). Pricing supplement 2026-08-13; Codex auto-review slug; OpenCode Go official usage API; Reduce animations; Reset all settings. Tracker: [PORT-0.7.8-0.7.9.md](./PORT-0.7.8-0.7.9.md).
- Live poll `aptabase-extra-2026-08`: `expiresAt` 2026-08-15T23:59:59Z + close date in body. `selectActivePoll` keeps expired/ended published polls on `/active` for results. `/active` cache 60s. Server-only — 1.4.0 clients already render `body` + `ended`.

## 2026-08-09

- Polls dismiss telemetry (`not_now`/`dont_ask`) + admin `GET /api/polls/:id/stats`; public results stay vote-only.
- CrossUsage **1.4.0** on `feat/1.4.0-release-bundle`: product polls + Polls visit force-fetch; Windows #18 keyring harden (`get_secret`/UTF-16LE/`set_secret`); #838 notify-once for newly bundled providers; `crossusage.limits.v1` via `/v1/limits` + `crossusage-cli limits`.

## 2026-07-31

- Product polls (1.4.0 planned): dumb-shell client + Polls page (Classic SideNav + Modern tab), soft badge, Settings toggle default on; VPS `deploy/crossusage.dev/polls-api` (Bun/SQLite) + nginx `/api/polls/`.

## 2026-07-17

- Port OpenUsage **v0.7.6** → CrossUsage **1.3.3** on `feat/port-openusage-0.7.6` (not pushed).
- New: `codex_pricing.rs`, `pi_usage_scanner.rs`; Codex `ChildReplayGate` + session canonicalize/dedup; Claude advisor iterations + fast speed; Cursor enterprise usage-summary; Grok icon + aliases.
- Fixed session discovery bug: double `seen.insert` skipped all `sessions/*.jsonl`.
- Version bump **1.3.3**; CHANGELOG + PORT-0.7.6 status; #962 Claude Desktop → later.

- Ported OpenUsage v0.7.6 PiUsageScanner → `crates/crossusage-core/src/pi_usage_scanner.rs`; wired into Claude/Codex via `merge_daily_rows`.
- Claude `parse_entries` emits `advisor_message` iterations as separate entries (`message_id:advisor:N`).
- Minor codex compile fix: dropped explicit `ref` in `if let` (edition 2024 binding mode).
- Cursor enterprise: `buildEnterpriseResult` now fetches `/api/usage` + `/api/usage-summary` (mirrors Swift `CursorUsageSummaryMapper`); synced to `cursor-nightly`. Grok icon replaced from `/tmp/grok.svg`.

## 2026-07-14

- Antigravity label/color pass: added shared old-label migration for `antigravity` and `antigravity-cli` Classic tray settings plus Modern dashboard metric IDs; added tests for migration and `#4285F4` line color.

## 2026-07-10

- Tauri dev WebView fix: changed `devUrl` and `scripts/tauri-before-dev.cjs` to IPv4 loopback (`127.0.0.1:1420`) after Vite was observed listening only on `[::1]:1420` while WebView still showed `ERR_EMPTY_RESPONSE` for `localhost`.
- Antigravity CLI quota UI: updated `plugins/antigravity-cli` to call Cloud Code `retrieveUserQuotaSummary` first and expose the same four summary lines as desktop Antigravity; left `antigravity-ide` unchanged.
- Antigravity quota UI: Cloud Code now uses `retrieveUserQuotaSummary`; manifest and parser expose Gemini session/weekly lines first, then Claude and GPT session/weekly lines.
- Antigravity Windows auth fix: resolve existing `Antigravity IDE`/legacy paths through `firstExistingAppSupport` (`%APPDATA%` on Windows), skipping nonexistent macOS paths and their SQLite warnings; read `gemini:antigravity` as raw Go-keyring UTF-8 bytes and refresh once after an auth failure.

## 2026-10-17

- Integrated opaque, resizable Linux windows with compositor-managed placement and rounding.
- Fixed the zero-argument Cursor host binding and synchronized the generated Nightly plugin.
- Coalesced pointer effects per animation frame and paused dashboard ticks on inactive screens.
- Added native build commands and optional GDB diagnostics; diagnostic output stays outside the repository.
- Frontend tests and native release builds passed. Desktop behavior requires compositor-specific verification.

- Reproduced a Claude debug probe timeout with the original credential lookup order; the file-first Linux path returned usage successfully. Added credential precedence and profile-field redaction regressions.
- Split debug sidecar preparation from release builds and stopped rewriting unchanged generated plugins. Added build-script regression tests; a repeated debug sidecar build reused Cargo artifacts.
- Git prompt diagnosis: gitstatus rejects the worktreeconfig repository extension in its bundled libgit2. A single-worktree clone can retain its effective settings in the local repository config without enabling that extension.
- Native Linux installation verified after `just build`: GUI, CLI and all 28 bundled plugins installed under the user prefix; replaced the AppImage launcher and added the fork desktop label/icon. Executable and resources match the build. Hyprland reports the native `crossusage` window floating at 600 × 800, positioned below the top-right tray area; configuration validation passed.

## 2026-10-26

- Polls navigation now hides when product polls are disabled and returns when enabled in both layouts.

- Linux tray uses KSNI 0.3.7 without GTK pointer hooks or AppIndicator package dependencies. Frontend image-resource/tooltip commands preserve all five icon styles, settings changes and embedded-icon reset. Shared menu actions preserve usage summaries, log levels, navigation, restart, about and quit. Windows/macOS retain Tauri's tray backend.
- Unix environment-discovery shells start in separate sessions, preventing controlling-terminal access from suspending the application job. `just run` remains in the foreground and supports Ctrl+C.
- Validation: production frontend/native release builds, 91 frontend tests, six native tray tests and ten environment-related core tests passed. Linux desktop checks verified registration, icon export, primary/middle-click actions, menu export, clean quit, distinct provider/bars icons, dynamic tooltips and terminal Ctrl+C cleanup. Windows/macOS runtime checks remain outstanding.
- Known baseline test issue: two support-bundle redaction tests loop indefinitely; excluded from the broader app test run after reproducing the hang. Their code remains unchanged.

- Integrated CrossUsage v1.6.1 with OpenUsage v0.7.14–v0.7.15 provider updates and build optimizations. Preserved native Linux integration, disabled updates, hidden-polls navigation, credential precedence, and incremental sidecar preparation. Upstream fixes gate Windows decoders and test helpers, remove the unused Cursor path helper, and restore shutdown cache flushing.
- Audited changed provider request/response fields against the shared core host redaction lists: existing credential, profile, account, and reset-credit identifier coverage remains applicable; new usage fields contain amounts, percentages, periods, and plan labels.
- Validation: frontend production build, 1,577 frontend tests, five build-script tests, five CLI tests, 182 core tests, and 56 desktop tests passed. The two documented environment-dependent ccusage subprocess tests still fail, including outside the sandbox. Desktop/core/CLI compile checks no longer report the seven unused-code warnings. The upstream support-bundle redaction fix also resolves the previously recorded test hangs.

- 2026-10-26: Made the dashboard usage-history reminder actionable and dismissible in both layouts. Settings scrolls to and focuses Usage history; dismissing the final row removes the banner. Validation: 37 targeted frontend tests and production build passed.

- 2026-10-26: Added a temporary usage-history toggle highlight and immediate dashboard reminder removal after enabling history. Preserve other active insights. Regression coverage includes live preference updates, stale initial loads, and timed highlight removal.

- 2026-10-26: Fixed reminder navigation leaving modern Settings on General, where Usage history was not mounted. Added regression coverage for both classic and modern presentations; target scroll margin clears the sticky settings tabs. All 41 targeted frontend tests passed.

- 2026-10-28: Fixed tray menu "Show Stats" / "Go to Settings" / "About CrossUsage" doing nothing in modern layout. Rust already emits `tray:navigate` / `tray:show-about`; only the classic shell listened. Added `useTrayNavigation` hook wired into ModernShell (settings → settings screen, other views → dashboard; about → dialog). Validation: 4 new hook tests, full suite 1587 tests + tsc green.

- 2026-10-28: Modern layout can now hide the window in-app: Escape invokes `hide_panel` via the new `useEscapeHidePanel` hook (skipped while the About dialog is open, while a dialog already handled Escape, or while typing in an input/contenteditable); on macOS the modern shell gained the tray arrow and an "X" hide button in the nav row, matching the classic popover chrome. Classic shell and `usePanel` untouched. Validation: 8 new hook regression tests, full suite 1595 tests + `tsc --noEmit` green.

- 2026-10-28: Fixed tray "Show Stats" / "Go to Settings" / "About CrossUsage" being dropped when clicked before the webview's listeners register (fresh start, or right after tray Restart). Rust stores the latest navigation target (`tray::PendingTrayNavigation`) in addition to emitting the existing events; both layouts consume it once at startup via `consume_pending_tray_navigation` using the same handlers as the event path. Validation: 2 new Rust store/consume tests (`crossusage` 58/58, `crossusage-cli` 5/5), 6 new hook tests, full frontend suite 1601 tests + `tsc --noEmit` green.
