# JS 特性（JerryScript）

> 轻量穿戴的 JavaScript 运行于轻量级引擎 JerryScript（早期版本）。内存只有几十 KB 级 JS Heap，运行时内建能力与桌面浏览器、Node.js 完全不同。本文档区分三个语法环境，明确允许的 ES6 子集、禁止项与内存约束。

## 目录

- [JS 特性（JerryScript）](#js-特性jerryscript)
  - [目录](#目录)
  - [三个语法环境](#三个语法环境)
  - [允许的 ES6 子集](#允许的-es6-子集)
  - [仅在构建和真机证明后使用](#仅在构建和真机证明后使用)
  - [禁止项](#禁止项)
  - [内存约束](#内存约束)
    - [import 与产物大小](#import-与产物大小)
    - [常驻数据上限](#常驻数据上限)
    - [峰值管理](#峰值管理)
    - [生命周期清理](#生命周期清理)
    - [定时器 / 订阅配对](#定时器--订阅配对)
    - [图片池](#图片池)
    - [低内存编码约束](#低内存编码约束)
  - [构建产物检查](#构建产物检查)
  - [示例](#示例)
  - [相关主题](#相关主题)

## 三个语法环境

不要把以下环境混为一谈：

1. 页面 `.js` 源码：由 DevEco 构建链（ace-loader/Babel）处理，开发文档明确允许一部分 ES6。这是"编译前"的输入。
2. `.hml` 中的 `{{...}}` 表达式：明确不支持 ES6，详见 [HML 模板与表达式](viewmodel-style.md#hml-模板)。即使页面 `.js` 支持部分 ES6，也不能在 `{{...}}`、事件参数、`if`、`show`、属性绑定中使用。
3. `loader_out_lite` 构建产物：才是表端实际执行输入，仍需检查最低目标设备的 JerryScript 与内存行为，详见 [构建产物位置](project-structure.md#构建产物) 与 [构建产物检查](#构建产物检查)。

资料依据：官方 Lite Wearable 开发文档的"JS 语法参考"明确列出 Lite Wearable ES6 子集；同一文档的"HML 语法参考"明确写明 HML 中的 JS 表达式不支持 ES6。官方原文需从合法渠道自行获取。

## 允许的 ES6 子集

以下 ES6 源码语法，允许作为编译前项目 `.js` 的语法：

- `let` / `const`
- 箭头函数 `()=>{}`
- `class`
- 默认参数
- 解构赋值 `[a,b,c]=d` `{a,b,c}=d`
- 展开语法、剩余语法：数组、函数调用或对象中的 `...value`
- 可选链 `?.`
- 空值合并 `??`
- 解构绑定模式
- 增强对象初始化器（属性/方法简写、计算属性）
- `for...of`
- 模板字符串
- 静态模块声明：`import` / `export`
- `Function()` 构造器

约束：

- 这些语法属于"允许作为 `.js` 构建输入"，不是"在任何位置、任何固件上无限制使用"。
- 新增代码可以使用，但在 64/256 KB heap、旧 SDK 或跨代兼容任务中，优先选择能减少转译 helper、闭包和临时对象的写法（见 [内存约束](#内存约束)）。
- **不得把这份清单扩张成"完整 ES6 都支持"**。例如 `class` 可用，但公/私有类字段、静态初始化块不在清单内。

## 仅在构建和真机证明后使用

以下不是语法白名单本身，而是运行时内建能力或异步机制。目标 SDK 文档未收录不代表无法使用——编译过程不涉及对这些能力的调用检查，实际可用性以最低目标真机运行表现为准；能编译但真机不支持的仍不可用：

- `Map`、`Set`、`WeakMap`、`WeakSet`
- `Symbol`、`Proxy`、`Reflect`
- 新增的 `Object`、`Array`、`String`、`Number` 方法
- `Uint8Array` 等 TypedArray；接口文档要求时仍需核对 API 与真机
- `eval()`
- `string.replace()`

不要通过大型 polyfill 集补齐缺失能力。单个、小型、已测且内存预算明确的兼容函数才可考虑；表端禁止嵌入通用 polyfill（见 [禁止项](#禁止项)）。

## 禁止项

以下能力目标真机 JerryScript 不支持（而非仅开发文档未收录），默认禁止生成或迁入表端运行代码：

- `async` / `await`
- `Promise`
- 生成器、`function*`、`yield`
- 动态 `import()`
- 正则表达式
- 公/私有类字段、静态初始化块、装饰器
- BigInt 字面量和 BigInt 依赖
- 在表端嵌入 QuickJS、Babel、webpack、解释器或通用运行时
- Node.js 的 `require`、`fs`、`path`、`Buffer`、`process` 或 npm Node 运行库（如 `rawfile/audio/get.js` 一类电脑端生成工具，绝不能在 JerryScript 表端导入或执行）

此外，以下为 Web/DOM/Node 环境能力，轻量穿戴一概没有：`window`/`document`、Web Worker、`SharedArrayBuffer`、`XMLHttpRequest`/`fetch`（网络请用 `@system.fetch`，见 [system-api.md](system-api.md)）。

若项目代码含有上述语法，不得仅因编译成功就接受。先检查它是否被完全转译、是否引入运行时依赖和 helper，再做最低档真机验证；无法证明时改写为[允许的 ES6 子集](#允许的-es6-子集)内的语法。

## 内存约束

JS heap 按 64 / 256 / 512 KB 档位划分，见 [JS heap 档位](system.md#js-heap-档位)。目标型号未知时按 64 KB 基线实现。

把内存评估写成“常驻 + 操作峰值 + 框架/未知余量”，不要只统计源码文件大小。持久状态尽量保持在目标 heap 的较小部分；具体安全比例必须由目标真机压力测试决定。

### import 与产物大小

静态 `import` 的编译行为决定产物 JS 大小与加载成本，必须纳入 heap 与体积预算：

- **控制 import 规模以控制内存**：被嵌入的代码同时占用产物文件大小、加载解析时间和 64 KB 档冷启动峰值，公共工具按实际需要裁剪，避免为单个功能拉入整份模块。
- **本地 JS（相对路径 `import`）**：编译时被引用 JS 会被**静态嵌入引用方**，产物文件大小等于引用方自身加上所有被引用 JS 之和；公共模块被多个页面引用时每个引用方各嵌入一份，页面数量会放大总体积（见 [file-system.md](file-system.md#应用资源-common-路径)）。
- **系统 API（`@system.*`）**：编译期系统模块，只解析不嵌入，不增加产物文件大小（见 [system-api.md](system-api.md#调用方法)）。
- **单个 JS 产物大小上限 48 KB**：编译后单个 JS 文件不能大于 48 KB（见 [import 的编译处理](build-sign.md#import-的编译处理)）。每新增一个 `import` 都会把被引用文件并入当前文件，引用链越长、公共模块越大越容易超限；超限时按功能拆分页面、精简公共模块或减少重复引用，不能依赖动态加载（动态 `import()` 在 [禁止项](#禁止项) 内）。

### 常驻数据上限

- 64 KB 档：只保留当前页面和当前操作所需状态。数据表拆成小文件，按索引读取；禁止大字典和完整历史常驻。
- 256 KB 档：允许小型有限缓存，但必须有明确上限和淘汰点。
- 512 KB 档：仍使用分片和懒加载；额外空间用于功能与峰值余量，不用于引入通用框架。
- 未知档：按 64 KB 实现并标记待真机确认。

不要把完整数据集、大型 JSON、字典、关卡、文章或图片元数据长期放在页面 `data` 或模块顶层。按页、按块、按当前场景从文件/存储读取（文件接口见 [system-api.md](system-api.md)）。

### 峰值管理

重点评审以下瞬时叠加：

- `file.readText` 返回完整字符串后再 `JSON.parse`，同时存在原字符串、对象树和业务副本。
- 字符串反复 `+=`，产生多个中间字符串。
- `JSON.stringify` 同时保留原对象与完整序列化字符串。
- `map/filter/reduce/slice/concat/spread` 产生新数组。
- 页面跳转时旧页面、路由参数和新页面状态同时存活。
- 多个异步请求的回调闭包捕获页面或大型数据。
- 异常路径没有释放计时器、媒体对象、订阅或图片引用。

读取大文本时按分片或拆文件处理；`JSON.parse` 会同时产生源字符串与对象树，必须预留峰值。对高频传感器回调节流，仅更新 UI 所需的最新值（传感器见 [system-api.md](system-api.md)）。对这些路径按最大输入做压力测试，而不是只测空数据。

### 生命周期清理

在页面中集中维护资源句柄，在 `onDestroy` 中清除所有定时器、动画、订阅、传感器监听、媒体对象和大引用：

```javascript
onDestroy: function() {
  if (this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }
  sensor.unsubscribeAccelerometer();
  this.largeData = null;
  this.imageList = [];
}
```

根据实际接口只取消已经成功订阅的能力，并处理重复进入页面。所有 `setInterval`、递归 `setTimeout`、动画、媒体播放和订阅都必须能停止。页面隐藏后仍运行的任务也要停止或证明必要。

### 定时器 / 订阅配对

订阅类接口必须有一一对应的取消路径。传感器默认使用最低可接受频率，不能为了 UI 每帧刷新而使用 `game` 频率。无取消订阅的接口（如 `@system.sensor` 只有 subscribe 没有 unsubscribe）要按页面生命周期重建来受控回收，详见 [system-api.md](system-api.md) 的 @system.sensor 章节。

### 图片池

图片池与 JS heap 分开评估，但两者都必须受控。解码尺寸按 `宽 * 高 * 4` 字节估算，池容量经验值约十几 MB 而非设备保证，详见 [真机系统](system.md#图片池)。不用图片池较大来放宽 JS heap 约束：图片路径、帧表、元数据和绑定对象仍占 JS heap。

### 低内存编码约束

语法可用不代表内存代价合适：

- 高频路径避免链式 `map/filter/reduce`、反复解构大对象、对象复制和大量箭头闭包。
- 模板字符串和字符串拼接都可能产生峰值副本；大文本必须分片。
- `class` 不应催生大对象层次；页面对象和小型模块通常更省。
- `for...of` 的构建产物可能产生迭代 helper；大数组或 64 KB 档优先传统索引循环。
- 默认参数、解构和剩余参数若导致大量 helper，改为显式参数检查和有界数组处理。
- 静态模块按功能拆分，但避免为了风格产生大量微型模块和重复包装。
- 默认使用 `var`、普通函数表达式和传统循环作为新增表端代码风格；优先普通函数、显式参数检查和传统循环，不要为了现代风格牺牲 heap。
- 限制历史、存档、日志、缓存、动画帧数组和待处理任务；复用工作数组/对象，循环中避免创建闭包、正则、临时对象和级联字符串。

## 构建产物检查

构建后检查 `loader_out_lite` 中的 JS 目录（产物位置见 [project-structure.md](project-structure.md#构建产物)），或直接运行只读评审脚本的"构建产物 JS"检查项，见 [project-reviewer.md](project-reviewer.md)。重点确认：

1. 构建产物中没有"禁止项"里的语法。
2. 构建产物没有依赖目标 JerryScript 缺失的 Promise、迭代器或新内建对象。
3. Babel helper 与模块包装没有把代码量和冷启动峰值推过目标 heap。
4. rawfile 中的电脑端工具脚本不会被表端导入或动态执行。
5. 最低 heap/API 真机覆盖所有语法相关分支。

## 示例

`.js` 源码中允许的文档子集：

```javascript
const clamp = (value, min = 0, max = 1) => {
  return Math.max(min, Math.min(max, value));
};

export default {
  data: { volume: 0.5 },
  setVolume(value) {
    this.volume = clamp(value);
  }
};
```

对 64 KB heap 或无法检查构建产物的工程，可采用更保守写法降低转译和闭包风险：

```javascript
function clamp(value, min, max) {
  min = min === undefined ? 0 : min;
  max = max === undefined ? 1 : max;
  return Math.max(min, Math.min(max, value));
}
```

即使 `.js` 中允许箭头函数，HML 仍禁止：

```html
<!-- 错误：HML 表达式不支持 ES6 -->
<text>{{items.map(item => item.name).join(',')}}</text>
```

## 相关主题

- HML 模板、组件白名单与表达式限制：[viewmodel-style.md](viewmodel-style.md)
- JS heap 档位与图片池：[system.md](system.md)
- 轻量穿戴 `@system.*` API：[system-api.md](system-api.md)
- 构建产物位置与目录结构：[project-structure.md](project-structure.md)
- 只读评审脚本与构建产物检查：[project-reviewer.md](project-reviewer.md)
