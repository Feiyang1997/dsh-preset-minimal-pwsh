# dsh-preset-minimal-pwsh

[![preset-check](https://github.com/Feiyang1997/dsh-preset-minimal-pwsh/actions/workflows/preset-check.yml/badge.svg)](https://github.com/Feiyang1997/dsh-preset-minimal-pwsh/actions/workflows/preset-check.yml)

DeepSeek Harness「极简模式」的 Windows 持久版 agent preset：双工具（持久 `pwsh` + `str_replace_editor`）、固定 persona、无上下文压缩，设计对齐官方极简模式；并在官方之上修复编辑器写围栏缺口。只依赖官方内置插件（含 rc8 新增的持久 pwsh 能力），不修改核心代码。

## 为什么需要

官方极简模式自 rc8 起在 Windows 上原生可用：持久 `pwsh` PTY（`dsh-tool-pwsh-persistent` + `shellDialect: pwsh` + win32 终端检查）已是官方组合的一部分。但官方 fs 组仍挂裸 `fs-local`——`str_replace_editor` 在 `read-only` / `workspace-write` 徽章下依然可写任意绝对路径（[#2066](https://github.com/deepseek-ai/deepseek-harness/discussions/2066)）。

本 preset 以官方 Windows 极简组合为基础，把文件系统换成 `dsh-fs-sandbox` 补上写围栏，其余与官方逐行一致。

## 特性

- 固定 persona：`You are a helpful software engineer assistant.`（`complete: true`，与官方极简一致）
- 两个工具：**持久 `pwsh`**（PowerShell PTY，`cd` 与 `$env:` 跨调用保留）+ `str_replace_editor`
- 无上下文压缩、无运行时上下文快照
- 仅引用官方内置包：`dsh-persona`、`dsh-terminal`、`dsh-terminal-bash`（pwsh 方言）、`dsh-tool-pwsh-persistent`、`dsh-fs-sandbox`、`dsh-tool-str-replace-editor`

## 与官方极简模式的差异

| 维度 | 官方极简（rc8+） | 本 preset |
|---|---|---|
| Windows 持久 shell | 持久 pwsh PTY | 相同（同一官方组件） |
| 固定 persona / 无压缩 / 无运行时上下文 | 是 | 相同 |
| 后台任务 | 无 | 相同 |
| 编辑器写围栏 | 无（裸 `fs-local`，[#2066](https://github.com/deepseek-ai/deepseek-harness/discussions/2066)） | 有（`fs-sandbox`：read-only 拒绝写入、workspace-write 限工作区与临时目录、full access 无限制） |
| 平台 | Linux（持久 bash）+ Windows（持久 pwsh） | 仅 Windows |

## 安装

前提：已安装 DeepSeek Harness（Web 界面，建议 rc8+）与 PowerShell 7+（`pwsh`）。

方法 A — 复制目录：

```powershell
# DSH 用户预设根为 $DSH_HOME/.agent-presets/；未设置 DSH_HOME 时为 ~/.dsh/.agent-presets/
Copy-Item -Recurse .\agent-presets\minimal-pwsh "$env:USERPROFILE\.dsh\.agent-presets\minimal-pwsh"
```

方法 B — 安装脚本（幂等；已存在时需 `-Force` 覆盖，覆盖前自动备份）：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

安装后：重启 `dsh web`（或刷新页面），新建会话时选择「极简模式 (PowerShell)」。

## 使用

会话中的 Agent 拥有两个工具：`pwsh` 与 `str_replace_editor`。`pwsh` 是持久 shell——`cd` 与 `$env:` 跨调用保留。验证：

1. 新建会话并选择「极简模式 (PowerShell)」；
2. 让 Agent 执行 `Set-Location $env:USERPROFILE; $env:DSH_PERSIST_TEST = 'ok'`；
3. 下一次工具调用让 Agent 执行 `Get-Location; $env:DSH_PERSIST_TEST`——应看到上一步设置的目录与 `ok` 依然保留。

## 限制

- **无后台执行**：持久 pwsh 工具无后台参数，与官方极简一致。
- **权限模式行为**：`str_replace_editor` 由 `fs-sandbox` 围栏——`read-only` 拒绝一切写入，`workspace-write` 仅允许工作区与临时目录，`danger-full-access` 无限制（官方极简无此围栏，见 [#2066](https://github.com/deepseek-ai/deepseek-harness/discussions/2066)）。持久 pwsh 在 `workspace-write` 下以受限令牌运行（ConstrainedLanguage 等），`read-only` 下写入被拒。
- **仅 win32**：持久 shell 行按 `process.platform !== 'win32'` 门控，本 preset 面向 Windows。

## 开发

预设结构校验（与 `preset-check` 工作流在每次推送/PR 时运行的是同一检查）：

```powershell
npm ci
npm run validate
```

## 许可

MIT
