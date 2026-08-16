// Validates the shipped minimal-pwsh preset files: loader-dialect YAML parse,
// row shape, and the win32 pwsh configuration the review pinned.
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

const presetDir = path.join(root, 'agent-presets', 'minimal-pwsh')
if (!fs.existsSync(path.join(presetDir, 'agent.cordis.yml')) || !fs.existsSync(path.join(presetDir, 'preset.yml'))) {
  fail(`preset directory incomplete at ${presetDir}`)
}

const comp = yaml.load(fs.readFileSync(path.join(presetDir, 'agent.cordis.yml'), 'utf8'), { schema: SCHEMA })
checkRows(comp, 'agent.cordis.yml')

// The review pinned the win32 pwsh surface: platform gate and no background.
const pwshRow = comp.find(row => row.id === 'tool-pwsh')
if (!pwshRow) fail('agent.cordis.yml: tool-pwsh row missing')
if (pwshRow.disabled === undefined || typeof pwshRow.disabled !== 'object' || pwshRow.disabled.__js === undefined) {
  fail('agent.cordis.yml: tool-pwsh must gate on a !!js disabled expression')
}
if (pwshRow.config?.enableRunInBackground !== false) {
  fail('agent.cordis.yml: tool-pwsh must set enableRunInBackground: false')
}

const meta = yaml.load(fs.readFileSync(path.join(presetDir, 'preset.yml'), 'utf8'), { schema: SCHEMA })
if (typeof meta.name !== 'string' || meta.name.length === 0) fail('preset.yml: name must be a non-empty string')
if (typeof meta.description !== 'string' || meta.description.length === 0) {
  fail('preset.yml: description must be a non-empty string')
}

console.log(`OK rows: ${comp.map(row => row.id).join(', ')}`)
console.log(`OK preset name: ${meta.name}`)
