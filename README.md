# 华为鸿蒙轻量穿戴应用开发技能 / Huawei HarmonyOS Lite Wearable JS App Development Skill

[中文](#中文) | [English](#english)

## 中文

一个由社区维护的第三方技能，用于在严格的运行时、语法、内存、资源、音频和设备兼容性约束下，开发和评审华为鸿蒙轻量穿戴应用。

> 本项目与华为无关，未获华为认可或背书。华为、HarmonyOS 及相关商标归其各自所有者所有。本仓库不重新分发厂商 SDK 文件、厂商原始文档、设备截图或第三方演示项目。

本技能用于开发与评审华为鸿蒙轻量穿戴设备（轻智能手表，如 WATCH GT、FIT 系列）上运行的应用。轻量穿戴设备的运行环境与手机、平板和普通 Web 应用差异很大：

- JS heap 只有 KB 级
- 屏幕为低分辨率圆屏或方屏
- JS/HML/CSS 仅支持精简子集

本技能旨在指导智能体在此类约束下完成轻量穿戴应用的开发、修改、迁移、代码评审、性能优化和故障排查，避免将完整 Web、标准 ES6、ArkUI 或高内存设备的经验错误套用于手表应用。

### 仓库结构

```text
SKILL.md
agents/openai.yaml
references/
scripts/project-reviewer/run-reviewer.bat
```

此公开仓库仅包含社区维护的技能、参考资料和评审脚本。DevEco Studio、HarmonyOS SDK 和官方文档需要自行获取。

### 安装

#### Codex

将仓库克隆到 Codex skills 目录：

```powershell
git clone https://github.com/AlanLinYu/huawei-lite-watch-development.git `
  "$env:USERPROFILE\.codex\skills\huawei-lite-watch-development"
```

或者不克隆仓库，直接下载源码，并在使用时显式指定 `SKILL.md`。

### 使用

#### Codex

调用：

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

脚本输出是启发式线索，不能替代 DevEco 构建和目标真机测试。启动器按以下顺序定位 Node.js：被检查应用的 `local.properties` 的 `nodejs.dir` → DevEco Studio 自带 node → PATH，找不到时报错退出。

### 贡献与证据

提交兼容性规则时，请附上 SDK/API 版本、设备型号、固件、最小复现和真机结果。请勿提交厂商原始文档、SDK 文件、包含个人信息的日志或未经授权的第三方源码。

### 许可证

本仓库中的社区代码和文档均以 [MIT License](LICENSE) 授权。此许可不授予对华为产品、SDK、文档、商标或第三方材料的任何权利。

## English

An unofficial, community-maintained Codex skill for developing and reviewing Huawei HarmonyOS Lite Wearable applications under strict runtime, syntax, memory, resource, audio, and device-compatibility constraints.

> This project is not affiliated with or endorsed by Huawei. Huawei, HarmonyOS, and related marks belong to their respective owners. This repository does not redistribute vendor SDK files, original vendor documentation, device screenshots, or third-party demo projects.

This skill targets Huawei HarmonyOS Lite Wearable applications — light smartwatches such as the WATCH GT and FIT series. Their runtime differs greatly from phones, tablets, and web apps: the JS heap is measured in hundreds of KB, screens are low-resolution round or square, and only a restricted subset of JS/HML/CSS is supported. The skill guides Codex through developing, modifying, migrating, reviewing, optimizing, and debugging Lite Wearable applications under these constraints, keeping full-web, full-ES6, ArkUI, or high-memory assumptions out of watch code.

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

### License

Community-authored code and documentation in this repository are licensed under the [MIT License](LICENSE). This license does not grant rights to Huawei products, SDKs, documentation, trademarks, or third-party materials.
