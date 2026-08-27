# Lite 图片转换器（img-converter）

> Lite 构建使用 ace-loader 的图片转换器扫描构建输出目录中的图片。它可为图片生成表端使用的 `.bin` 位图，并可按文件名参数转为 PNG、跳过 `.bin` 或压缩 PNG。涉及页面图片、图标、图片格式、图片文件名或图片构建失败时，必须先阅读本文，再阅读 [file-system.md](file-system.md)。

## 目录

- [Lite 图片转换器（img-converter）](#lite-图片转换器img-converter)
  - [目录](#目录)
  - [适用范围与调用时机](#适用范围与调用时机)
  - [支持格式](#支持格式)
  - [文件名参数](#文件名参数)
  - [输出规则](#输出规则)
  - [`.bin` 格式与动画限制](#bin-格式与动画限制)
  - [SVG 规则](#svg-规则)
  - [PNG 质量压缩](#png-质量压缩)
  - [文件名与引用规则](#文件名与引用规则)
  - [依赖与环境](#依赖与环境)
  - [构建与验证](#构建与验证)
  - [故障排查](#故障排查)
  - [相关主题](#相关主题)

## 适用范围与调用时机

图片转换器用于 ace-loader 的 Lite 构建配置 `webpack.lite.config.js`。

- 它注册在 Webpack 的 `done` 钩子：每次 Lite 编译完成后运行。
- 它递归扫描构建输出目录，默认是项目 `build/`。
- `ResourcePlugin` 复制到输出目录的图片和经 Webpack `file-loader` 输出到 `build/common/` 的图片都会被扫描。
- 配置环境变量 `iconPath` 时，该目录中的图片也会按相同规则处理。
- 转换器会等待所有图片任务完成后才让本次 Webpack 构建结束；转换、重命名或 PNG 压缩失败均会使构建失败。

不要编辑 `build/` 中的转换结果。图片文件名参数应写在源码资源上，最终结果由每次构建重新生成。

## 支持格式

扫描的后缀不区分大小写：

| 类别 | 后缀 |
| --- | --- |
| 常规位图 | `.png`、`.jpg`、`.jpeg`、`.bmp` |
| 动图/现代位图 | `.gif`、`.webp`、`.avif` |
| 其他位图 | `.tif`、`.tiff`、`.ico` |
| 矢量图 | `.svg` |

不支持的后缀不会由该转换器处理，例如 `.heic`、`.pdf`、`.psd`。不要把未支持格式直接作为 Lite 页面资源；先在素材制作流程中转为受支持格式。

## 文件名参数

参数写在**扩展名前的文件主名中**，参数之间用一个或多个 ASCII 空格分隔。参数顺序不限，所有参数和 `--pngquant` 后面的质量数值都会从最终文件名中移除。

| 参数 | 作用 |
| --- | --- |
| `--topng` | 转换并输出 PNG，用 PNG 替换原始格式文件。 |
| `--nobin` | 不生成 `.bin`。与 `--topng` 独立。 |
| `--pngquant <0-100>` | 仅当最终输出为 PNG 时，以指定质量调用 `pngquant` 压缩 PNG。 |

`--img2bin` 不是参数，也不再参与识别。旧写法 `--img2bin-nobin` 不再兼容，必须迁移为 `--nobin`。

示例：

| 源文件名 | 构建后文件 |
| --- | --- |
| `image1.png` | `image1.png`、`image1.bin` |
| `image2 --nobin.png` | `image2.png` |
| `image3 --nobin --topng.svg` | `image3.png` |
| `image4.svg` | `image4.svg`、`image4.bin` |
| `image5 --topng --pngquant 25.svg` | `image5.png`、`image5.bin` |

无论是否使用参数，清理参数后的主文件名不能为空。例如 `--nobin.png` 是错误文件名，构建会失败。

## 输出规则

默认情况下，转换器保留原文件格式，并为其生成同名 `.bin`：

```text
badge.webp -> badge.webp + badge.bin
logo.svg   -> logo.svg + logo.bin
```

`--nobin` 仅跳过 `.bin`，仍会清理参数并保留或输出主图片：

```text
badge --nobin.webp -> badge.webp
```

`--topng` 总会删除带参数的原始文件并生成 PNG：

```text
logo --topng.svg -> logo.png + logo.bin
```

如果同时有 `--nobin`，只保留 PNG：

```text
logo --nobin --topng.svg -> logo.png
```

页面 HML/CSS/JS 必须引用**构建后的最终名称**，不能引用包含 `--topng`、`--nobin` 或 `--pngquant` 的源文件名。资源引用路径规则见 [file-system.md](file-system.md#应用资源-common-路径)。

## `.bin` 格式与动画限制

`.bin` 从解码后的原始像素数据生成，不依赖最后输出文件的压缩结果。

- 前 4 字节：小端 `uint32`，固定为 `256`。
- 后 4 字节：小端 `uint32`，低 16 位为宽度，高 16 位为高度。
- 后续像素：逐像素 `BGRA`，每像素 4 字节。
- 图片宽高必须能存入 16 位无符号整数；不要使用宽或高超过 `65535` 的素材。
- GIF 和多页 TIFF 只使用第一页，`.bin` 不包含动画帧。
- ICO 取内部面积最大的图像。

`--topng --pngquant` 时，`.bin` 在 `pngquant` 压缩前生成，所以 `.bin` 保持原始解码像素质量，只有最终 PNG 会被有损压缩。

## SVG 规则

SVG 在生成 `.bin` 或使用 `--topng` 时会先栅格化。

- SVG 有有效 `width` 和 `height` 时，按其尺寸栅格化。
- 只给出一个尺寸且有有效 `viewBox` 时，另一边按 `viewBox` 宽高比推算。
- 缺少尺寸且不能推算时，使用浏览器替换元素的默认 CSS 视口 `300x150`。
- 该默认尺寸仅在内存中补入，不修改 SVG 源文件。
- 不要依赖无尺寸 SVG 的 `300x150` 默认值；为表端内存和布局可预测性，应明确写出目标像素宽高。

SVG 滤镜、外部字体、远程图片、脚本和浏览器特有渲染效果不应视为表端可用。必须检查栅格化 PNG 或 `.bin`，并在目标真机确认最终显示。

## PNG 质量压缩

`--pngquant <number>` 的质量值为 `0` 到 `100` 的整数。转换器调用：

```text
pngquant --force --output <png路径> --quality=<q>-<q> <png路径>
```

- 仅最终文件是 `.png` 时执行；例如普通 JPEG 使用 `--pngquant 25` 不会转 PNG，也不会压缩。
- `--topng --pngquant 25` 先从原图生成 PNG 和 `.bin`，再只压缩 PNG。
- `--pngquant` 缺少数值、数值不是整数，或不在 `0-100` 范围内时构建失败。
- `pngquant` 不在 `PATH` 或执行失败时构建失败。安装并确认命令行可执行后再使用该参数。

pngquant 是有损量化。用于色彩简单、尺寸较大的 PNG 前，应在目标屏幕上比较压缩前后边缘、半透明阴影、渐变和文字清晰度。

## 文件名与引用规则

构建前的带参数文件名是**构建指令**，允许包含 ASCII 空格；它们不应直接被 HML、CSS、JS 或 `config.json` 引用。

构建完成后，打入应用包的最终资源名必须符合 [file-system.md](file-system.md#文件名规范)：英文 ASCII，且不含空格、参数串、中文或其他 Unicode 字符。建议把业务名称写成 `snake_case`，参数始终追加在最后：

```text
menu_icon --topng --pngquant 65.svg
```

最终引用为：

```hml
<image src="/common/menu_icon.png"></image>
```

如果构建后最终文件名会与同目录已有资源冲突，先改源文件名消除冲突；不要依赖覆盖顺序。

## 依赖与环境

转换器依赖：

- `sharp`：解码 JPG/PNG/BMP/GIF/WebP/TIFF/AVIF/SVG 并输出 PNG、RGBA 像素。
- `decode-ico`：解析 ICO 并选择最大图像。
- `pngquant`：仅在使用 `--pngquant` 时需要，必须可由构建进程通过 `PATH` 找到。

修改 ace-loader 的依赖后同步更新 `package.json` 和 `package-lock.json`。不要用预览器成功替代构建验证；预览器不会证明 `.bin`、PNG 重命名或 pngquant 输出正确。

## 构建与验证

1. 对涉及的每个源图片检查最终文件名、是否应有 `.bin`，以及 HML/CSS/JS 的引用目标。
2. 执行 Lite 构建，确认日志包含 `ImageCoverterPlugin done`。
3. 检查构建输出中没有遗留参数文件名，也没有错误保留的原格式文件。
4. 对 `--topng` 和 SVG，检查最终 PNG 尺寸；对 `.bin`，检查宽高、文件大小和设备侧显示。
5. 对 `--pngquant`，比较 PNG 压缩前后的视觉质量与文件大小，并确认对应 `.bin` 没有因 PNG 量化被改变。
6. 打包、签名并在目标 Lite Wearable 真机检查连续显示、切图、内存峰值、透明像素和圆屏边缘裁切。

在 Node 17+ 环境运行旧 Webpack 4 可能报 `ERR_OSSL_EVP_UNSUPPORTED`。这是旧 Webpack 与 OpenSSL 3 的兼容性问题，不是图片转换器错误；临时验证可使用：

```bat
node --openssl-legacy-provider ..\..\node_modules\webpack-cli\bin\cli.js --config ..\..\webpack.lite.config.js
```

从 `sample\lite` 目录执行上述命令。正式构建应使用项目既定的 Node/DevEco 版本，不要把兼容开关当作真机验证结论。

## 故障排查

| 现象 | 首先检查 |
| --- | --- |
| 没有生成 `.bin` | 是否设置 `img2bin=false`、是否写了 `--nobin`、文件后缀是否受支持。 |
| 保留了带参数的源文件名 | 参数必须完整写在扩展名前，使用 ASCII 空格，拼写应为 `--topng`、`--nobin`、`--pngquant`。 |
| PNG 没有压缩 | 最终扩展名是否为 `.png`，质量值是否为 `0-100`，以及 `pngquant --version` 是否能执行。 |
| 构建报 PNG 压缩失败 | 检查 `pngquant` 是否在 `PATH`，目标文件是否可写，质量参数是否有效。 |
| SVG 输出尺寸异常 | 检查 `width`、`height`、`viewBox`，不要依赖未定义 SVG 尺寸。 |
| GIF/TIFF 动画丢失 | 这是 `.bin` 单帧格式限制；拆分为静态帧并由页面控制播放。 |
| 图标显示尺寸不符 | ICO 会选择内部最大图像；需要固定尺寸时先输出指定尺寸的 PNG。 |

## 相关主题

- 页面图片目录、最终文件名与资源引用：[file-system.md](file-system.md)
- 图片解码内存、图片池与真机验证：[system.md](system.md)
- 页面结构和公共 `common` 目录：[project-structure.md](project-structure.md)
- 构建、签名和产物验证：[build-sign.md](build-sign.md)
- Lite 构建后的评审流程：[project-reviewer.md](project-reviewer.md)
