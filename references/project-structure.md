# 项目结构（project-structure）

> 轻量穿戴应用以 JS 应用包形式分发，工程由含 `liteWearable` 标记的 `config.json` 描述，源码位于 `entry/src/main/js/<Ability>/`。只修改源码目录，忽略生成与依赖目录。页面由 HML/CSS/JS 强绑定构成。

## 目录

- [项目结构（project-structure）](#项目结构project-structure)
  - [目录](#目录)
  - [工程形态识别](#工程形态识别)
  - [目录结构](#目录结构)
  - [config.json](#configjson)
  - [页面注册与 Ability 划分](#页面注册与-ability-划分)
  - [app.js 入口](#appjs-入口)
  - [common 目录](#common-目录)
  - [resources/rawfile](#resourcesrawfile)
  - [忽略生成与依赖目录](#忽略生成与依赖目录)
  - [构建产物](#构建产物)
  - [案例工程](#案例工程)
  - [相关主题](#相关主题)

## 工程形态识别

定位包含 `"liteWearable"` 标记的 `config.json`，确认为 Lite Wearable 工程。源码通常位于：

```text
entry/src/main/config.json
entry/src/main/js/<Ability>/app.js
entry/src/main/js/<Ability>/pages/<page>/<page>.hml
entry/src/main/js/<Ability>/pages/<page>/<page>.css
entry/src/main/js/<Ability>/pages/<page>/<page>.js
```

不要把 ArkUI/ArkTS、Web DOM、Node.js API 或普通 Quick App 约定直接套到 Lite Wearable。这类设备的开发方式与手机、平板及普通 Web 应用存在本质差异（JS heap 不到 1M 级别、低分辨率圆屏/方屏），见 [hardware.md](hardware.md)，[system.md](system.md)，与 [js-syntax.md](js-syntax.md)。

## 目录结构

```text
entry/src/main/
├── config.json
├── js/<Ability>/
│   ├── app.js                    # 全局入口
│   ├── pages/
│   │   ├── index/
│   │   │   ├── index.hml
│   │   │   ├── index.js
│   │   │   └── index.css
│   │   └── other/
│   │       ├── other.hml
│   │       ├── other.js
│   │       └── other.css
│   └── common/                   # 可选，通常需手动创建
│       └── utils.js
└── resources/
    ├── base/
    │   ├── media/icon.png        # 图标文件
    │   └── element/string.json   # 应用名称文件
    └── rawfile/                  # 需经 @system.file 访问的原始文件
```

- **页面 = 一个文件夹**；hml/js/css 强绑定。
- `js/<Ability>/app.js` 是全局入口，`pages/<page>/<page>.*` 是页面三元组。
- 这个目录结构由 DevEco Studio 自动生成骨架，因此不需要每次都全部完整写出来，只需要写新增/更改的部分。
- `common` 通常不存在，需要在 `entry/src/main/js/<Ability>/common` 手动创建（规范见 [file-system.md](file-system.md#应用资源-common-路径)）。

## config.json

这是应用的主要描述文件：

```json
{
  "app": {
    "bundleName": "com.example.app",
    "vendor": "example",
    "version": {
      "code": 1000000,
      "name": "1.0.0"
    }
  },
  "module": {
    "reqPermissions": [
      {
        "reason": "访问音频功能",
        "usedScene": { "when": "always" },
        "name": "ohos.permission.MODIFY_AUDIO_SETTINGS"
      }
    ],
    "js": [
      {
        "pages": [
          "pages/index/index",
          "pages/other/other"
        ]
      }
    ]
  }
}
```

config.json 包含的配置项：

- 包名：`app.bundleName`。
- 版本：`app.version.code` 与 `app.version.name`。
- 应用名：`resources/base/element/string.json` 提供，`config.json` 中引用。
- 权限声明：`module.reqPermissions`，例如 `ohos.permission.MODIFY_AUDIO_SETTINGS`（见 [system.md](system.md#权限请求)）。
- 页面注册：`module.js[].pages` 列出页面路径。
- 支持的最低/目标版本在 Gradle 配置中，见 [build-sign.md](build-sign.md#编译-api-版本)。

config.json 结构由 DevEco Studio 自动生成，不需要每次都全部完整写出来，只需要写新增/更改的部分。

## 页面注册与 Ability 划分

- 每个页面必须在 `config.json` 的 `module.js[].pages` 中注册（如 `pages/index/index`），否则无法通过 `@system.router` 跳转。
- 多个页面可归属同一 Ability（`js/<Ability>/`）；Ability 划分决定 `app.js` 入口与公共资源的作用范围。
- 页面跳转只有 `router.replace`（每次跳转都是新实例），见 [system-api.md](system-api.md) 的 @system.router 章节。

## app.js 入口

`js/<Ability>/app.js` 是 Ability 级全局入口，可放置应用级初始化、公共数据与销毁清理。页面隐藏/销毁时的资源清理规范见 [js-syntax.md](js-syntax.md#生命周期清理)。

### 页面通过 `$app` 访问 app.js 上下文

页面 js 可通过 `$app` 直接调用并读写当前 Ability 的 `app.js` 导出上下文（`export default` 的对象）。`app.js` 导出即可用，无需额外引入：

```js
// app.js
export default {
  func() {},
  value: 0
}
```

```js
// <page>.js
$app.func();     // 调用 app.js 导出的方法
$app.value = 1;  // 直接读写 app.js 导出的数据
```

- `$app` 指向 `app.js` 中 `export default` 的导出对象，是运行时自动注入的全局引用，页面 js 中直接可用。
- 写入会持久到当前 Ability 生命周期内；页面切换不销毁 app.js，可用作页面间共享数据，但需在 app.js 的生命周期销毁时一并清理。

## common 目录

- `common` 用于同一 Ability 内多个页面共享的固定图片、公共 JS 与公共 CSS。
- 页面图片以 `/common/...` 绝对资源路径引用；公共 JS/CSS 用相对 `import`/`@import`。
- 具体规则、示例与选择表见 [file-system.md](file-system.md#应用资源-common-路径)。

## resources/rawfile

- `resources/rawfile` 用于需要以文件方式读取的原始数据、音频等，运行时以 `internal://app/rawfile/...` 访问。
- rawfile 按只读处理；需要修改时先复制到 `internal://app/` 可写位置。
- 具体规则与真机验证要求见 [file-system.md](file-system.md#应用沙盒-internalapprawfile-路径)。

## 忽略生成与依赖目录

只修改源码目录，忽略以下生成或依赖目录：

```text
build/ .preview/ .hvigor/ node_modules/ oh_modules/
```

不要把解包产物或构建产物反向覆盖源码；构建产物位置的说明见下。

## 构建产物

- 对于使用 SDK API≥10 编译的项目，构建产物位于 `entry/build/default/intermediates/loader_out_lite/default/js`；对于使用 SDK API<10 编译的项目，构建产物位于 `entry/build/intermediates/js/release/source/lite`。（见 [根项目 build.gradle](build-sign.md#根项目-buildgradle)）
- 构建产物即是表端实际执行输入（转译后的 JS、HML/CSS 编译结果），需检查转译后语法与运行时依赖，见 [js-syntax.md](js-syntax.md#构建产物检查)。
- 构建流程、Gradle/hvigor 配置、app/hap 产物与签名见 [build-sign.md](build-sign.md)。

## 案例工程

案例工程只作为经验样本，不是规范本身。若用户提供工程目录：

- 优先选择目标 API、工程结构和设备档位相同的案例。
- 只读取 `entry/src/main` 或明确源码目录。
- 不从 `build`、`.preview`、解包产物反向覆盖源码。
- 音频案例重点检查 `config.json`、`app.js`、播放页面、`resources/rawfile/audio` 和 `loader_out_lite`。
- QuickJS/解释器实验只能作为兼容风险案例，不得直接作为产品方案。

## 相关主题

- common/rawfile 路径与文件名规范：[file-system.md](file-system.md)
- 编译、签名与验证分层：[build-sign.md](build-sign.md)
- HML 页面三元组与 ViewModel：[viewmodel-style.md](viewmodel-style.md)
- 只读评审脚本的工程定位检查：[project-reviewer.md](project-reviewer.md) 的"工程定位"检查项
