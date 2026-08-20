// Validates the shipped minimal-pwsh preset files: loader-dialect YAML parse,
// row shape, and the win32 persistent-pwsh composition the review pinned.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

// The cordis loader's !!js dialect (tag:yaml.org,2002:js): scalars round-trip
// as expression nodes instead of strings.
const JsExpr = new yaml.Type('tag:yaml.org,2002:js', {
  kind: 'scalar',
  resolve: () => true,
  construct: data => ({ __js: data }),
})
const SCHEMA = yaml.DEFAULT_SCHEMA.extend([JsExpr])

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function fail(message) {
  console.error(`validate: ${message}`)
  process.exit(1)
}

function checkRows(rows, where) {
  if (!Array.isArray(rows)) fail(`${where}: top level must be a list`)
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) fail(`${where}: row is not an object`)
    if (typeof row.id !== 'string' || row.id.length === 0) fail(`${where}: row missing string id`)
    if (typeof row.name !== 'string' || row.name.length === 0) fail(`${where}: row ${row.id} missing string name`)
    if (row.group === true) {
      if (!Array.isArray(row.config)) fail(`${where}: group row ${row.id} config must be a list`)
      checkRows(row.config, `${where}/${row.id}.config`)
    }
  }
}

function isJsDisabled(row) {
  return row?.disabled !== undefined && typeof row.disabled === 'object' && row.disabled.__js !== undefined
}

const presetDir = path.join(root, 'agent-presets', 'minimal-pwsh')
if (!fs.existsSync(path.join(presetDir, 'agent.cordis.yml')) || !fs.existsSync(path.join(presetDir, 'preset.yml'))) {
  fail(`preset directory incomplete at ${presetDir}`)
}

const comp = yaml.load(fs.readFileSync(path.join(presetDir, 'agent.cordis.yml'), 'utf8'), { schema: SCHEMA })
checkRows(comp, 'agent.cordis.yml')

// The review pinned the persistent-shell group: the official rc8 win32 pwsh
// PTY stack — terminal-bash with shellDialect pwsh and tool-pwsh-persistent,
// both win32-gated.
const shellGroup = comp.find(row => row.id === 'persistent-shell')
if (!shellGroup || shellGroup.group !== true || !Array.isArray(shellGroup.config)) {
  fail('agent.cordis.yml: persistent-shell group missing or malformed')
}
const shellRows = new Map(shellGroup.config.map(row => [row.id, row]))
const terminalPwsh = shellRows.get('terminal-pwsh')
if (!terminalPwsh || terminalPwsh.name !== '@deepseek-ai/dsh-terminal-bash') {
  fail('agent.cordis.yml: persistent-shell must mount terminal-pwsh via dsh-terminal-bash')
}
if (terminalPwsh.config?.shellDialect !== 'pwsh') {
  fail('agent.cordis.yml: terminal-pwsh must set shellDialect: pwsh')
}
if (!isJsDisabled(terminalPwsh)) fail('agent.cordis.yml: terminal-pwsh must gate on a !!js disabled expression')
const persistentPwsh = shellRows.get('persistent-pwsh')
if (!persistentPwsh || persistentPwsh.name !== '@deepseek-ai/dsh-tool-pwsh-persistent') {
  fail('agent.cordis.yml: persistent-shell must mount persistent-pwsh via dsh-tool-pwsh-persistent')
}
if (!isJsDisabled(persistentPwsh)) fail('agent.cordis.yml: persistent-pwsh must gate on a !!js disabled expression')

// The review pinned the fenced filesystem: the filesystem group must mount
// fs-sandbox, not bare fs-local (bare fs-local leaves str_replace_editor
// unfenced in every mode — upstream discussion #2066).
const fsGroup = comp.find(row => row.id === 'filesystem')
if (!fsGroup || fsGroup.group !== true || !Array.isArray(fsGroup.config)) {
  fail('agent.cordis.yml: filesystem group missing or malformed')
}
const fsRowIds = fsGroup.config.map(row => row.id)
if (!fsRowIds.includes('fs-sandbox')) fail('agent.cordis.yml: filesystem group must mount fs-sandbox')
if (fsRowIds.includes('fs-local')) fail('agent.cordis.yml: filesystem group must not mount fs-local')

const meta = yaml.load(fs.readFileSync(path.join(presetDir, 'preset.yml'), 'utf8'), { schema: SCHEMA })
if (typeof meta.name !== 'string' || meta.name.length === 0) fail('preset.yml: name must be a non-empty string')
if (typeof meta.description !== 'string' || meta.description.length === 0) {
  fail('preset.yml: description must be a non-empty string')
}

console.log(`OK rows: ${comp.map(row => row.id).join(', ')}`)
console.log(`OK preset name: ${meta.name}`)
