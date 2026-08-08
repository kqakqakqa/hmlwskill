# 编译签名（build-sign）

> 使用 DevEco Studio 完成工程创建、预览与构建，产物经 ace-loader 等构建链转译后打包为 hap/app 部署至设备。编译分为两种（API 6 及以前的旧版链、API 7 及以后的旧版链 / API 10 及以后的新版链），可通过 SDK 结构区分。产物只有打包签名后才能上真机。

## 目录

- [编译签名（build-sign）](#编译签名build-sign)
  - [目录](#目录)
  - [编译流程概览](#编译流程概览)
  - [import 的编译处理](#import-的编译处理)
  - [源码目录与编译后结构](#源码目录与编译后结构)
  - [两种编译过程](#两种编译过程)
  - [SDK 定位](#sdk-定位)
  - [SDK API 兼容性核对](#sdk-api-兼容性核对)
  - [Gradle 工程配置（旧版）](#gradle-工程配置旧版)
    - [根项目 build.gradle](#根项目-buildgradle)
    - [settings.gradle](#settingsgradle)
    - [entry/build.gradle](#entrybuildgradle)
  - [编译 API 版本](#编译-api-版本)
  - [打包产物](#打包产物)
  - [签名流程](#签名流程)
  - [验证分层](#验证分层)
  - [输出要求](#输出要求)
  - [相关主题](#相关主题)

## 编译流程概览

DevEco Studio 工程中，Lite Wearable 页面（HML/CSS/JS）由 ace-loader 构建链处理：Babel 等工具把 `.js` 源码中的 ES6 子集转译为 ES5 产物，HML 模板与 CSS 编译为表端可执行结构，最终打包为 hap/app 安装包。

关键点：

- 构建链配置（webpack/Babel 目标、Lite 组件白名单）位于 SDK 内，见 [SDK 定位](#sdk-定位)。
- `target: ['web', 'es5']` 之类配置只能证明构建链尝试转译，不能证明目标手表原生支持完整 ES6 或具备对应运行时内建对象。
- 项目代码未经编译无法在真机上运行，需要先经过构建 `loader_out_lite` 才可运行。需做产物语法检查，见 [js-syntax.md](js-syntax.md#构建产物检查) 与 [project-reviewer.md](project-reviewer.md) 的"构建产物 JS"检查项。
- 不直接编辑构建产物；以构建与评审脚本的检查为准。

## import 的编译处理

构建链对两种 `import` 的处理方式不同，直接影响产物 JS 大小与运行时行为：

- **系统 API（`@system.*`）**：编译期识别的系统模块，`import "@system.*"` 会被转译成 `requireNative("system.*")` 的调用形式，两种写法等效。转译后只做解析与绑定，实现由运行时提供，不嵌入产物 JS，不增加产物文件大小。可用性与版本限制见 [system-api.md](system-api.md#调用方法)。
- **本地 JS（相对路径 `import`）**：编译时被引用 JS 会被静态嵌入引用方产物，产物文件大小等于引用方自身加上所有被引用 JS 之和；运行时没有独立的被引用文件，实际目录以引用方为准（见 [file-system.md](file-system.md#应用资源-common-路径)）。单个 JS 产物编译后不能大于 48 KB，引用链膨胀会直接推高产物体积与加载成本，详见 [js-syntax.md](js-syntax.md#import-与产物大小)。

两种 `import` 均为静态声明；动态 `import()` 不在 Lite 子集内（见 [js-syntax.md](js-syntax.md#禁止项)）。

## 源码目录与编译后结构

编译前，应用代码按源码目录组织，完整目录结构见 [project-structure.md](project-structure.md#目录结构)。

编译打包后，代码被转译并映射到真机上的两个目录：

- 编译前 `app.js` 所在目录 → 应用资源根 `/`：`app.js`、`pages/<page>`（编译为 `/pages/<page>/<page>`）、`common`（编译为 `/common`），供 HML/CSS/JS 静态引用（含 `../` 相对形式）。
- 源码 `resources/rawfile/` → 应用沙盒 `internal://app/rawfile`（只读），供 `@system.file` 访问。

真机上的目录模型与访问边界见 [file-system.md](file-system.md#真机目录模型)。

## 两种编译过程

编译分为两种，可以通过 SDK 看出来：

1. **DevEco Studio 3.1（旧版本）的 API 6 及以前**：使用旧版构建链与 SDK 结构。
2. **DevEco Studio 3.1（旧版本）的 API 7 及以后，以及 DevEco 新版本（API 10 及以后）**：使用另一套构建链与 SDK 结构。

两种过程的 SDK 布局、构建工具、产物路径与支持语法存在差异。判断目标工程属于哪种编译过程时，先看 SDK 的目录结构与构建工具（见 [SDK 定位](#sdk-定位)），再核对配置与产物，不能把旧链结论直接套到新链。

## SDK 定位

不要写死电脑盘符。优先按以下顺序确定当前项目使用的 DevEco/OpenHarmony SDK：

1. 用户明确提供的 SDK 根目录。
2. 项目、DevEco Studio 设置或环境变量（如 `DEVECO_SDK_HOME`）记录的 SDK。
3. 用户本机安装目录中的 `default/openharmony/js` 结构。

记录 SDK 产品版本、API 版本和构建工具版本。若找不到 SDK，停止做确定的 API/组件兼容声明，并要求用户提供路径。

常用相对位置：

SDK API10 及以后：

```text
<DevEco-SDK>/default/openharmony/js/api/
<DevEco-SDK>/default/openharmony/previewer/liteWearable/bin/Simulator.exe
<DevEco-SDK>/default/openharmony/js/build-tools/ace-loader/webpack.lite.config.js
<DevEco-SDK>/default/openharmony/js/build-tools/ace-loader/babel.config.js
<DevEco-SDK>/default/openharmony/js/build-tools/ace-loader/lib/templater/lite_component_map.js
<DevEco-SDK>/default/openharmony/js/build-tools/ace-loader/lib/templater/component_validator.js
<DevEco-SDK>/default/openharmony/js/build-tools/ace-loader/bin/jerry.exe
```

SDK API7 及以前：

```text
<Huawei-SDK>/js/api/liteWearable/
<Huawei-SDK>/js/build-tools/ace-loader/
<Huawei-SDK>/previewer/liteWearable/bin/
```

## SDK API 兼容性核对

检查 webpack/Babel 目标、Lite 组件白名单和实际构建产物：

```powershell
rg -n "接口名|@since|@deprecated|@syscap" "<DevEco-SDK>\default\openharmony\js\api"
rg -n "liteWearableTag|liteCommonTag" "<DevEco-SDK>\default\openharmony\js\build-tools\ace-loader"
```

逐项确认以下字段：

- `@since`：接口最低 API 版本，高于目标设备时不可用。
- `@deprecated`：废弃不代表目标旧设备不可用；替代接口也不代表目标旧设备支持，分别陈述。
- `@syscap`：如 `SysCap.ACE.UIEngineLite` 等能力要求。
- 权限：接口是否需要声明权限。
- Lite 设备行为差异：例如 `@system.router` 无 push/back、`@system.sensor` 无取消订阅。
- 订阅取消接口：有 subscribe 是否有对应 unsubscribe，无则按生命周期重建回收。
- HML 白名单依据 `lite_component_map.js` 与 `component_validator.js`，见 [viewmodel-style.md](viewmodel-style.md#组件白名单)。

只优先保留目标设备已验证的 `@system.*` 接口；具体到某个型号的 API 版本观察值见 [system.md](system.md#api-版本)。

## Gradle 工程配置（旧版）

旧版工程使用 HarmonyOS Gradle 插件（`com.huawei.ohos.app` / `com.huawei.ohos.hap`）与 maven 仓库。新版工程使用 hvigor 构建体系，两者配置不通用。

### 根项目 build.gradle

```groovy
apply plugin: 'com.huawei.ohos.app'

ohos {
    compileSdkVersion 6
}

buildscript {
    repositories {
        maven { url 'https://repo.huaweicloud.com/repository/maven/' }
        maven { url 'https://developer.huawei.com/repo/' }
    }
    dependencies {
        classpath 'com.huawei.ohos:hap:3.1.5.0'
        classpath 'com.huawei.ohos:decctest:1.2.7.20'
    }
}

allprojects {
    repositories {
        maven { url 'https://repo.huaweicloud.com/repository/maven/' }
        maven { url 'https://developer.huawei.com/repo/' }
    }
}
```

### settings.gradle

```groovy
rootProject.name = 'files'
include ':entry'
```

### gradle.properties

```properties
# org.gradle.jvmargs=-Dfile.encoding=GBK
# org.gradle.parallel=false
```

JVM 内存不足时可在 `gradle.properties` 中配置 `org.gradle.jvmargs=-Xmx4g`（见下文"常见故障"）。

### entry/build.gradle

```groovy
apply plugin: 'com.huawei.ohos.hap'
apply plugin: 'com.huawei.ohos.decctest'

ohos {
    compileSdkVersion 6
    defaultConfig {
        compatibleSdkVersion 3
    }
    buildTypes {
        release {
            proguardOpt {
                proguardEnabled false
                rulesFiles 'proguard-rules.pro'
            }
        }
    }
}
```

插件说明：

- `com.huawei.ohos.app`：根项目插件，提供 OHOS 项目配置、仓库配置、依赖管理。
- `com.huawei.ohos.hap`：模块插件，提供 HAP 构建、资源处理、签名配置。
- `com.huawei.ohos.decctest`：测试插件，提供 DECC 测试支持与测试报告生成。

构建类型：

- `debug`：不启用混淆，包含调试信息，用于开发和测试。
- `release`：可选混淆，优化代码，用于发布；混淆通过 `proguardOpt` 配置（见上 `entry/build.gradle`）。

混淆配置 `proguard-rules.pro`：

```proguard
-keep class com.example.** { *; }
-keepattributes *Annotation*
```

混淆规则需保留必要的类与注解（`-keep`、`-keepattributes`），避免混淆后运行时查找类/注解失败。

常用命令：

```cmd
gradlew.bat assembleDebug
gradlew.bat assembleRelease
gradlew.bat clean
gradlew.bat test
gradlew.bat dependencies
```

常见故障：依赖下载失败（检查网络/代理，如 `systemProp.http.proxyHost`、`systemProp.http.proxyPort`）、SDK 版本不匹配（核对 `compileSdkVersion` 与本地 SDK Manager）、构建内存不足（`org.gradle.jvmargs=-Xmx4g`）、混淆错误（检查混淆规则，确保必要的类被保留）。

## 编译 API 版本

- `compileSdkVersion`：编译时使用的 SDK 版本，决定可用的 API、语言特性与构建工具版本。
- `compatibleSdkVersion`：应用兼容的最低 SDK 版本，决定应用可以在哪些设备上运行与向后兼容性。

注意与运行时可查询的 API 版本区分：target / compatible / deviceInfo 不是同一字段，见 [真机系统](system.md#api-版本)。

## 打包产物

- 产物格式为 **app/hap**：hap 是模块安装包，app 是应用整体包。
- 构建产物中间目录（`loader_out_lite`）与检查方法见 [project-structure.md](project-structure.md#构建产物)。
- 检查 HAP 大小与构建警告；资源（common/rawfile）进入安装包的规则见 [file-system.md](file-system.md)。

## 签名流程

- 产物只有**打包签名后才能上真机**。
- 签名由 DevEco Studio 工程配置完成（签名证书、Profile 与描述文件在构建配置中指定）。
- 未签名的 hap/app 无法安装到目标真机；任何 file/rawfile、传感器、音频等真机验证都以签名产物为准。

## 验证分层

按风险分层验证，未执行项必须明确说明，不能用"应该可用"代替：

1. **静态检查**：`config.json`、页面注册、导入接口、组件白名单、资源路径、权限和生命周期清理。
2. **DevEco 构建**：确认转译后产物，不直接编辑产物；检查警告和 HAP 大小。
3. **Lite Wearable 模拟器**：验证启动、路由、布局、交互和基础 API 冒烟。
4. **目标真机**：验证冷启动、反复进退页面、长时间运行、快速操作、低存储、传感器/振动/音频/文件、JS heap 峰值、图片连续切换和异常恢复。
5. **最低档回归**：若宣称跨代兼容，至少覆盖最低 heap/API/分辨率档；不能只测最高端型号。

**模拟器不证明真实传感器、功耗、文件系统差异、图片释放或内存上限**。接口文档明确"仅支持真机调试"时，必须将真机结果列为发布阻塞项。

## 输出要求

每次开发或评审结论都要给出：

- 目标设备档案与仍未知字段。
- 使用的 API/组件及最低版本、权限、Lite Wearable 差异。
- JS heap 风险：常驻数据、峰值临时数据、定时器/订阅和清理点（见 [js-syntax.md](js-syntax.md#内存约束)）。
- 语法风险：`.js` 源码是否完全属于 Lite ES6 子集，HML 表达式是否保持 ES5，构建产物是否仍含不支持的语法/运行时依赖或高成本 helper。
- 图片池风险：最大解码尺寸、最大并发图数和释放策略（见 [system.md](system.md#图片池)）。
- 资源风险：`common`/`rawfile` 选择、静态路径存在性、file API 真机验证状态和可写复制目标（见 [file-system.md](file-system.md)）。
- 音频风险：权限、真实格式、复制状态、播放路径、单音源切换、音量和销毁清理（见 [system.md](system.md#音频播放)）。
- 已执行的构建/模拟器/真机验证；未执行项必须明确说明。
- 兼容性结论：**已验证 / 资料支持但未实测 / 未知**，三者分开标记。

## 相关主题

- 评审脚本运行与输出解读：[project-reviewer.md](project-reviewer.md)
- 构建产物位置与工程目录：[project-structure.md](project-structure.md)
- API 版本字段与真机系统约束：[system.md](system.md)
- 资源路径与打包进入安装包的规则：[file-system.md](file-system.md)
