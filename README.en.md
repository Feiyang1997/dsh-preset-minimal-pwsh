# dsh-preset-minimal-pwsh

[![preset-check](https://github.com/Feiyang1997/dsh-preset-minimal-pwsh/actions/workflows/preset-check.yml/badge.svg)](https://github.com/Feiyang1997/dsh-preset-minimal-pwsh/actions/workflows/preset-check.yml)

A Windows edition of the DeepSeek Harness **minimal** agent preset: it replaces the persistent `bash` tool — which cannot run on Windows — with the built-in `pwsh` tool. Two tools (`pwsh` + `str_replace_editor`), a fixed persona, no context compaction, aligned with the official minimal design; only built-in plugins, no core-code changes.

## Why

The official minimal preset does not work on Windows. Its persistent `bash` depends on a PTY backend, and the official `@deepseek-ai/dsh-subprocess-local` win32 branch refuses terminal inspection outright (`subprocess-local: terminal inspection is unsupported on platform win32`) — it fails whether or not bash is installed.

This preset replaces persistent bash with the built-in `@deepseek-ai/dsh-tool-pwsh` (each call spawns a fresh `pwsh -Command` process). The host composition enables `@deepseek-ai/dsh-pwsh-sandbox` on win32 to provide the `shell` service, so this preset needs no third-party plugins.

## Features

- Fixed persona: `You are a helpful software engineer assistant.` (`complete: true`, same as the official minimal)
- Two tools: `pwsh` (PowerShell) + `str_replace_editor`
- No context compaction, no runtime-context snapshot
- Only built-in packages: `dsh-persona`, `dsh-tool-pwsh`, `dsh-fs-sandbox`, `dsh-tool-str-replace-editor`

## Differences from the official minimal preset

| Dimension | Official minimal (Linux) | This preset (Windows) |
|---|---|---|
| Tools | bash + str_replace_editor | pwsh + str_replace_editor |
| Fixed persona | yes | identical |
| No compaction / no runtime context | yes | identical |
| Persistent state (cwd / env across calls) | persistent PTY bash | none; a fresh pwsh process per call |
| Background tasks | none (bash has no background parameter) | disabled (`enableRunInBackground: false`) |
| Editor write fence | none (upstream issue [#2066](https://github.com/deepseek-ai/deepseek-harness/discussions/2066)) | yes (`fs-sandbox`: read-only denies writes, workspace-write confines to workspace and temp roots, full access unfenced) |

## Install

Prerequisites: DeepSeek Harness (Web UI) and PowerShell 7+ (`pwsh`).

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

The agent in the session has two tools: `pwsh` and `str_replace_editor`. To verify:

1. Create a session and select **极简模式 (PowerShell)**;
2. Ask the agent to run `Write-Output $PSVersionTable.PSVersion`; it should print the PowerShell version.

## Limitations

- **No persistent shell**: each tool call spawns a fresh `pwsh -NoLogo -NoProfile -NonInteractive -Command` process; `cd` and `$env:` do not survive between calls. Pass an explicit `workdir` when operating outside the current directory.
- **No background execution**: `run_in_background` is disabled (this preset mounts no `tool-jobs`, same as the official minimal).
- **Permission-mode behavior**: `str_replace_editor` is fenced by `fs-sandbox` — `read-only` denies all writes, `workspace-write` allows only the workspace and temp roots, `danger-full-access` is unfenced (the official minimal preset lacks this fence because it mounts bare `fs-local`; see [#2066](https://github.com/deepseek-ai/deepseek-harness/discussions/2066)). `pwsh` commands run under a restricted token in `workspace-write` (ConstrainedLanguage etc.) and cannot write under `read-only`.
- **win32 only**: the `tool-pwsh` row is gated by `process.platform !== 'win32'`; this preset targets Windows.

## Development

The preset structure is validated locally with the same check the `preset-check` workflow runs on every push/PR:

```powershell
npm ci
npm run validate
```

## License

MIT
