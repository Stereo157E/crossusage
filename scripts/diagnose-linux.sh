#!/usr/bin/env bash
# Capture a native crash or a frozen GUI without changing the installed application.
set -euo pipefail

repo_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
binary="$repo_dir/target/release/crossusage"
if ! command -v gdb >/dev/null 2>&1; then
  echo 'gdb is required for this diagnostic run.' >&2
  exit 1
fi
if [[ ! -x "$binary" ]]; then
  echo "Build the native release executable first: $binary" >&2
  exit 1
fi

umask 077
report_dir=$(mktemp -d /tmp/crossusage-debug.XXXXXXXX)
{
  date --iso-8601=seconds
  sha256sum "$binary"
} > "$report_dir/build.txt"

cat > "$report_dir/commands.gdb" <<EOF
set pagination off
set confirm off
set print thread-events off
set print frame-arguments none
set print entry-values no
set disable-randomization off
set logging file $report_dir/backtrace.txt
set logging enabled on
handle SIGPIPE nostop noprint pass
run < /dev/null > $report_dir/application.txt 2>&1
info program
info threads
thread apply all bt 40
set logging enabled off
quit
EOF

printf 'Diagnostic files: %s\n' "$report_dir"
echo 'If the window freezes: press Ctrl+C ONCE in this terminal, then wait for the stacks.'
echo 'On a native crash, stacks are collected automatically. The diagnostic run then ends.'

# The launching shell waits while GDB handles Ctrl+C and writes the trace.
# No full core dump, locals, or function argument values are collected.
trap ':' INT
set +e
env -u LD_PRELOAD -u GDK_BACKEND -u GDK_SCALE -u GDK_DPI_SCALE \
  -u WEBKIT_DISABLE_COMPOSITING_MODE SHELL=/bin/sh RUST_BACKTRACE=1 \
  gdb --quiet --batch --nx \
    -iex 'set debuginfod enabled off' \
    -iex 'set auto-load off' \
    -x "$report_dir/commands.gdb" --args "$binary"
debugger_status=$?
set -e
trap - INT
printf 'GDB status: %s\n' "$debugger_status" >> "$report_dir/build.txt"
printf '\nDiagnostic files saved in: %s\n' "$report_dir"
exit "$debugger_status"
