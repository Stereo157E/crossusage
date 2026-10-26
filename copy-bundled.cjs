const { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } = require("fs")
const { join } = require("path")

const root = __dirname
const exclude = new Set(["mock"])
const srcDir = join(root, "plugins")
const dstDir = join(root, "src-tauri", "resources", "bundled_plugins")

const plugins = readdirSync(srcDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !exclude.has(d.name))
  .map((d) => d.name)

function buildCursorNightlyPlugin() {
  const nightlyDir = join(srcDir, "cursor-nightly")
  const cursorJs = readFileSync(join(srcDir, "cursor", "plugin.js"), "utf8")
  const file = join(nightlyDir, "plugin.js")
  const content = `globalThis.__OPENUSAGE_PLUGIN_REGISTRATION_ID__ = "cursor-nightly";\n${cursorJs}`
  if (!existsSync(file) || readFileSync(file, "utf8") !== content) {
    writeFileSync(file, content)
  }
}

buildCursorNightlyPlugin()

function isBundledFile(src) {
  return !src.endsWith(".test.js") && !src.endsWith("test-helpers.js") && !src.endsWith(".md")
}

function directoriesMatch(source, destination) {
  if (!existsSync(destination)) return false
  const entries = readdirSync(source, { withFileTypes: true })
    .filter((entry) => isBundledFile(join(source, entry.name)))
  const targets = readdirSync(destination, { withFileTypes: true })
  if (entries.length !== targets.length) return false
  return entries.every((entry) => {
    const target = targets.find((candidate) => candidate.name === entry.name)
    if (!target || entry.isDirectory() !== target.isDirectory()) return false
    const from = join(source, entry.name)
    const to = join(destination, entry.name)
    return entry.isDirectory()
      ? directoriesMatch(from, to)
      : readFileSync(from).equals(readFileSync(to))
  })
}

const bundled = existsSync(dstDir) ? readdirSync(dstDir).filter((name) => name !== ".gitkeep") : []
if (bundled.length === plugins.length && plugins.every((id) => directoriesMatch(join(srcDir, id), join(dstDir, id)))) {
  console.log(`Bundled plugins unchanged (${plugins.length})`)
  process.exit(0)
}

rmSync(dstDir, { recursive: true, force: true })

for (const id of plugins) {
  cpSync(join(srcDir, id), join(dstDir, id), {
    recursive: true,
    filter: isBundledFile,
  })
}

console.log(`Bundled ${plugins.length} plugins: ${plugins.join(", ")}`)
