# ViewModel 与样式特性（viewmodel-style）

> 页面遵循 MVVM ViewModel 模式，用 HML 模板（数据绑定、条件与列表渲染）配合组件白名单与 CSS 样式构建界面。轻量穿戴**没有响应式系统**，状态需手动管理；HML 不是 HTML，标签/属性/事件/父子结构按 Lite SDK 白名单检查。

## 目录

- [ViewModel 与样式特性（viewmodel-style）](#viewmodel-与样式特性viewmodel-style)
  - [目录](#目录)
  - [MVVM ViewModel 模式](#mvvm-viewmodel-模式)
  - [页面结构与生命周期](#页面结构与生命周期)
  - [HML 模板](#hml-模板)
  - [组件白名单](#组件白名单)
  - [公共属性与渲染指令](#公共属性与渲染指令)
  - [标签专属属性](#标签专属属性)
  - [事件写法](#事件写法)
  - [父子结构](#父子结构)
  - [HML 表达式](#hml-表达式)
  - [限制](#限制)
  - [CSS 样式特性](#css-样式特性)
    - [文本渲染限制](#文本渲染限制)
  - [AI 生成规则](#ai-生成规则)
  - [相关主题](#相关主题)

## MVVM ViewModel 模式

- 每个页面是一个文件夹，`<page>.hml` / `<page>.js` / `<page>.css` 强绑定（目录结构见 [project-structure.md](project-structure.md)）。
- 页面 `.js` 导出一个 ViewModel 对象：`data` 声明数据，方法处理交互。
- **没有响应式系统**：动态绑定不是深监听，不能解构，表达式不能太复杂。状态更新靠方法显式修改 `this` 上的键。
- `this.data` 中的键值会在 `onInit` 之后、`onShow` 之前被系统放入 `this`，并在 `onHide` 之后、`onDestroy` 之前销毁。即 `data` 中的键可直接以 `this.xxx` 访问（无需 `this.data.xxx`）。
- **HML 动态绑定默认访问 `this`**：`{{xxx}}`、`{{func()}}` 等绑定（内容、属性、事件参数）默认从 `this` 上读取同名键或调用同名方法，如 `{{count}}` 等价于 `this.count`、`{{func()}}` 等价于 `this.func()`。
- 页面 ≠ 单例：每次 `router.replace` 都是新 JS 实例，每次 `import` 也是新 JS 实例，返回并不保证复用。

```javascript
export default {
  data: {
    count: 0
  },
  onClick() {
    this.count++;
  }
}
```

## 页面结构与生命周期

- 应用启动后默认进入 `pages/index/index`。`router.replace({ uri: '/' })` 同样回到这个首页（见 [config.json](project-structure.md#configjson) 与 [system-api.md](system-api.md#systemrouter)）。

生命周期顺序：`onInit` → `onShow` →（交互）→ `onHide` → `onDestroy`。

```javascript
export default {
  data: { count: 0 },
  onInit() { console.info('onInit'); },
  onShow() { console.info('onShow'); },
  onHide() { console.info('onHide'); },
  onDestroy() { console.info('onDestroy'); }
}
```

在 `onDestroy` 中清除所有定时器、动画、订阅、传感器监听、媒体对象和大引用，见 [js-syntax.md](js-syntax.md#生命周期清理)。

## HML 模板

HML 是声明式 UI 描述，采用 Mustache 语法进行数据绑定：

- 内容绑定：`<text>{{message}}</text>`
- 属性绑定：`<image src="{{iconPath}}"></image>`
- 简单运算：`{{flag ? 'on' : 'off'}}` 或 `{{value + 1}}`
- 循环控制：`<div for="{{list}}"><text>{{$item.name}}</text></div>`
- 条件渲染：`<text if="{{bool}}">Visible</text>`

```hml
<div class="root">
  <text>{{title}}</text>
  <list>
    <list-item for="{{items}}">
      <text>{{$item.name}}</text>
    </list-item>
  </list>
</div>
```

- **有且仅有 flex 布局和堆叠布局**（仅 `<stack>` 支持堆叠布局）。
- `<text>` 是唯一会自动计算高度的元素；文本只能写在 `<text>` 内，不能直接写在 `<div>` 里。
- `if=false`（不是 `display:none`）节点不显示，且不进行节点构建，其内部节点不占用内存。
- `show=false`（不是 `display:none`）节点不显示，但进行构建，会占用内存。

## 组件白名单

仅以下标签属于当前 SDK 的 Lite Wearable 内置白名单（约 23 个）：

```text
div canvas stack qrcode list list-item swiper tabs tab-bar tab-content
image-animator image img progress text marquee analog-clock clock-hand
chart input slider switch picker-view
```

不要生成 Web 标签，如 `button`、`span`、`p`、`section`、`video`、`audio`、`svg`。Lite 按钮使用 `<input type="button">` 或 `<div>`。没有 `<button>` 组件。

白名单依据 SDK 中的 `ace-loader/lib/templater/lite_component_map.js`（SDK 位置见 [SDK 定位](build-sign.md#sdk-定位)）与同目录 `component_validator.js`。若 SDK 版本不同，先读取该 SDK 的同名文件。自定义组件标签需在项目中找到真实定义和注册，不能因"像组件名"就放行。

## 公共属性与渲染指令

所有内置标签可用：

```text
id style class ref if elif else for tid show
```

也允许 `data-*`。约束如下：

- Lite 不支持 `class="{{...}}"` 动态绑定。使用固定类名，或在可验证范围内绑定具体 `style` 属性。
- 同一元素**禁止同时设置 `if` 和 `for`**。
- `if`、`elif`、`else` 必须是同一父节点下连续的兄弟节点；`elif`/`else` 不得脱离前序条件节点。
- `if`、`elif`、`show` 使用布尔值或 `{{...}}`；`if=false` 不构建节点，`show=false` 仍构建 VDOM。
- `for` 支持 `for="{{array}}"`、`for="{{value in array}}"`、`for="{{(index, value) in array}}"`，也支持文档中的不带花括号形式。
- `tid="id"` 是数组元素唯一字段名，**不支持表达式**。每个元素必须存在该字段并保持唯一。
- 页面 `data` 属性名不能以 `$` 或 `_` 开头，不要使用保留名 `for`、`if`、`show`、`tid`。

## 标签专属属性

除公共属性和 `data-*` 外，当前 SDK 白名单如下：

| 标签 | 专属属性与限制 |
|---|---|
| `qrcode` | 必需 `value`；`type=rect\|circle` |
| `swiper` | `index` 数字；`loop=true\|false`；`duration` 数字；`vertical=false\|true` |
| `tab-bar` | `mode=fixed` |
| `image-animator` | 必需 `images`、`duration`；`iteration`；`reverse=false\|true`；`fixedsize=true\|false`；`fillmode=none\|forwards` |
| `image` / `img` | `src` |
| `progress` | `type=horizontal\|arc`；`percent` 数字 |
| `text` | `type=text\|html`；`value` |
| `marquee` | `scrollamount` 数字 |
| `analog-clock` | `hour`、`min`、`sec` 数字 |
| `clock-hand` | `type=hour\|min\|sec`；`src` |
| `chart` | `type=line\|bar`；`datasets`；`options` |
| `input` | `checked=true\|false`；`type=button\|checkbox\|password\|radio\|text`；`name`、`value`、`placeholder`；`maxlength` 数字 |
| `slider` | `min`、`max`、`value` 数字 |
| `switch` | `checked=true\|false` |
| `picker-view` | `type=text\|time`；`range`；`selected` |

`div`、`canvas`、`stack`、`list`、`list-item`、`tabs`、`tab-content` 没有额外 HML 属性白名单。样式必须放在 `class`/`style` 或样式文件中，不能把浏览器属性猜测为可用。

## 事件写法

公共事件：

```text
click longpress touchstart touchmove touchcancel touchend key swipe
```

专属事件：

- `list`: `scrollend`
- `swiper`: `change`
- `tabs`: `change`
- `image-animator`: `stop`
- `input`: `change`
- `slider`: `change`
- `switch`: `change`
- `qrcode`: 仅 `click`、`longpress`、`swipe`
- `picker-view`: 仅 `change`

绑定形式包括 `@click`、`onclick`、`on:click`、`grab:click`，以及 SDK 接受的 `.bubble`/`.capture` 修饰。回调名和传参必须使用 HML 表达式可接受的 ES5 形式，不能在属性中写箭头函数。

事件冒泡机制**从 API 5 开始**；面向更低 API 时不得依赖它。`@click`、`onclick` 属于旧写法，按事件冒泡进行处理。为了避免业务逻辑错误，建议将旧写法（如 `onclick`）改成新写法（`grab:click`）。

```hml
<div on:click="onTap" on:longpress="onHold"></div>
<div on:click="{{onClick(0)}}"></div>
```

## 父子结构

- 页面根元素必须且只能是 `div` 或 `stack`。
- `list` 的直接组件子节点只能是 `list-item`；`list-item` 的直接父节点必须是 `list`。
- `swiper` 不支持包含 `list`。
- `tabs` 的直接组件子节点只能是 `tab-bar`、`tab-content`。
- `tab-bar` 的直接组件子节点只能是 `text`，且直接父节点必须是 `tabs`。
- `tab-content` 的直接组件子节点只能是 `div`、`stack`，且直接父节点必须是 `tabs`。
- `clock-hand` 的直接父节点必须是 `analog-clock`。
- `list-item`、带 `if`、带 `for` 或带 `else` 的组件不能作为页面根节点。
- 原子组件不能包含组件子节点。`text` 只承载文本内容；不要在其中嵌套其他组件。

## HML 表达式

开发文档明确规定：**HML 中的 JS 表达式不支持 ES6**。即使页面 `.js` 文件支持部分 ES6（见 [js-syntax.md](js-syntax.md#允许的-es6-子集)），也不能在 `{{...}}`、事件参数、`if`、`show`、属性绑定中使用：

- 箭头函数、`let`/`const`、`class`
- 模板字符串
- 解构、默认参数、剩余参数、展开语法
- `for...of`、模块声明
- `async/await`、生成器
- 可选链、空值合并、动态 `import()`

保持表达式短小：属性读取、数组索引、基础算术/比较/逻辑运算和简单方法调用。复杂计算、数组转换、格式化和容错逻辑放到 `.js` 方法或预先计算的 `data` 字段中。

```html
<!-- 允许 -->
<text if="{{visible}}">{{items[index].name}}</text>
<input type="button" value="放大" on:click="multiply(2)"></input>

<!-- 禁止：箭头函数和模板字符串都属于 HML 中的 ES6 -->
<text>{{items.map(item => `${item.name}`).join(',')}}</text>
```

## 限制

- 不支持动态 `class` 绑定；使用固定类名或具体 `style` 属性。
- `if` 与 `for` 同元素禁止。
- `tid` 不支持表达式。
- 数据绑定不是响应式深监听，不能解构，表达式不能太复杂。
- 有效绑定示例：`{{count}}`、`{{user.name}}`、`{{$item.value}}`、`{{count + 1}}`、`{{func()}}`、`{{value1 ? value2 : value3}}`、`{{value1 === "value"}}`。
- 无效绑定示例：`{{new Number()}}`、`{{Math.random()}}`。

## CSS 样式特性

- 仅支持 `.class` 选择器和 `#id` 选择器。
- 单位仅支持 `px` 和百分比（如 `50%`）。
- 不支持自动宽度/高度：未设置的 `height` 和 `width` 默认为 0，对除 `<text>` 以外的所有元素都是如此。
- 未设置的 `background-color` 默认为黑色。
- 仅支持 `top` 和 `left`，不支持 `bottom` 和 `right`。
- 不支持 `gap`、`align-self`、`position`
- `<stack>` 只能使用堆叠布局，其他元素只能使用 flex 布局。
- 除 `<input>` 元素外，其他所有元素不支持 `background-image`。`background-image` 使用方法：`url(/xxx)`，`url("/xxx")`，`url(internal://app/xxx)` 或 `url("internal://app/xxx")`，URI 规则见 [应用资源 `/` 路径](file-system.md#应用资源--路径) 和 [## 应用沙盒 `internal://app/` 路径](file-system.md#应用沙盒-internalapp-路径)。
- 不支持 `border`、`background` 的聚合写法，需拆开单独写 `border-width`、`border-color`。
- 不支持 `calc()`。
- 布局配合固定基准尺寸 + 百分比，圆屏/方屏分支要显式、有限并可测试，见 [hardware.md](hardware.md#屏幕适配)。

```css
.root {
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

### 文本渲染限制

- 只能在 `<text>` 元素内。
- `<text>` 是唯一自动计算高度的元素。
- 未设置宽度默认一行。
- 字体/元素宽高不可获取，文字布局要手动计算。
- 在 API<10 版本，`font-size` 支持最好的是 `30px` 和 `36px`，其余支持有限。
- 在 API≥10 版本，`font-size` 广泛支持；emoji 支持有限。

## AI 生成规则

1. 先从本页白名单选择标签，再查专属属性和事件；不确定即停止猜测并查当前 SDK。
2. 生成后运行只读评审脚本，再以 DevEco 的真实编译错误为准修正，见 [project-reviewer.md](project-reviewer.md)。
3. 审计脚本的未知标签可能是自定义组件；只有找到组件实现和注册后才能确认。
4. 不通过删除事件前缀、改成 Web 标签或把逻辑塞进内联表达式来绕过编译器。
5. 对 SDK 版本差异、事件语义和自定义扩展明确标为待构建/真机验证。

## 相关主题

- JS 语法环境与 HML 表达式限制的依据：[js-syntax.md](js-syntax.md#三个语法环境)
- 屏幕适配与分辨率：[hardware.md](hardware.md#屏幕适配)
- 页面目录与 config.json 注册：[project-structure.md](project-structure.md)
- 生命周期内的资源清理：[js-syntax.md](js-syntax.md#生命周期清理)
- 评审脚本的 HML 检查项：[project-reviewer.md](project-reviewer.md) 的"HML Lite 白名单"
