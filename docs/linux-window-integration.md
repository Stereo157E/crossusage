# Linux window integration

The Linux window is an opaque, resizable desktop window without a client title
bar. `src-tauri/tauri.linux.conf.json` sets its properties **before creation**.
The compositor owns placement, tiling, outer rounding and shadows. Showing the
window does not reposition it near the pointer or reset its size. Escape hides
it; the existing tray menu can reopen it or quit the application. Use the window
manager's move/resize bindings for floating windows.

The frontend's `tauri-linux` class paints the full webview and removes the
popover's rounded outer surface in both Classic and Modern layouts. Glass theme
effects remain inside that opaque window. macOS keeps its transparent popover;
Windows keeps its native title bar and tray positioning.

GDK tries Wayland before X11. An explicit `GDK_BACKEND` still takes precedence.
Do not set `GDK_SCALE` or change the compositor's global XWayland scaling just
to test a native Wayland build.

## Native build and desktop check

With Bun, Rust and the Tauri Linux system dependencies installed:

```sh
bun install --frozen-lockfile
cargo fetch --locked
bun run build
bun run test
cargo test -p crossusage-core cursor_paths_resolve_state_db_accepts_no_javascript_arguments --locked
bun run tauri build --no-bundle
```

The build hook prepares the plugins and CLI sidecar. Quit the installed
CrossUsage instance before testing the new executable, so port 6736 and the tray
belong to one instance. From the repository root:

```sh
env -u LD_PRELOAD -u GDK_BACKEND -u GDK_SCALE -u GDK_DPI_SCALE \
  -u WEBKIT_DISABLE_COMPOSITING_MODE ./target/release/crossusage </dev/null
```

This uses the host's GTK/WebKit/Mesa libraries rather than the AppImage bundle.
It uses the existing CrossUsage settings and providers. No launcher is replaced.

On Hyprland, inspect `hyprctl clients -j`: the CrossUsage client should report
`xwayland: false`. Check:

- Text at fractional monitor scaling; no extra transparent corner inside the
  compositor's corner and no GTK title bar.
- Tiled, floating and maximized sizes; the content fills the window and scrolls.
- All four Modern navigation buttons, particularly Settings, including after
  resizing. Repeat with animations on/off and Classic/Modern layouts.
- Escape/reopen and compositor close/reopen: window size is not reset by React.
- Release terminal output contains warnings/errors; the log file still contains
  diagnostics at the selected log level. Debug builds retain verbose stderr.

## Verification

Frontend tests, the Cursor host-binding regression test, and native release builds
passed. Validate rendering, input, resizing and performance on the target desktop.

## Rendering follow-up

Pointer spotlight updates now coalesce into one animation-frame callback using
the latest coordinates, instead of reading layout and changing inherited CSS
variables for every pointer event. Leaving the panel, disabling animations,
unmounting, or enabling system reduced motion cancels pending work. The dashboard
clock pauses on Settings, Customize and Polls instead of rebuilding invisible
widget groups each second.

Regression tests verify that 50 pointer events before one frame cause one layout
read and two CSS writes, and that cancelled updates cannot overwrite the reset
state. This establishes reduced work, not a measured desktop frame-rate gain.

Compare with Settings → Reduce animations, and with Light/Dark if using Glass.
Note whether flickering happens while idle, scrolling, hovering or changing tabs.
For a native crash or freeze, run `bash scripts/diagnose-linux.sh` in a terminal.
GDB records the stop signal and up to 40 stack frames per thread. For a freeze,
press Ctrl+C once in that terminal and wait for the trace; do not kill the process
first. The diagnostic run terminates after collecting the stacks. Reports go to
a private `/tmp/crossusage-debug.*` directory, with application stderr/stdout
separate from `backtrace.txt` and a binary hash in `build.txt`. Function argument
values and local variables are omitted; no core dump is requested. GDB's own
exit status is not the application's exit status: inspect the stop/exit report.
WebKit subprocesses are not traced by this first capture.

Do not unconditionally disable GPU compositing/DMABUF to address an unconfirmed
cause. [Tauri's graphics guidance](https://v2.tauri.app/develop/debug/linux-graphics/)
describes those as targeted workarounds that can sacrifice a faster renderer.

## AppImage packaging is a separate fix

CrossUsage 1.6.0 locks `@tauri-apps/cli` to 2.11.2. Its previously distributed
AppImage forced X11 and required a system Wayland library preload on the affected
Mesa installation. Changing the application window does not repair that bundle.

[Tauri PR #16062](https://github.com/tauri-apps/tauri/pull/16062) updates
linuxdeploy/GTK packaging, fixes the newer-Mesa `EGL_BAD_PARAMETER` failure and
removes the X11 default. It is in **tauri-bundler 2.10.0 / Tauri CLI 2.12.0**.
Upgrade the build-time CLI and regenerate `bun.lock` before producing a replacement
AppImage; updating only the Rust `tauri` runtime is insufficient. Validate the
resulting AppImage separately without preload/backend workarounds.

References: [Tauri platform config merging](https://v2.tauri.app/develop/configuration-files/#platform-specific-configuration)
(window arrays replace the entire base array),
[GDK backend selection](https://docs.gtk.org/gdk3/func.set_allowed_backends.html).

## Maintaining this fork

The local `main` branch contains our changes on top of CrossUsage commit
`5da900e77293e1b913f13a2a69414906d7223a29`. `origin` points to
the fork repository; `upstream` points to `barramee27/crossusage`.
The upstream integration branch is `feat/linux-windows-native-support`.

After committing local work, bring future upstream changes into a dedicated
branch, resolve any conflicts, then test and review before merging into `main`:

```bash
git switch main
git pull --ff-only origin main
git fetch upstream
git switch -c chore/sync-crossusage-YYYY-MM-DD
git merge upstream/feat/linux-windows-native-support
just test
just test-rust
just build
just run
```

Use a new date/name for each integration branch. Preserve merge ancestry rather
than replacing the fork's tree or force-resetting it to upstream. Take OpenUsage
ports through CrossUsage unless intentionally porting a change ourselves.

In-app binary updates are disabled: the upstream endpoint/key, native updater
registration and capability are removed, updater artifact generation is off, and
the frontend does not check or schedule updates. Provider usage refreshes are
unaffected. To re-enable binary updates, configure a fork-owned release endpoint
and signing keys, restore registration/permissions, and enable the frontend policy
in `src/lib/app-updates.ts`. Git synchronization and installed-app updates are
separate mechanisms. Existing binaries need rebuilding for this change to apply.
