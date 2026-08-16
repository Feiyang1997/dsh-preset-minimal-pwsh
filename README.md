# dsh-preset-minimal-pwsh

DeepSeek Harness 的 Windows 版「极简模式」agent preset：用官方内置的 `pwsh` 工具替代官方极简模式中无法在 Windows 上运行的持久 `bash`。双工具（`pwsh` + `str_replace_editor`）、固定 persona、无上下文压缩，设计对齐官方极简模式；只依赖官方内置插件，不修改核心代码。

## 为什么需要

官方极简模式（`minimal` preset）在 Windows 上无法使用。其持久 `bash` 依赖 PTY 后端，而官方 `@deepseek-ai/dsh-subprocess-local` 的 win32 分支直接拒绝终端检查（`subprocess-local: terminal inspection is unsupported on platform win32`）——无论是否安装 bash 都会失败。

本 preset 用官方自带的 `@deepseek-ai/dsh-tool-pwsh`（每次调用新开 `pwsh -Command` 进程）替代持久 bash。宿主组合在 win32 上启用 `@deepseek-ai/dsh-pwsh-sandbox` 提供 `shell` 服务，因此本 preset 无需任何第三方插件。

## 特性

- 固定 persona：`You are a helpful software engineer assistant.`（`complete: true`，与官方极简一致）
- 两个工具：`pwsh`（PowerShell）+ `str_replace_editor`
- 无上下文压缩、无运行时上下文快照
- 仅引用官方内置包：`dsh-persona`、`dsh-tool-pwsh`、`dsh-fs-local`、`dsh-tool-str-replace-editor`

## 与官方极简模式的差异

| 维度 | 官方极简（Linux） | 本 preset（Windows） |
|---|---|---|
| 工具 | bash + str_replace_editor | pwsh + str_replace_editor |
| 固定 persona | 是 | 相同 |
| 无压缩 / 无运行时上下文 | 是 | 相同 |
| 持久状态（cwd / 环境变量跨调用） | 持久 PTY bash | 无；每次调用新开 pwsh 进程 |
| 后台任务 | 无（bash 无后台参数） | 关闭（`enableRunInBackground: false`） |
| 编辑器写围栏 | 无（裸 `fs-local`） | 相同 |

## 安装

前提：已安装 DeepSeek Harness（Web 界面）与 PowerShell 7+（`pwsh`）。

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

会话中的 Agent 拥有两个工具：`pwsh` 与 `str_replace_editor`。验证：

1. 新建会话并选择「极简模式 (PowerShell)」；
2. 让 Agent 执行 `Write-Output $PSVersionTable.PSVersion`，应返回 PowerShell 版本号。

## 限制

- **无持久 shell**：每次工具调用新开 `pwsh -NoLogo -NoProfile -NonInteractive -Command` 进程，`cd` 与 `$env:` 不跨调用保留；跨目录操作请显式传 `workdir`。
- **无后台执行**：`run_in_background` 已禁用（本 preset 未挂载 `tool-jobs`，与官方极简一致）。
- **编辑器无写围栏**：与官方极简相同，`str_replace_editor` 使用裸本地文件系统，`read-only` / `workspace-write` 徽章下仍可写任意绝对路径；仅在 `danger-full-access` 下使用可完全避免该语义差异。
- **仅 win32**：`tool-pwsh` 行按 `process.platform !== 'win32'` 门控，本 preset 面向 Windows。

## 开发

预设结构校验（与 `preset-check` 工作流在每次推送/PR 时运行的是同一检查）：

```powershell
npm ci
npm run validate
```

## 许可

MIT
