# 真机文件系统（file-system）

> 轻量穿戴应用在真机上分为**应用资源根**与**沙盒**两个目录：页面固定图片放在 `common` 并以 `/common/...` 静态路径引用（资源根，`@system.file` 不可访问）；需经文件接口读取的原始数据、音频放在 `resources/rawfile`，运行时以 `internal://app/...`（沙盒，`@system.file` 可访问）读写。文件接口与 rawfile 相关流程必须打包签名后真机验证。

## 目录

- [真机文件系统（file-system）](#真机文件系统file-system)
  - [目录](#目录)
  - [真机目录模型](#真机目录模型)
  - [应用资源 `/` 路径](#应用资源--路径)
    - [应用资源 `/common/` 路径](#应用资源-common-路径)
  - [应用沙盒 `internal://app/` 路径](#应用沙盒-internalapp-路径)
    - [应用沙盒 `internal://app/rawfile` 路径](#应用沙盒-internalapprawfile-路径)
  - [构建产物路径](#构建产物路径)
  - [文件名规范](#文件名规范)
  - [选择规则](#选择规则)
  - [验证要求](#验证要求)
  - [相关主题](#相关主题)

## 真机目录模型

应用安装到真机后，设备上的目录结构是**编译打包后**生成的，与编译前的工程源码目录（`entry/src/main/js/<Ability>/...`）不同。源码目录结构见 [project-structure.md](project-structure.md#目录结构)。

真机上分为**两个目录**：

```text
internal://app/                 # 应用沙盒（@system.file 可访问）
├── rawfile/                    # 来自源码 resources/rawfile/
│   ├── data.json
│   └── audio/
└── <其他区域>                  # 可写，例如 music/，运行时数据放这里

/（应用资源根，来自编译前 app.js 所在目录；@system.file 无法访问）
├── app.js                      # 应用入口
├── common/                     # 通常约定为公共资源，引用路径 /common/...
└── pages/                      # 编译后的页面
    └── <page>/<page>.hml|.css|.js
```

两种路径用途不同。概括来说，`@system.file` 只能访问沙盒目录；应用资源根只能用 HML/CSS/JS 静态引用访问。

不要用编译前源码路径（如 `entry/src/main/js/<Ability>/...`、`resources/rawfile/...`）直接访问真机资源；编译后引用一律使用上述路径。

## 应用资源 `/` 路径

- **应用资源根 `/`**：来自编译前 `app.js` 所在目录，即 `entry/src/main/js/<Ability>/`，编译后 `app.js`、`pages/`、`common/` 位于该根下。
- HML/CSS 的 CSS `url`、`import`、图片 `src` 等静态引用可以使用 `/common/...`、`/pages/<page>/<page>` 绝对路径，也可以使用 `../` 相对形式。
- **`@system.file` API 无法访问该目录**，不能对它做文件读写。

### 应用资源 `/common/` 路径

`common` 位于应用资源根（编译前 `app.js` 所在目录，见 [真机目录模型](#真机目录模型)）。同样地，只能通过 HML/CSS/JS 静态引用访问，`@system.file` 无法读写。

`common` 通常约定为资源放置位置：
- 页面图片、动画帧放在项目的 `entry/src/main/js/<Ability>/common/` 或其子目录。图片格式、`.bin` 生成、构建前参数文件名和最终资源名转换规则见 [img-converter.md](img-converter.md)。
- HML 和 JS 数据中的媒体路径写为编译后的资源路径，例如 `/common/img/icon.png`。
- CSS 引用使用相对路径 `@import '../../common/style.css'`。
- 公共 JS 代码放在 `common`，从页面使用相对路径导入，例如 `../../common/utils.js`。**不要用 `/common/utils.js` 作为代码导入路径**。
- JS 写媒体资源时应当使用 `/common/...` 绝对路径，因为编译时会把被引用js静态编译进引用js，运行时实际目录是引用js所在目录，而不是被引用js所在目录。
- 不要用 `@system.file` 枚举或读写 `/common/...`，它属于应用资源根而不是沙盒。

固定资源示例：

```hml
<image src="/common/img/icon.png"></image>
```

```javascript
import utils from '../../common/utils.js';
```

## 应用沙盒 `internal://app/` 路径

- **应用沙盒**：给 JS、音乐、图片等静态引用或运行时数据调用，是 `@system.file` API **唯一**能访问的目录。其中 `internal://app/rawfile/` 来自项目原目录的 `resources/rawfile/`；其余区域也可读写（例如 `internal://app/music/`）。
- 应用沙盒 `internal://app/` 是 `@system.file` 唯一可访问的目录（见 [真机目录模型](#真机目录模型)），文件 URI 均以此开头。

### 应用沙盒 `internal://app/rawfile` 路径

`resources/rawfile` 用于需要以文件方式读取的原始数据、音频或其他资源。资源 `internal://app/rawfile/...` 对应源码目录 `resources/rawfile/...`。源码的 `resources/rawfile/` 在真机安装该应用时会释放到 `internal://app/rawfile/`，以供调用。

使用方式：

```text
项目源码: entry/src/main/resources/rawfile/data.json
真机 URI: internal://app/rawfile/data.json
```

```text
项目资源: entry/src/main/resources/rawfile/img/img.png
真机 URI: <image src="internal://app/rawfile/img/img.png"></image>
```

- 使用 `@system.file` 的 `readText`、`list`、`access`、`copy` 等接口访问，见 [system-api.md](system-api.md#systemfile)。
- 由于 `rawfile` 作为资源目录，且只在真机安装此应用时释放一次，为了防止破坏这些数据，**不要原地增删改 `internal://app/rawfile` 内的文件**，而是应当将改动放在 `internal://app/` 或其子目录内。
- 音频的调用方法见 [音频播放](system.md#音频播放)：从 rawfile 复制到指定位置后再交给 `@system.audio` 播放，不能直接播放 rawfile 音频。
- 图片只有在业务明确需要文件接口路径时才放 rawfile。此类图片无法通过 `/common/...` 以普通页面资源形式调用，而是应当通过 `internal://app/` 以沙盒资源形式调用。注意，API版本低于10的真机不支持此方法（见[API 版本](system.md#api-版本)）。
- 不把项目中的 Node 工具、源素材、未使用文件、秘密信息、文档、日志等文件放入 rawfile；它们会泄露到安装包和真机侧资源目录。

## 构建产物路径

开发机上的构建产物（**不是真机目录**，真机目录模型见 [真机目录模型](#真机目录模型)）：

- 表端实际执行输入位于构建产物目录，见 [project-structure.md](project-structure.md#构建产物)。
- 产物检查不要直接编辑构建产物；以构建与评审脚本的构建产物检查为准，见 [project-reviewer.md](project-reviewer.md) 的"构建产物 JS"检查项。

## 文件名规范

- 项目中所有文件的文件名必须使用英文 ASCII。硬性格式：`^[a-zA-Z0-9][a-zA-Z0-9_-]*\.[a-zA-Z0-9]+$`；推荐蛇形命名风格（snake_case），例如 `enemy_01.png`。如果项目已经在使用其他命名风格，则使用统一的命名风格。
- `common`、`rawfile` 内图片路径的子目录也只使用英文字母、数字、`_`、`-`。项目所在的 Windows 上级目录可以是中文，不受此规则影响。
- 文件名、目录名和引用路径大小写完全一致。
- 禁止中文、空格、全角符号、emoji 和其他非 ASCII 图片名称；重命名时同步修改所有 HML、CSS、JS 和配置引用。
- 图片转换器的构建前源文件可临时使用 ASCII 空格分隔 `--topng`、`--nobin`、`--pngquant <number>` 参数；这类文件不得被页面代码引用，且构建后必须产出符合本节规则的无参数最终资源名。完整参数和输出规则见 [img-converter.md](img-converter.md#文件名参数)。
- 任一非法名称都属于发布阻塞项，不能以 Windows 或预览器偶尔能显示为放行依据。

## 选择规则

| 需求                                               | 目录                       | 访问方式                                         |
| -------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| HML/CSS 直接显示的应用内固定图片                   | `js/<Ability>/common`      | 绝对 `/common/...`                               |
| 页面共享 JS                                        | `js/<Ability>/common`      | 相对 `import`                                    |
| 页面共享 CSS                                       | `js/<Ability>/common`      | 相对 `@import`                                   |
| 需要 `@system.file` 读取/枚举的 JSON、文本、二进制 | `resources/rawfile`        | `internal://app/rawfile/...`                     |
| 需要播放的打包音频                                 | `resources/rawfile/audio`  | 首次复制到 `internal://app/...` 后播放           |
| 应用图标等系统资源                                 | `resources/base/media`     | 仅按配置/系统资源规则，不替代页面 `/common` 图片 |
| 运行时生成或用户修改的数据                         | `internal://app/` 可写目录 | `@system.file`，不要写回 rawfile                 |

## 验证要求

按已知实际环境约束处理：部分 DevEco Studio 5.0/API 10 预览器和 Lite Wearable 模拟器不能调用 `@system.file`。因此：

1. `/common/...` 固定资源可先用构建和预览检查路径，但仍要在目标分辨率真机确认显示与图片池。
2. 任何 `internal://app/rawfile/...`、`@system.file`、rawfile 图片或复制流程都必须打包、签名并安装到真机测试。
3. 预览器/模拟器报 file 接口不可用时，不能据此改掉正确的真机实现；记录为环境限制。
4. 预览器/模拟器能够显示界面，也不能写成"rawfile 已验证"。发布结论必须明确列出真机读取、复制、路径、格式和异常恢复结果。
5. 审计 `/common/...` 静态路径是否存在；包含 `{{...}}` 的动态路径无法完全静态解析，必须遍历所有运行时组合并真机验证。
6. 审计所有打包图片的英文 ASCII 文件名和资源子目录；任一非法名称都属于发布阻塞项。

"部分 DevEco Studio 5.0/API 10 预览器与模拟器不支持 file 接口"来自社区真机开发经验，应作为对应目标工具链的硬验证限制；若换用其他 SDK/模拟器版本，重新实测后再更新结论。

## 相关主题

- 目录结构与 config.json：[project-structure.md](project-structure.md)
- `@system.file` 等文件接口参数：[system-api.md](system-api.md)
- 音频复制与播放流程：[system.md](system.md#音频播放)
- 编译、签名与真机验证：[build-sign.md](build-sign.md)
- 只读评审脚本的资源检查项：[project-reviewer.md](project-reviewer.md) 的"资源布局与路径"
- Lite 图片格式、`.bin`、SVG 和图片构建参数：[img-converter.md](img-converter.md)
