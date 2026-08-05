# 华为轻智能手表开发 Codex Skill / Huawei Lite Wearable Development Skill

[中文](#中文) | [English](#english)

An unofficial, community-maintained Codex skill for developing and reviewing Huawei HarmonyOS Lite Wearable applications under strict runtime, syntax, memory, resource, audio, and device-compatibility constraints.

> This project is not affiliated with or endorsed by Huawei. Huawei, HarmonyOS, and related marks belong to their respective owners. This repository does not redistribute vendor SDK files, original vendor documentation, device screenshots, or third-party demo projects.

## 中文

这是一个面向华为 HarmonyOS Lite Wearable 轻智能手表开发的 Codex skill，重点解决普通 Web、完整 ES6、ArkUI 或高内存设备经验被错误套用到轻智能手表的问题。

### 核心约束

- JerryScript JS heap 按 `64 / 256 / 512 KB` 分档，目标设备未知时默认按 64 KB 设计。
- 图片解码池与 JS heap 分开计算，图片按 `宽 * 高 * 4` 估算 RGBA 峰值。
- `.js` 只允许官方文档列出的部分 ES6；HML 的 `{{...}}` 表达式不支持 ES6。
- HML 标签、属性、事件和父子结构按 Lite SDK 白名单检查。
- 固定页面图片放在手动创建的 `js/<Ability>/common`，以 `/common/...` 引用。
- 图片名称必须使用英文 ASCII 字母、数字、`_`、`-`，禁止中文、空格和全角符号。
- `resources/rawfile` 通过 `internal://app/rawfile/...` 和 `@system.file` 访问，file/rawfile 流程必须真机验证。
- `@system.audio` 按单活动音源设计，rawfile 音频先复制到可写目录再播放。
- 模拟器和预览器不能证明真实传感器、文件接口、音频解码、图片释放或内存上限。

### 仓库结构

```text
SKILL.md
agents/openai.yaml
references/
scripts/audit_lite_watch_project.ps1
```

公开版只包含社区整理的规则和审计脚本。使用者需要自行合法获取 DevEco Studio、对应 SDK 和官方文档。

### 安装

将仓库克隆到 Codex skills 目录：

```powershell
git clone https://github.com/AlanLinYu/huawei-lite-watch-development.git `
  "$env:USERPROFILE\.codex\skills\huawei-lite-watch-development"
```

也可以只下载源码，在使用时显式指向 `SKILL.md`。

### 使用

在 Codex 中调用：

```text
使用 $huawei-lite-watch-development 开发或审查这个 Lite Wearable 项目。
```

运行只读审计：

```powershell
powershell -ExecutionPolicy Bypass `
  -File scripts/audit_lite_watch_project.ps1 `
  -ProjectPath <项目目录> `
  -TargetHeapKB 64 `
  -TargetApi 6 `
  -SdkApiPath <DevEco-SDK>\default\openharmony\js\api
```

构建后可增加：

```powershell
-BuiltJsPath <项目>\entry\build\default\intermediates\loader_out_lite\default\js
