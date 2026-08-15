---
name: hmlwskill
description: 华为鸿蒙（Huawei HarmonyOS）轻量穿戴（轻智能，Lite Wearable）应用（JS App）开发技能。此技能需要在对轻量穿戴应用进行开发、修改、迁移、代码评审、性能优化和故障排查时使用。此技能包含的知识、任务和关键词：华为手表、轻智能、轻量穿戴、Lite Wearable、JS APP、华为手表硬件、应用JS Heap限制、圆屏/方屏不同分辨率适配、轻量穿戴系统、JerryScript、应用common/rawfile目录结构、应用HML/CSS/JS文件结构、应用config.json配置、@system.xxx格式的轻量穿戴API、DevEco Studio轻量穿戴应用开发、DevEco轻量穿戴预览器、DevEco轻量穿戴SDK、DevEco轻量穿戴构建工具ace-loader、轻量穿戴API版本特性及兼容性、HML代码规范、JS代码规范、CSS代码规范、代码语法限制、应用构建、app/hap格式、应用签名、项目依赖、项目版本、项目结构和语法检查工具、应用性能优化、应用内存优化、轻量穿戴文件系统、common目录、轻量穿戴音频播放、应用图片格式、轻量穿戴ViewModel MVVM。
---

# 华为鸿蒙轻量穿戴应用开发技能

华为鸿蒙轻量穿戴（Lite Wearable）是华为智能手表产品线中介于手环与全功能智能手表之间的一类设备，如 WATCH GT、FIT 系列。此类设备可运行轻量应用，但受硬件资源限制（JS heap 不到 1M 的级别，屏幕为低分辨率圆屏或方屏），其开发方式与手机、平板及普通 Web 应用存在本质差异。本技能即为鸿蒙轻量穿戴应用开发相关的技能。

本页面为开发技能的导航首页，用于指示在何种场景下查阅对应的主题页面。具体规范不在本文件中，请进入下方对应参考资料页面完整阅读。

## 基本理念

- 以目标真机行为为准：真机 > 项目 SDK 的 `*.d.ts` > 官方资料 > 演示工程 > 推测。
- 不得以桌面预览、编译成功或普通 Wearable 支持代替 Lite Wearable 真机兼容性。
- 只修改源码目录，忽略 build/.preview/.hvigor/node_modules/oh_modules 等生成或依赖目录。

## 开发实践流程

端到端开发一个 Lite Wearable 页面/应用的标准步骤。每步先读对应参考资料，做完再进下一步；不要跳过验证步骤直接宣称完成。

### 0. 开发前：建立目标设备档案

写代码前先明确目标设备（型号/代号、圆屏或方屏、物理与适配分辨率、JS heap 档位 64/256/512、API 版本、WearEngine 版本）。未指定时按最差档设计：64 KB heap、旧版 API、圆屏安全区，并把最终兼容范围标为"待真机确认"。→ [真机硬件](references/hardware.md)

### 1. SDK 版本选择与 Gradle 配置

- 选定目标 SDK/DevEco 版本，在构建配置中设定两个字段：
  - **`compileSdkVersion`（target）**：决定编译使用的 SDK，进而决定可用 API、语言特性与构建工具版本。
  - **`compatibleSdkVersion`（compatible）**：唯一用处是真机安装时检测该值，高于设备实际版本会安装失败；不参与编译能力决定。
- 旧版工程在根 `build.gradle`（`com.huawei.ohos.app`）与 `entry/build.gradle`（`com.huawei.ohos.hap`）中配置；新版工程用 hvigor 构建体系，配置不通用。
- 先确认 SDK 目录结构判断编译链（API 6 及以前旧链 / API 7 及以后、API 10 及以后新链），再核对 `@since`/`@deprecated`/`@syscap`。→ [编译签名](references/build-sign.md)

### 2. 应用配置（config.json）

- **包名**：`app.bundleName`，反域名格式（如 `com.example.app`）。
- **版本号**：`app.version.code`（整数，如 `1000000`）与 `app.version.name`（如 `"1.0.0"`）。
- **应用名称**：在 `resources/base/element/string.json` 中提供，`config.json` 中引用。
- **图标**：`resources/base/media/icon.png`，按 SDK API≥10 → icon.png 104*104, icon_small.png 80*80；SDK API<10 → icon.png 114*114, icon_small.png 80*80 处理。
- **权限**：`module.reqPermissions` 按需声明（如 `ohos.permission.MODIFY_AUDIO_SETTINGS`）。
- 结构由 DevEco Studio 自动生成骨架，只写新增/更改部分，不要整体重写。→ [项目结构](references/project-structure.md)

### 3. 逻辑拆解与页面划分

- 分析需求，按职责拆成页面：一个页面 = `pages/<page>/` 下一个文件夹、一个功能。
- 先定页面清单与跳转关系（`@system.router` 只有 `replace`，无 push/back）。
- 数据与代码归属：页面私有数据放页面自身；页面间共享数据放 `app.js`（页面通过 `$app` 访问）；共享工具/固定图片放 `common`；需文件方式读取的放 `resources/rawfile`。→ [项目结构](references/project-structure.md) / [轻量穿戴 API](references/system-api.md)

### 4. 新建并注册页面

- 在 `entry/src/main/js/<Ability>/pages/<page>/` 新建 `<page>.hml` / `<page>.js` / `<page>.css` 三元组（hml/js/css 强绑定）。
- 同时在 `config.json` 的 `module.js[].pages` 中注册页面路径，否则 `@system.router` 无法跳转。→ [项目结构](references/project-structure.md)

### 5. 页面 JS 逻辑

- 按 MVVM 模式：`data` 声明状态，生命周期 `onInit`/`onShow`/`onHide`/`onDestroy`，事件处理与业务方法平级定义。
- 每次跳转/`import` 都是新 JS 实例（Page ≠ Singleton），跨页面状态用 `$app` 或 `@system.storage`，不要依赖返回复用。
- 定时器/传感器订阅必须在 `onDestroy` 清理，否则泄漏 JS heap。→ [ViewModel 与样式特性](references/viewmodel-style.md) / [JS 特性](references/js-syntax.md)

### 6. JS 语法限制检查

- `.js` 源码只允许 Lite ES6 子集：`let`/`const`、箭头函数、`class`、`for...of`、模板字符串、静态 `import`/`export`。
- 禁止：`async`/`await`、`Promise`、生成器/`yield`、展开语法、可选链、动态 `import`、`eval`/`new Function` 等。
- HML `{{...}}` 表达式只允许 ES5，保持简单，不写复杂表达式。
- 内存默认按 64 KB heap 设计，常驻数据与峰值临时数据都要估算，公共 JS 用相对 `import`（产物会静态内联）。→ [JS 特性](references/js-syntax.md)

### 7. 页面 HML/CSS 样式

- HML 用 Lite 组件白名单（`div`/`stack`/`list`/`text`/`image`/`progress` 等），没有 `<button>`，用 `<input type>` 或 `div` + 事件代替。
- CSS 仅类选择器、`px` 与百分比单位、flex/stack 布局；不支持 `gap`/`position`/`background-image`/`calc()`。
- 未设置的宽高默认 0、背景默认黑；文字只能放 `<text>` 元素（唯一自动计算高度的元素）。→ [ViewModel 与样式特性](references/viewmodel-style.md)

### 8. 多分辨率与圆/方屏适配

- 优先按适配分辨率布局：稳定固定基准尺寸 + 百分比布局，不按物理分辨率写死 UI。
- 圆屏：关键信息、按钮、滚动区域放入安全区，边缘仅放可裁切背景；核对最长中文文本、系统字号、点击/长按/滑动冲突与边缘裁切。
- 方屏与圆屏分支显式、有限、可测试；宣称跨代兼容时必须覆盖最低分辨率档。→ [真机硬件](references/hardware.md) / [ViewModel 与样式特性](references/viewmodel-style.md)

### 9. 页面素材准备（音频、图片）

- **图片**：固定页面图放 `js/<Ability>/common`，以 `/common/...` 绝对路径引用；文件名必须英文 ASCII（字母/数字/`_`/`-`），禁止中文、空格、全角符号；按物理分辨率准备素材并估算解码内存（`宽*高*4`）。→ [真机文件系统](references/file-system.md) / [真机系统](references/system.md)
- **音频**：`@system.audio` 按单活动音源设计；rawfile 音频先复制到可写目录再播放；MP3 文件头校验、单文件 ≤5 MiB、音量 0.0–1.0、播放结束与 `onDestroy` 清理。→ [真机系统](references/system.md)

### 10. rawfile 文件准备

- 需以文件方式读取的原始数据/音频放 `resources/rawfile`，运行时以 `internal://app/rawfile/...` 访问。
- rawfile 按只读处理，需修改时先复制到 `internal://app/` 可写位置。
- file/rawfile 流程无法由预览器证明，**必须真机验证**。→ [真机文件系统](references/file-system.md)

### 11. 本地验证（每完成一个页面按序执行）

1. **DevEco Studio 预览器看样式**：检查布局、字号、圆/方屏显示效果。
2. **DevEco Studio 预览器看 JS 报错**：看 console 输出与运行时异常。
3. **尝试编译**：构建无失败、无致命警告；检查 HAP 大小与产物 JS（单个产物 ≤48 KiB）。构建产物位置见 [编译签名](references/build-sign.md)。
4. **运行评审脚本**：

   ```bat
   scripts\project-reviewer\run-reviewer.bat -ProjectPath <项目目录> -TargetHeapKB 64 -TargetApi 6
   ```

   构建后追加 `-BuiltJsPath <项目>\entry\build\default\intermediates\loader_out_lite\default\js`。`[WARN]`/`[RELEASE BLOCKER]` 项必须回到源码逐条核实修复，不能直接当作确定缺陷。→ [评审脚本使用说明](references/project-reviewer.md)

### 12. 真机测试

- 预览/编译通过 ≠ 真机可用。产物**打包签名后才能上真机**，必须验证：冷启动、反复进退页面、长时间运行、快速操作、低存储、传感器/振动/音频/文件接口、JS heap 峰值、图片连续切换、异常恢复。
- 未执行的验证必须明确写出，不能用"应该可用"代替。
- 宣称跨代兼容时至少覆盖最低 heap/API/分辨率档。→ [编译签名](references/build-sign.md)

## 工具

改动前后可用评审脚本 `scripts/project-reviewer/run-reviewer.bat` 对项目做只读启发式检查。涉及运行命令、参数说明与检查项 → [评审脚本使用说明](references/project-reviewer.md)

## 参考资料

### 真机硬件

轻量穿戴设备按型号/代号区分圆屏或方屏，屏幕分辨率与传感器硬件能力（加速度计、心率、振动等）影响布局与功能设计。涉及设备档案、分辨率、屏幕适配 → [真机硬件](references/hardware.md)

### 真机系统

设备侧资源与能力受限：JS heap 按档位分（不到 1M 级别），API 版本与 WearEngine 版本决定可用特性，图片池、音频播放与权限请求需按约束处理。涉及图片池、API 版本、JS heap、音频播放、权限 → [真机系统](references/system.md)

### 项目结构

应用以 JS 应用包形式分发，页面由 HML（类 HTML 模板语言）、CSS 与 JavaScript 构成，工程由含 `liteWearable` 标记的 `config.json` 描述，源码位于 `entry/src/main/js/<Ability>/`。涉及工程形态、目录结构、common/rawfile、config.json 配置项 → [项目结构](references/project-structure.md)

### 真机文件系统

约定页面图片置于 `common` 目录并以 `/common/...` 路径引用，需经文件接口访问的数据置于 `resources/rawfile`。涉及应用沙盒路径、编译后路径、文件名规范 → [真机文件系统](references/file-system.md)

### ViewModel 与样式特性

页面遵循 MVVM ViewModel 模式，用 HML 模板（数据绑定、条件与列表渲染）配合组件白名单与 CSS 样式构建界面，样式与事件写法受 Lite 限制。涉及 MVVM、HML 模板与组件、事件、CSS → [ViewModel 与样式特性](references/viewmodel-style.md)

### JS 特性（JerryScript）

JavaScript 运行于轻量级引擎 JerryScript，仅支持文档列出的 ES6 子集；HML 表达式不支持 ES6，语法与内存约束严格。涉及语法环境区分、禁止项、内存约束 → [JS 特性](references/js-syntax.md)

### 轻量穿戴 API（@system.*）

系统能力通过 `@system.*` 系列模块提供，包括 `@system.router`（路由）、`@system.storage`（存储）、`@system.sensor`（传感器）、`@system.file`（文件）、`@system.audio`（音频）、`@system.device`（设备信息）等。涉及模块清单、签名要点、版本特性、错误码 → [轻量穿戴 API](references/system-api.md)

### 编译签名

使用 DevEco Studio 完成工程创建、预览与构建，产物经 ace-loader 等构建链转译后打包为 hap/app 部署至设备。涉及编译流程、SDK 定位、Gradle 配置、打包签名、验证分层 → [编译签名](references/build-sign.md)