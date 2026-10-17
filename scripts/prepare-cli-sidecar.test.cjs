const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crossusage-sidecar-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "scripts"));
  fs.mkdirSync(path.join(root, "bin"));
  fs.copyFileSync(path.join(__dirname, "prepare-cli-sidecar.sh"), path.join(root, "scripts/prepare-cli-sidecar.sh"));
  fs.writeFileSync(path.join(root, "bin/rustc"), "#!/bin/sh\necho 'host: x86_64-unknown-linux-gnu'\n", { mode: 0o755 });
  fs.writeFileSync(path.join(root, "bin/cargo"), `#!/bin/bash
set -euo pipefail
printf '%s\\n' "$@" > cargo-args
profile=debug
target=""
while (( $# )); do
  case "$1" in
    --release) profile=release ;;
    --target) shift; target="$1" ;;
  esac
  shift
done
output="$CARGO_TARGET_DIR"
[[ -z "$target" ]] || output="$output/$target"
output="$output/$profile"
mkdir -p "$output"
name=crossusage-cli
[[ "$target" != *windows* ]] || name="$name.exe"
printf '%s' "$profile binary" > "$output/$name"
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${root}/bin:${process.env.PATH}` };
  for (const key of ["TAURI_ENV_TARGET_TRIPLE", "CARGO_BUILD_TARGET", "CARGO_TARGET_DIR"]) delete env[key];
  env.CARGO_TARGET_DIR = "target";
  return {
    root,
    run(profile, overrides = {}) {
      return spawnSync("bash", ["scripts/prepare-cli-sidecar.sh", ...profile], {
        cwd: root, env: { ...env, ...overrides }, encoding: "utf8",
      });
    },
  };
}

test("debug shares native Cargo output and preserves an unchanged sidecar", (t) => {
  const { root, run } = fixture(t);
  assert.equal(run(["debug"]).status, 0);
  assert.deepEqual(fs.readFileSync(path.join(root, "cargo-args"), "utf8").trim().split("\n"), ["build", "--locked", "-p", "crossusage-cli"]);
  const sidecar = path.join(root, "src-tauri/binaries/crossusage-cli-x86_64-unknown-linux-gnu");
  assert.equal(fs.readFileSync(sidecar, "utf8"), "debug binary");
  fs.utimesSync(sidecar, 100, 100);
  assert.equal(run(["debug"]).status, 0);
  assert.equal(fs.statSync(sidecar).mtimeMs, 100000);
});

test("release remains the default and replaces an existing debug sidecar", (t) => {
  const { root, run } = fixture(t);
  assert.equal(run(["debug"]).status, 0);
  assert.equal(run([]).status, 0);
  assert.match(fs.readFileSync(path.join(root, "cargo-args"), "utf8"), /--release/);
  assert.equal(fs.readFileSync(path.join(root, "src-tauri/binaries/crossusage-cli-x86_64-unknown-linux-gnu"), "utf8"), "release binary");
});

test("explicit target and output directory produce the Windows sidecar name", (t) => {
  const { root, run } = fixture(t);
  const target = "x86_64-pc-windows-gnu";
  assert.equal(run(["debug"], { TAURI_ENV_TARGET_TRIPLE: target, CARGO_TARGET_DIR: "custom-target" }).status, 0);
  assert.equal(fs.readFileSync(path.join(root, `src-tauri/binaries/crossusage-cli-${target}.exe`), "utf8"), "debug binary");
});

test("invalid profile fails before building", (t) => {
  const { root, run } = fixture(t);
  assert.equal(run(["invalid"]).status, 2);
  assert.equal(fs.existsSync(path.join(root, "cargo-args")), false);
});
