set shell := ["bash", "-euo", "pipefail", "-c"]
set positional-arguments

# npm exposes Bun to the existing Tauri hooks, even without a global installation.
# With Bun installed globally: just bun=bun dev
bun := "npm exec --yes --package=bun -- bun"

# List available commands.
default:
    @just --list

# Install locked frontend dependencies and fetch locked Rust dependencies.
setup:
    {{ bun }} install --frozen-lockfile
    cargo fetch --locked

# Start the desktop app with hot reload (includes CLI sidecar preparation).
dev: _sidecar
    {{ bun }} run tauri:dev

# Build the native release app and its resources, without installer packaging.
build: _sidecar
    node copy-bundled.cjs
    npm run build
    cargo build --release -p crossusage --locked

# Start the existing native release build.
run:
    ./target/release/crossusage </dev/null

# Capture a Linux crash/hang with GDB; Ctrl+C once if the window freezes.
diagnose:
    bash scripts/diagnose-linux.sh

# Run frontend tests; accepts Vitest arguments, e.g. just test src/lib/foo.test.ts.
test *args:
    npm test -- "$@"

# Run Rust core/CLI tests; accepts cargo test arguments.
test-rust *args:
    cargo test --locked -p crossusage-core -p crossusage-cli "$@"

# Run the CLI from source, e.g. just cli list.
cli *args:
    cargo run --locked -p crossusage-cli -- "$@"

# Build platform installer bundles (requires platform packaging/signing tools).
bundle *args:
    {{ bun }} run tauri:build "$@"

[private]
_sidecar:
    bash scripts/prepare-cli-sidecar.sh
