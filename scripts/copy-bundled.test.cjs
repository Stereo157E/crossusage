const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("bundling preserves unchanged timestamps and replaces stale generated resources", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crossusage-bundle-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.copyFileSync(path.join(__dirname, "../copy-bundled.cjs"), path.join(root, "copy-bundled.cjs"));
  for (const id of ["cursor", "cursor-nightly", "mock"]) {
    fs.mkdirSync(path.join(root, "plugins", id), { recursive: true });
    fs.writeFileSync(path.join(root, "plugins", id, "plugin.js"), "original");
  }
  const run = () => execFileSync(process.execPath, ["copy-bundled.cjs"], { cwd: root });
  run();
  const bundled = path.join(root, "src-tauri/resources/bundled_plugins");
  const nightly = path.join(root, "plugins/cursor-nightly/plugin.js");
  const copied = path.join(bundled, "cursor/plugin.js");
  fs.utimesSync(nightly, 100, 100);
  fs.utimesSync(copied, 100, 100);
  run();
  assert.equal(fs.statSync(nightly).mtimeMs, 100000);
  assert.equal(fs.statSync(copied).mtimeMs, 100000);
  assert.equal(fs.existsSync(path.join(bundled, "mock")), false);

  fs.writeFileSync(path.join(root, "plugins/cursor/plugin.js"), "updated");
  fs.mkdirSync(path.join(bundled, "obsolete"));
  run();
  assert.equal(fs.readFileSync(copied, "utf8"), "updated");
  assert.match(fs.readFileSync(nightly, "utf8"), /updated$/);
  assert.equal(fs.existsSync(path.join(bundled, "obsolete")), false);
});
