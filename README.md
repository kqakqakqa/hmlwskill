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
scripts/project-reviewer/run-reviewer.bat
```

公开版只包含社区整理的规则和评审脚本。使用者需要自行获取 DevEco Studio、对应 SDK 和官方文档。

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
使用 $huawei-lite-watch-development 开发或评审这个 Lite Wearable 项目。
```

运行只读评审：

```bat
scripts\project-reviewer\run-reviewer.bat -ProjectPath <项目目录> -TargetHeapKB 64 -TargetApi 6 -SdkApiPath <DevEco-SDK>\default\openharmony\js\api
```

构建后可增加：

```bat
scripts\project-reviewer\run-reviewer.bat -ProjectPath <项目目录> -BuiltJsPath <项目>\entry\build\default\intermediates\loader_out_lite\default\js
```

脚本输出是启发式线索，不能替代 DevEco 构建和目标真机测试。启动器按序定位 Node.js（被检查应用的 `local.properties` 的 `nodejs.dir` → DevEco Studio 自带 node → PATH），找不到时报错退出。

### 贡献与证据

提交兼容性规则时，请提供 SDK/API 版本、设备型号、固件、最小复现和真机结果。不要提交厂商原始文档、SDK 文件、包含个人信息的日志或未经授权的第三方源码。

## English

This repository provides a Codex skill for Huawei HarmonyOS Lite Wearable development. It prevents assumptions from full web runtimes, unrestricted ES6, ArkUI, or high-memory devices from leaking into constrained watch applications.

### Core constraints

- Treat the JerryScript JS heap as a strict `64 / 256 / 512 KB` budget. Default to 64 KB when the target is unknown.
- Budget the decoded image pool separately from the JS heap. Estimate RGBA memory as `width * height * 4`.
- Allow only the documented ES6 subset in `.js` source. ES6 is not allowed inside HML `{{...}}` expressions.
- Validate HML tags, attributes, events, and parent-child rules against the Lite SDK whitelist.
- Put fixed page images in a manually created `js/<Ability>/common` directory and reference them as `/common/...`.
- Image names must use ASCII letters, digits, `_`, and `-`. Do not use Chinese characters, spaces, full-width punctuation, or emoji.
- Access `resources/rawfile` through `internal://app/rawfile/...` and `@system.file`. File/rawfile behavior requires signed real-device testing.
- Model `@system.audio` as one active stream. Copy packaged rawfile audio to a writable location before playback.
- Previewer and simulator results do not prove sensor behavior, file APIs, audio decoding, image release, or memory ceilings.

### Repository layout

```text
SKILL.md
agents/openai.yaml
references/
scripts/project-reviewer/run-reviewer.bat
```

The public repository contains only community-authored guidance and review code. Obtain DevEco Studio, the matching SDK, and official documentation through authorized channels.

### Install

Clone the repository into the Codex skills directory:

```powershell
git clone https://github.com/AlanLinYu/huawei-lite-watch-development.git `
  "$env:USERPROFILE\.codex\skills\huawei-lite-watch-development"
```

You can also download the source and explicitly point Codex to `SKILL.md`.

### Use

Invoke the skill in Codex:

```text
Use $huawei-lite-watch-development to develop or review this Lite Wearable project.
```

Run the read-only review:

```bat
scripts\project-reviewer\run-reviewer.bat -ProjectPath <project-directory> -TargetHeapKB 64 -TargetApi 6 -SdkApiPath <DevEco-SDK>\default\openharmony\js\api
```

After a build, add:

```bat
scripts\project-reviewer\run-reviewer.bat -ProjectPath <project-directory> -BuiltJsPath <project>\entry\build\default\intermediates\loader_out_lite\default\js
```

Review findings are heuristic. They do not replace a DevEco build or testing on the target watch. The launcher locates Node.js in order — `nodejs.dir` in the target app's `local.properties`, then DevEco Studio's bundled node, then node on PATH — and exits with an error when none is found.

### Contributing and evidence

Compatibility changes should include the SDK/API version, device model, firmware, a minimal reproduction, and real-device results. Do not submit vendor documentation, SDK files, personal logs, or third-party source code without redistribution rights.

## License

Community-authored code and documentation in this repository are licensed under the [MIT License](LICENSE). This license does not grant rights to Huawei products, SDKs, documentation, trademarks, or third-party materials.
