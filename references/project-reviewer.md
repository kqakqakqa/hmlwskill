# 评审脚本使用说明（project-reviewer）

## 简介

`scripts/project-reviewer/run-reviewer.bat` 是只读评审脚本，改动前后运行，用于对 Lite Wearable 项目做启发式检查，不修改项目。启动器按顺序定位 Node.js：① 被检查应用的 `local.properties` 的 `nodejs.dir` → ② DevEco Studio 安装目录自带 node（`tools\node\node.exe`，覆盖 5.x 工程）→ ③ PATH 上的 node；全部找不到时报错退出（退出码 1）。输出仅为线索，命中项必须回源码确认，不能直接当作确定缺陷；也不能代替 DevEco 构建、模拟器或真机测试。

> 旧版 `scripts/project-reviewer.ps1` 仍保留可用，新开发统一使用本 bat+node 版本。

## 运行命令

```bat
scripts\project-reviewer\run-reviewer.bat -ProjectPath <应用目录> -TargetHeapKB 64 -TargetApi 6
```

## 参数说明

| 参数 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `-ProjectPath` | 是 | - | 被检查应用目录；同时用于定位其 `local.properties`（node 发现策略第一步） |
| `-TargetHeapKB` | 否 | 64 | 目标 JS heap 档位，取值 64/256/512 |
| `-TargetApi` | 否 | 6 | 目标 API 版本，用于核对 @since/@deprecated |
| `-SkipImageDimensions` | 否 | 关 | 跳过解码图片尺寸估算，用于日常快速检查；发布前必须去掉该开关 |
| `-SdkApiPath` | 否 | 自动发现 | SDK 的 `js/api` 目录；不在默认位置时显式指定（也支持 DEVECO_SDK_HOME 等环境变量自动发现） |
| `-BuiltJsPath` | 否 | - | 构建产物 `loader_out_lite` 中的 JS 目录，用于检查转译后的语法 |

## 启动器行为（run-reviewer.bat）

1. 解析 `-ProjectPath`，缺省时报错并退出码 2。
2. 按顺序定位 node，任一命中即使用：
   - `<应用目录>\local.properties` 的 `nodejs.dir`（若其 `node.exe` 存在）；
   - DevEco Studio 安装目录自带 node：探测 `%ProgramFiles%`/`%ProgramFiles(x86)%`/`%LOCALAPPDATA%\Programs` 下的 `Huawei\DevEco Studio*\DevEco Studio\tools\node\node.exe`（也兼容 `\tools\node\node.exe` 变体）——DevEco 5.x 工程不写 `nodejs.dir`，靠此步定位；
   - PATH 上的 node（`where node`）。
3. 全部找不到报 `[ERROR] node.exe not found. Checked: ...`，退出码 1。
4. 调用 `<node>\node.exe cli.js <全部参数>`，退出码透传。

## 检查项

脚本按以下顺序输出评审结果，每条带 `[PASS]/[WARN]/[INFO]` 级别：

1. **工程定位**：扫描含 `liteWearable` 的 `config.json`，无则提示（工程形态见 [project-structure.md](project-structure.md#工程形态识别)）。
2. **源码清单**：统计 JS/HML/样式/图片/音频文件与字节数；rawfile 下的 JS 工具文件不参与运行时扫描；标注大体积 JS。
3. **JS 源码语法**（语法白名单见 [js-syntax.md](js-syntax.md)）：
   - 允许（INFO）：let/const、箭头函数、class、for...of、模板字符串、静态 import/export（Lite ES6 子集，仍需核对 heap 与构建产物）。
   - 禁止（WARN）：async/await、生成器/yield、spread、可选链、空值合并、动态 import、BigInt、eval/Function、QuickJS 嵌入；Promise/Map/Set 等内建对象需 SDK/构建/真机证明；CommonJS/Node 风格（require/Buffer/process）。
   - 定时器/订阅：统计创建与清理次数，无清理时告警。
4. **构建产物 JS**（提供 `-BuiltJsPath` 时）：对转译后产物重复上述语法检查，确认不含未转译的高成本语法；产物单个 JS 文件不得大于 48 KiB（见 [js-syntax.md](js-syntax.md#import-与产物大小)）（产物检查清单见 [js-syntax.md](js-syntax.md#构建产物检查)）。
5. **平台 API 声明**：提取 `@system/@ohos/@kit` import，对照 SDK `*.d.ts` 的 `@since`/`@deprecated`，标记高于目标 API 的用法与废弃项（版本特性核对见 [build-sign.md](build-sign.md#sdk-api-兼容性核对)）。
6. **HML Lite 白名单**：检查标签、属性、事件、枚举值、父子结构、if/for 同用、动态 class 绑定、HML 表达式中的 ES6 语法、elif/else 顺序等（白名单见 [viewmodel-style.md](viewmodel-style.md#组件白名单)）。
7. **资源布局与路径**（规范见 [file-system.md](file-system.md)）：
   - 图片文件名与子目录必须为英文 ASCII（字母/数字/`_`/`-`），违者为发布阻塞项。
   - `/common/...` 静态引用的存在性；动态路径提示枚举验证。
   - 公共 JS 必须用相对 import，不能写 `/common/...` 绝对语法。
   - rawfile 与 `@system.file` 相关流程标记为"真机必测"。
8. **音频**（使用 `@system.audio` 时）：权限声明、是否直用 rawfile 播放、是否有 audio.stop、onDestroy 清理、音量是否在 0.0–1.0、MP3 文件头校验、单文件 5 MiB 经验上限（完整流程见 [system.md](system.md#音频播放)）。
9. **图片池**：压缩总量、解码估算总量（`宽*高*4`，node 版用纯 JS 解析图片文件头，无需 System.Drawing）、最大解码图前 10（估算规则见 [system.md](system.md#图片池)）。

## 输出解读

- 评审脚本是启发式线索，警告不能直接写成确定缺陷，必须回到源码验证（引用真实文件与行号）。
- `[RELEASE BLOCKER]` 标记项在发布前必须处理，包括构建产物 JS 超过 48 KiB。
- 未执行的验证（构建/模拟器/真机）必须明确写出，不能用"应该可用"代替（验证分层与输出要求见 [build-sign.md](build-sign.md#验证分层)）。

## 评审与交付模板

按以下模板组织每次开发或评审的结论。

### 目标设备档案

| 字段 | 值 | 证据状态 |
|---|---|---|
| 型号/代号/固件 |  | 已实测 / 资料 / 未知 |
| 屏幕与适配分辨率 |  | 已实测 / 资料 / 未知 |
| target / compatible / deviceInfo API |  | 已实测 / 资料 / 未知 |
| JS heap | 64 / 256 / 512 KB / 未知 | 已实测 / 资料 / 未知 |
| WearEngine |  | 已实测 / 资料 / 未知 |

未知 heap 时明确写"按 64 KB 基线实现"。不得省略未知项。

### 发现与改动

按严重度列出，每项包含：

- 真实源码文件与行号。
- 可触发的具体场景。
- 对功能、JS heap、图片池、API 兼容或功耗的影响。
- 修复方式及其兼容代价。
- 静态推断、模拟器观察或真机复现，三者选一。

### API 兼容表

| API/组件 | 最低版本 | syscap/权限 | Lite Wearable 差异 | 目标机状态 |
|---|---|---:|---|---|---|
|  |  |  |  | 已验证 / 资料支持 / 未知 |

弃用不等于目标旧设备不可用；替代接口也不等于目标旧设备支持。分别陈述。

### 资源路径与命名

| 资源/用途 | 源码目录 | 运行时路径 | 英文 ASCII 命名 | 验证状态 |
|---|---|---|---|---|
| HML/CSS 固定图片 | `js/<Ability>/common` | `/common/...` | 通过 / 失败 | 构建 / 预览 / 真机 |
| file API 原始文件 | `resources/rawfile` | `internal://app/rawfile/...` | 通过 / 失败 | 必须真机 |
| 运行时可写数据 | 不适用 | `internal://app/...` | 通过 / 失败 | 必须真机 |

列出缺失静态路径、动态拼接路径、中文/空格/非 ASCII 图片名、rawfile 复制目标及失败恢复。DevEco Studio 5.0/API 10 预览器或模拟器不能执行 `@system.file` 时，结果必须写"未验证，真机阻塞"，不能写"通过"。

### 内存预算

| 类别 | 常驻 | 操作峰值 | 回收点 | 证据 |
|---|---|---:|---:|---|---|
| 页面/模块 JS 状态 |  |  |  | 静态 / 真机 |
| 文件读取与 JSON 解析 |  |  |  | 静态 / 真机 |
| 定时器、订阅和回调 |  |  |  | 静态 / 真机 |
| 图片池最大并发 |  |  |  | 估算 / 真机 |

无法精确测量时给出输入规模和保守估算公式，不伪造精确字节数。

### 验证结果

| 层级 | 环境 | 结果 | 未覆盖风险 |
|---|---|---|---|
| 静态审计 |  | 通过 / 失败 |  |
| DevEco 构建 | SDK/API/模式 | 通过 / 失败 / 未运行 |  |
| Lite 模拟器 | 分辨率/配置 | 通过 / 失败 / 未运行 |  |
| 真机 | 型号/代号/固件 | 通过 / 失败 / 未运行 |  |
| 压力回归 | 次数/时长/数据规模 | 通过 / 失败 / 未运行 |  |

最终兼容声明只覆盖实际测试矩阵。资料支持但未真机测试的设备单独列出，不能合并为"全系列兼容"。

## 相关主题

- 工程目录与 config.json：[project-structure.md](project-structure.md)
- JS 语法白名单与构建产物检查：[js-syntax.md](js-syntax.md)
- HML 组件白名单与表达式限制：[viewmodel-style.md](viewmodel-style.md)
- 资源路径与文件名规范：[file-system.md](file-system.md)
- `@system.*` API 与版本特性核对：[system-api.md](system-api.md)
- 图片池与音频播放规则：[system.md](system.md)
- 编译、签名与真机验证：[build-sign.md](build-sign.md)
