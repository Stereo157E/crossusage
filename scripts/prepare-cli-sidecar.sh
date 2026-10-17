#!/usr/bin/env bash
# Build crossusage-cli for the same target as the Tauri app and place it where Tauri externalBin expects.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROFILE="${1:-release}"
case "$PROFILE" in
  debug) PROFILE_ARGS=() ;;
  release) PROFILE_ARGS=(--release) ;;
  *) echo "Usage: $0 [debug|release]" >&2; exit 2 ;;
esac

TARGET_ARGS=()
# Tauri sets this for beforeBuildCommand (see TAURI_ENV_* in Tauri docs).
if [[ -n "${TAURI_ENV_TARGET_TRIPLE:-}" ]]; then
  TARGET="$TAURI_ENV_TARGET_TRIPLE"
  TARGET_ARGS=(--target "$TARGET")
elif [[ -n "${CARGO_BUILD_TARGET:-}" ]]; then
  TARGET="$CARGO_BUILD_TARGET"
  TARGET_ARGS=(--target "$TARGET")
else
  TARGET="$(rustc -vV | awk '/host:/{print $2}')"
fi

# Share the native debug dependency cache with `tauri dev`.
BUILD_DIR="${CARGO_TARGET_DIR:-$ROOT/target}"
if [[ ${#TARGET_ARGS[@]} -gt 0 ]]; then
  BUILD_DIR="$BUILD_DIR/$TARGET"
fi
echo "==> Checking crossusage-cli ($PROFILE) for $TARGET"
cargo build --locked "${PROFILE_ARGS[@]}" -p crossusage-cli "${TARGET_ARGS[@]}"

mkdir -p "$ROOT/src-tauri/binaries"
if [[ "$TARGET" == *"windows"* ]]; then
  SRC="$BUILD_DIR/$PROFILE/crossusage-cli.exe"
  DEST="$ROOT/src-tauri/binaries/crossusage-cli-$TARGET.exe"
else
  SRC="$BUILD_DIR/$PROFILE/crossusage-cli"
  DEST="$ROOT/src-tauri/binaries/crossusage-cli-$TARGET"
fi

if ! cmp -s "$SRC" "$DEST"; then
  cp -f "$SRC" "$DEST"
  chmod +x "$DEST"
fi
echo "==> CLI sidecar: $DEST"
