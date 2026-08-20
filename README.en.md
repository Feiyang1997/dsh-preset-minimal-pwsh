# dsh-preset-minimal-pwsh

[![preset-check](https://github.com/Feiyang1997/dsh-preset-minimal-pwsh/actions/workflows/preset-check.yml/badge.svg)](https://github.com/Feiyang1997/dsh-preset-minimal-pwsh/actions/workflows/preset-check.yml)

A Windows persistent edition of the DeepSeek Harness **minimal** agent preset: two tools (persistent `pwsh` + `str_replace_editor`), a fixed persona, no context compaction, aligned with the official minimal design — plus a fix for the official editor write-fence gap. Only built-in plugins (including the persistent-pwsh capability added in rc8), no core-code changes.

## Why

Since rc8 the official minimal preset works natively on Windows: the persistent `pwsh` PTY (`dsh-tool-pwsh-persistent` + `shellDialect: pwsh` + the win32 terminal inspector) is part of the official composition. But the official fs group still mounts bare `fs-local` — `str_replace_editor` can write to any absolute path even under `read-only` / `workspace-write` badges ([#2066](https://github.com/deepseek-ai/deepseek-harness/discussions/2066)).

This preset starts from the official Windows minimal composition and swaps the filesystem to `dsh-fs-sandbox` to restore the write fence; everything else matches the official preset line for line.

## Features

- Fixed persona: `You are a helpful software engineer assistant.` (`complete: true`, same as the official minimal)
- Two tools: **persistent `pwsh`** (PowerShell PTY; `cd` and `$env:` survive across calls) + `str_replace_editor`
- No context compaction, no runtime-context snapshot
- Only built-in packages: `dsh-persona`, `dsh-terminal`, `dsh-terminal-bash` (pwsh dialect), `dsh-tool-pwsh-persistent`, `dsh-fs-sandbox`, `dsh-tool-str-replace-editor`

## Differences from the official minimal preset

| Dimension | Official minimal (rc8+) | This preset |
|---|---|---|
| Windows persistent shell | persistent pwsh PTY | identical (same official components) |
| Fixed persona / no compaction / no runtime context | yes | identical |
| Background tasks | none | identical |
| Editor write fence | none (bare `fs-local`, [#2066](https://github.com/deepseek-ai/deepseek-harness/discussions/2066)) | yes (`fs-sandbox`: read-only denies writes, workspace-write confines to workspace and temp roots, full access unfenced) |
| Platform | Linux (persistent bash) + Windows (persistent pwsh) | Windows only |

## Install

Prerequisites: DeepSeek Harness (Web UI, rc8+ recommended) and PowerShell 7+ (`pwsh`).

Option A — copy the directory:

```powershell
# The DSH user preset root is $DSH_HOME/.agent-presets/; without DSH_HOME it is ~/.dsh/.agent-presets/
Copy-Item -Recurse .\agent-presets\minimal-pwsh "$env:USERPROFILE\.dsh\.agent-presets\minimal-pwsh"
```

Option B — install script (idempotent; use `-Force` to overwrite, which backs up first):

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

After installing: restart `dsh web` (or refresh the page), then select **极简模式 (PowerShell)** when creating a session.

## Usage

The agent in the session has two tools: `pwsh` and `str_replace_editor`. `pwsh` is a persistent shell — `cd` and `$env:` survive across calls. To verify:

1. Create a session and select **极简模式 (PowerShell)**;
2. Ask the agent to run `Set-Location $env:USERPROFILE; $env:DSH_PERSIST_TEST = 'ok'`;
3. On the next call, ask the agent to run `Get-Location; $env:DSH_PERSIST_TEST` — the directory and `ok` from the previous step should still be there.

## Limitations

- **No background execution**: the persistent pwsh tool has no background parameter, same as the official minimal.
- **Permission-mode behavior**: `str_replace_editor` is fenced by `fs-sandbox` — `read-only` denies all writes, `workspace-write` allows only the workspace and temp roots, `danger-full-access` is unfenced (the official minimal preset lacks this fence because it mounts bare `fs-local`; see [#2066](https://github.com/deepseek-ai/deepseek-harness/discussions/2066)). The persistent pwsh shell runs under a restricted token in `workspace-write` (ConstrainedLanguage etc.) and cannot write under `read-only`.
- **win32 only**: the persistent-shell rows are gated by `process.platform !== 'win32'`; this preset targets Windows.

## Development

The preset structure is validated locally with the same check the `preset-check` workflow runs on every push/PR:

```powershell
npm ci
npm run validate
```

## License

MIT
