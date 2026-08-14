# 轻量穿戴 API（@system.*）（system-api）

> 系统能力通过 `@system.*` 系列模块提供，包括路由、存储、传感器、应用、文件、网络、亮度、电量、设备信息、振动、定位与音频。所有接口均为异步回调模式（无 Promise）。SDK 中收录的接口，签名与调用方法以其 `*.d.ts` 为准；SDK 未收录的接口不能据此认为不支持，实际可用性以真机表现为准。

## 目录

- [轻量穿戴 API（@system.\*）（system-api）](#轻量穿戴-apisystemsystem-api)
  - [目录](#目录)
  - [调用方法](#调用方法)
  - [模块清单](#模块清单)
  - [@system.router](#systemrouter)
  - [@system.storage](#systemstorage)
  - [@system.sensor](#systemsensor)
  - [@system.app](#systemapp)
  - [@system.file](#systemfile)
  - [@system.fetch](#systemfetch)
  - [@system.brightness / @system.battery / @system.device](#systembrightness--systembattery--systemdevice)
  - [@system.vibrator / @system.geolocation](#systemvibrator--systemgeolocation)
  - [@system.audio](#systemaudio)
  - [错误码表](#错误码表)
  - [@system vs @ohos vs @kit](#system-vs-ohos-vs-kit)
  - [相关主题](#相关主题)

## 调用方法

```javascript
import "@system.*"
```

在项目编译时，对 `@system.*` 的 `import` 只做**系统模块解析与绑定**：构建链不把实现嵌入产物 JS，也不增加产物文件大小，运行时由表端 JS 框架按模块名注入系统能力。这与本地 JS 的相对 `import`（编译时被静态嵌入引用方）处理方式不同，详见 [import 与产物大小](js-syntax.md#import-与产物大小) 与 [import 的编译处理](build-sign.md#import-的编译处理)。模块名是约定字符串，不能被重命名或别名替换；目标 SDK 缺失不代表无法使用——编译过程不涉及 API 调用，API 调用在手表真机运行时进行，只要真机 API 支持，即使 SDK 文档未收录也可编写（见 [模块清单](#模块清单)）。

```javascript
requireNative("system.*")
```

`requireNative("system.*")` 与 `import "@system.*"` **等效**：编译过程中，`import "@system.*"` 会被构建链转译成 `requireNative("system.*")` 的调用形式，运行时行为与注入方式完全相同，两种写法可互相替换。编译转译的细节见 [import 的编译处理](build-sign.md#import-的编译处理)。

## 模块清单

| 模块 | 用途 | 关键接口 |
|---|---|---|
| `@system.router` | 页面路由 | `replace` |
| `@system.storage` | 数据存储 | `get`/`set`/`clear`/`delete` |
| `@system.sensor` | 传感器 | `subscribeAccelerometer`/`subscribeHeartRate` |
| `@system.app` | 应用信息 | `getInfo`/`terminate` |
| `@system.file` | 文件系统 | `access`/`list`/`readText`/`writeText` 等（见下） |
| `@system.fetch` | 网络请求 | `fetch` |
| `@system.brightness` | 屏幕亮度 | `getValue`/`setValue` |
| `@system.battery` | 电量 | `getStatus` |
| `@system.device` | 设备信息 | `getInfo` |
| `@system.vibrator` | 振动 | `vibrate` |
| `@system.geolocation` | 定位 | `getLocation` |
| `@system.audio` | 音频 | `src`/`play`/`stop`/`volume` |

设备型号决定的硬件能力与适配分辨率见 [hardware.md](hardware.md)。不存在的模块（如 Web 的 `document`/`XMLHttpRequest`）一律视为不可用。

## @system.router

```javascript
export interface RouterOptions {
  uri: string;      // 目标页面路径
  params?: object;  // 传递参数
}

export default class Router {
  static replace(route: RouterOptions): void;
}
```

要点：

- **只有 `replace()`，没有 `push`/`back`**，不支持动画配置。
- `uri` 支持 `config.json` 中 pages 列表提供的页面绝对路径（如 `/pages/detail/detail`）；**如果 URI 是斜杠 `/`，则显示首页**。首页为 `/pages/index/index`。
- **每次跳转都是新实例**：当前页面在替换后被销毁，目标页面是全新的 JS 实例（页面 ≠ 单例），返回并不保证复用。
- 参数通过目标页面 `data` 同名键注入：`router.replace({ uri: '/pages/detail/detail', params: { id: 123 } })`，目标页面即以传入的参数覆盖 `this.data` 原有或原本没有的数据。

```javascript
import router from '@system.router';

router.replace({
  uri: '/pages/detail/detail',
  params: { id: 123, title: 'Hello' }
});
```

关于 `this.data` 数据注入时机，见 [MVVM ViewModel 模式](viewmodel-style.md#mvvm-viewmodel-模式)。

关于页面结构、顺序、生命周期，见 [页面结构与生命周期](viewmodel-style.md#页面结构与生命周期)。

## @system.storage

```javascript
export default class Storage {
  static get(options: {
    key: string;
    default?: string;
    success?: (data: string) => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static set(options: {
    key: string;
    value: string;
    success?: () => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static clear(options?: {
    success?: () => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static delete(options: {
    key: string;
    success?: () => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;
}
```

要点：

- **key ≤ 32 字符**，不能包含特殊字符如 `\/"*+,:;<=>?[]|\x7F`。
- **value 仅字符串**，当前资料要求小于 128 字节；存储内容读取/修改均异步。
- **`set` 空字符串值 = 删除**该 key 的数据项。
- `get` 的 `default` 为 key 不存在时返回默认值；未指定则返回空字符串。
- 异步回调模式，不是 Promise。
- 不要把令牌、隐私数据或大 JSON 当作普通缓存塞入 storage。

`storage.get` 返回字符串。若存 JSON，先检查长度和版本，再 `try/catch JSON.parse`。注意，同时存在的 JSON 源字符串与对象树会抬高 heap 峰值。

```javascript
import storage from '@system.storage';

storage.get({
  key: 'username',
  default: 'Guest',
  success: function(data) { console.info('Username: ' + data); },
  fail: function(data, code) { console.error('Get failed: ' + code); }
});
```

## @system.sensor

传感器能力从 API 3 起提供；设备方向和陀螺仪从 API 6 起提供；部分接口（罗盘、距离、环境光、设备方向）不支持或暂未支持（表中标 `-`），以真机为准。所有接口都依赖手表实际硬件，必须经过真机测试。

### 接口总表

| 数据 | 订阅/查询 | 取消 | 最低 API | 回调字段 | 权限 | Lite Wearable 说明 |
| --- | --- | --- | ---: | --- | --- | --- |
| 加速度 | `subscribeAccelerometer` | `unsubscribeAccelerometer` | 3 | `x`, `y`, `z` | `ohos.permission.ACCELEROMETER` | 支持取决于硬件；权限在部分工具链中属于系统权限 |
| 罗盘 | `subscribeCompass` | `unsubscribeCompass` | - | `direction` | 无文档化应用权限 | 方向角度；需真机校准和验证 |
| 距离 | `subscribeProximity` | `unsubscribeProximity` | - | `distance` | 无文档化应用权限 | 官方设备差异说明：Lite Wearable 调用无效果，不应依赖 |
| 环境光 | `subscribeLight` | `unsubscribeLight` | - | `intensity` | 无文档化应用权限 | 官方设备差异说明：Lite Wearable 调用无效果，不应依赖 |
| 计步 | `subscribeStepCounter` | `unsubscribeStepCounter` | 3 | `steps` | `ohos.permission.ACTIVITY_MOTION` | 返回重启后累计步数，不是本次会话增量 |
| 气压 | `subscribeBarometer` | `unsubscribeBarometer` | 3 | `pressure` | 无文档化应用权限 | 本地声明与文档对单位存在差异，必须以目标版本和真机校验 |
| 心率 | `subscribeHeartRate` | `unsubscribeHeartRate` | 3 | `heartRate` | `ohos.permission.READ_HEALTH_DATA` | 默认约 5 秒一次；本地 SDK 声明指出 `255` 可表示无效值 |
| 佩戴状态 | `subscribeOnBodyState` | `unsubscribeOnBodyState` | 3 | `value` | 无文档化应用权限 | `true` 表示已佩戴；可结合心率有效性判断 |
| 当前佩戴状态 | `getOnBodyState` | 无 | 3 | `value` | 无文档化应用权限 | 单次异步查询，支持 `complete` |
| 设备方向 | `subscribeDeviceOrientation` | `unsubscribeDeviceOrientation` | - | `alpha`, `beta`, `gamma` | 无文档化应用权限 | 官方设备差异说明：Lite Wearable 调用无效果，不应依赖 |
| 陀螺仪 | `subscribeGyroscope` | `unsubscribeGyroscope` | 6 | `x`, `y`, `z` | `ohos.permission.GYROSCOPE` | 旋转角速度；权限在部分工具链中属于系统权限 |

"无文档化应用权限"只表示当前索引未列出额外权限，不表示任何固件上都无需权限。始终检查目标 SDK 声明和 `config.json`。

### 频率与功耗

只有加速度、设备方向和陀螺仪选项包含 `interval`：

| 值 | 典型间隔 | 用途 | 规则 |
| --- | ---: | --- | --- |
| `normal` | 约 200 ms | 普通交互、低功耗 | 默认首选 |
| `ui` | 约 60 ms | 需要较顺滑的 UI | 先节流 UI 更新再采用 |
| `game` | 约 20 ms | 动作识别或游戏 | 仅在确有算法需求、真机功耗和 heap 通过时使用 |

订阅频率不是渲染频率。传感器可以高频采样，但页面状态更新、日志和图片切换应节流。对 64 KB heap，优先复用模块级数字变量或固定长度环形缓冲区。

### 生命周期范式

```js
import Sensor from '@system.sensor';

let sensing = false;

export default {
  data: {
    ax: 0,
    ay: 0,
    az: 0
  },

  startSensor: function () {
    if (sensing) {
      return;
    }
    sensing = true;
    Sensor.subscribeAccelerometer({
      interval: 'normal',
      success: (ret) => {
        this.ax = ret.x;
        this.ay = ret.y;
        this.az = ret.z;
      },
      fail: (data, code) => {
        sensing = false;
        console.error('accelerometer failed: ' + code + ', ' + data);
      }
    });
  },

  stopSensor: function () {
    if (!sensing) {
      return;
    }
    Sensor.unsubscribeAccelerometer();
    sensing = false;
  },

  onDestroy: function () {
    this.stopSensor();
  }
};
```

箭头函数属于文档列出的 `.js` ES6 子集，并有利于保留页面 `this`；若旧构建链 helper 过重或目标真机不稳定，改为保存 `const page = this` 后使用普通函数。不要在 HML 表达式中使用箭头函数。

同时订阅加速度和陀螺仪时，分别维护状态并分别取消。API 低于 6 时不得调用陀螺仪；不能只给订阅加版本判断而无条件取消。

### 权限和配置

根据使用项在 Lite 模块的 `config.json` 中声明所需权限：

| 能力 | 权限 |
| --- | --- |
| 加速度 | `ohos.permission.ACCELEROMETER` |
| 计步 | `ohos.permission.ACTIVITY_MOTION` |
| 心率 | `ohos.permission.READ_HEALTH_DATA` |
| 陀螺仪 | `ohos.permission.GYROSCOPE` |

部分权限可能是系统权限，第三方应用即使声明也未必获得。构建成功不能证明授权成功；把 `fail` 回调与真机授权结果记录在兼容矩阵中。

### 逐项注意事项

- **加速度与陀螺仪**：`x/y/z` 坐标方向、量纲和设备姿态关系以目标型号实测为准。动作识别用时间窗和阈值时，固定窗口上限；不要无限记录历史样本。旧设备可能只有加速度计。
- **罗盘**：`direction` 是设备朝向角度。磁场干扰、佩戴姿势和校准会影响结果。UI 应容忍短时跳变，不要在每次回调重建整个页面。
- **计步**：`steps` 是累计值。会话步数应保存起始基线并计算非负差值。设备重启或计数器复位后，当前值可能小于基线；此时重置基线，不要产生负步数。
- **心率与佩戴状态**：心率回调默认约 5 秒一次，不适合动画帧驱动。把 `255`、非正数、未佩戴时读数及设备特定哨兵值视为待过滤数据，不直接展示为有效心率。健康数据属于敏感信息，只保留功能必需值，不写入无界日志。
- **气压计**：字段为 `pressure`。当前资料存在 Pa 与 hPa 的单位表述差异，不在代码中硬编码换算结论。在已知海拔/天气条件下观察数量级，并记录设备型号、固件、SDK 文档单位后再决定换算。
- **Lite 无效果接口**：`subscribeProximity`、`subscribeLight`、`subscribeDeviceOrientation` 在现有官方设备差异说明中标为 Lite Wearable 无效果。必须把它们标成不可依赖能力，而不是因为类型声明存在就放行。

## @system.app

```javascript
export interface AppInfo {
  name: string;
  versionName: string;
  versionCode: number;
}

export default class App {
  static getInfo(options: {
    success?: (data: AppInfo) => void;
    fail?: (data: string, code: number) => void;
  }): void;

  static terminate(): void;
}
```

```javascript
import app from '@system.app';

app.getInfo({
  success: function(data) {
    console.info('App name: ' + data.name);
    console.info('Version: ' + data.versionName);
  }
});

app.terminate(); // 终止应用
```

## @system.file

经测试，完整能力包括 `access`, `list`, `readText`, `writeText`, `copy`, `move`, `delete`, `mkdir`, `rmdir`, `get`, `writeArrayBuffer`, `readArrayBuffer`。SDK 中收录的接口以其 `*.d.ts` 为准；SDK 未收录的接口不代表不支持，实际可用性以真机验证为准。

```javascript
export interface FileResponse {
  uri: string;                 // 文件 URI
  length: number;              // 文件大小（字节），type 为 dir 时固定为 0
  lastModifiedTime: number;    // 存储时间戳（毫秒）；轻量穿戴固定为 0
  type: 'dir' | 'file';        // 类型
  subFiles?: Array<FileResponse>; // recursive 为 true 时返回子目录文件信息
}

export default class File {
  static move(options: {
    srcUri: string;            // 源文件 URI
    dstUri: string;            // 目标位置 URI
    success?: (uri: string) => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static copy(options: {
    srcUri: string;
    dstUri: string;
    success?: (uri: string) => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static list(options: {
    uri: string;               // 目录 URI
    success?: (data: { fileList: Array<FileResponse> }) => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static get(options: {
    uri: string;               // 文件 URI，不能是应用资源路径
    recursive?: boolean;       // 是否递归获取子目录文件列表，默认 false
    success?: (file: FileResponse) => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static delete(options: {
    uri: string;               // 待删除文件 URI
    success?: () => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static writeText(options: {
    uri: string;               // 本地文件 URI，不存在则创建
    text: string;              // 要写入的字符串
    encoding?: string;         // 编码格式，默认 UTF-8（仅支持 UTF-8）
    append?: boolean;          // 是否追加模式，默认 false
    success?: () => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static readText(options: {
    uri: string;
    encoding?: string;         // 默认 UTF-8
    position?: number;         // 读取起始位置，默认文件开头
    length?: number;           // 读取长度
    success?: (data: { text: string }) => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static writeArrayBuffer(options: {
    uri: string;
    buffer: Uint8Array;        // 数据源缓冲
    position?: number;         // 写入起始偏移，默认 0
    append?: boolean;          // 追加模式时 position 失效
    success?: () => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static readArrayBuffer(options: {
    uri: string;
    position?: number;
    length?: number;           // 不设置则读取全部内容
    success?: (data: { buffer: Uint8Array }) => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static access(options: {     // 检查文件/目录是否存在
    uri: string;
    success?: () => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static mkdir(options: {
    uri: string;               // 目录 URI，递归创建最多 5 层
    recursive?: boolean;       // 是否递归创建上级目录，默认 false
    success?: () => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;

  static rmdir(options: {
    uri: string;
    recursive?: boolean;       // 是否递归删除子文件/子目录，默认 false
    success?: () => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;
}
```

要点：

- 文件 URI 使用应用沙盒路径：`internal://app/rawfile/...`（只读打包资源）与 `internal://app/...`（可写位置），见 [file-system.md](file-system.md)。
- URI 不能包含特殊字符如 `\/"*+,:;<=>?[]|\x7F`，最长 128 字符。
- rawfile 打包区按只读处理；需要修改时先复制到可写位置再操作。
- `writeText` 的 `uri` 不存在时自动创建文件；`set` 风格无「空串删除」语义，删除请用 `delete`。
- **部分 DevEco Studio 5.0/API 10 预览器和 Lite Wearable 模拟器不能调用 `@system.file`**，任何 file/rawfile 流程必须打包签名后真机验证。
- 大文件读取注意 JS heap 峰值（`readText` 返回完整字符串），见 [峰值管理](js-syntax.md#峰值管理)。

常见错误码：`202` 参数错误、`300` I/O 错误、`301` 文件或目录不存在、`302` 文本读取超过接口限制。设备实现可能增加差异，必须保留 `fail`。

### 文件回调和错误

- 由于异步回调特性，在需要依赖执行顺序时应当在 `success` 或 `complete` 后进入下一步，而不是直接并排调用。并排调用 `mkdir`、`copy`、`readText` 会导致潜在的时序问题。
- `complete` 无论成功失败都会运行，不能在其中假设文件已写入。建议在无论成功失败都需进入下一步的时候使用。
- 删除和递归删除前，需校验 URI 是应用预期的固定前缀。把外部输入直接传给 `delete`/`rmdir` 是极其危险的行为，应当禁止。

### 低内存规则

- `readText` 默认最多按 4096 字节设计；不要先读完整大文件再 `JSON.parse`。
- `readArrayBuffer` 必须给受控 `length`。读取图片、音频等大文件到 JS buffer 会占用 JS heap，与媒体/图片池不是同一预算。
- `file.get({ recursive: true })` 和大目录 `file.list` 会创建对象数组；限制目录文件数，处理后清空引用。
- 日志不要打印完整文本、buffer 或 `JSON.stringify(fileList)`。

```javascript
import file from '@system.file';

// 写入文本（append 追加，uri 不存在时自动创建）
file.writeText({
  uri: 'internal://app/test.txt',
  text: 'hello',
  append: true,
  success: function() { console.info('writeText ok'); },
  fail: function(data, code) { console.error('writeText failed: ' + code); }
});

// 读取文本
file.readText({
  uri: 'internal://app/test.txt',
  success: function(data) { console.info('text: ' + data.text); },
  fail: function(data, code) { console.error('readText failed: ' + code); }
});

// 判断文件/目录是否存在（success 触发 = 存在）
file.access({
  uri: 'internal://app/test.txt',
  success: function() { console.info('exists'); },
  fail: function(data, code) { console.info('not exists'); }
});

// 列出目录内容
file.list({
  uri: 'internal://app/',
  success: function(data) {
    var list = data.fileList;
    for (var i = 0; i < list.length; i++) {
      console.info(list[i].uri + ' (' + list[i].type + ')');
    }
  },
  fail: function(data, code) { console.error('list failed: ' + code); }
});

// 复制 rawfile 打包资源到可写位置后再修改
file.copy({
  srcUri: 'internal://app/rawfile/config.json',
  dstUri: 'internal://app/config.json',
  success: function(uri) { console.info('copy ok: ' + uri); },
  fail: function(data, code) { console.error('copy failed: ' + code); }
});

// 创建目录（recursive 递归创建上级目录）
file.mkdir({
  uri: 'internal://app/cache/sub',
  recursive: true,
  success: function() { console.info('mkdir ok'); }
});

// 删除文件/目录
file.delete({
  uri: 'internal://app/test.txt',
  success: function() { console.info('delete ok'); },
  fail: function(data, code) { console.error('delete failed: ' + code); }
});
```

## @system.fetch

```javascript
export interface FetchResponse {
  data: string;
  code: number;
}

export default class Fetch {
  static fetch(options: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: string;
    header?: object;
    success?: (response: FetchResponse) => void;
    fail?: (data: string, code: number) => void;
  }): void;
}
```

```javascript
import fetch from '@system.fetch';

fetch.fetch({
  url: 'https://api.example.com/data',
  method: 'GET',
  success: function(response) {
    console.info('Response: ' + response.data);
  },
  fail: function(data, code) {
    console.error('Fetch failed: ' + code);
  }
});
```

## @system.brightness / @system.battery / @system.device

```javascript
// @system.brightness
export default class Brightness {
  static getValue(options: {
    success?: (data: { value: number }) => void;
    fail?: (data: string, code: number) => void;
  }): void;

  static setValue(options: {
    value: number;
    success?: () => void;
    fail?: (data: string, code: number) => void;
  }): void;
}

// @system.battery
export default class Battery {
  static getStatus(options: {
    success?: (data: { level: number; charging: boolean }) => void;
    fail?: (data: string, code: number) => void;
  }): void;
}

// @system.device
export interface DeviceInfo {
  brand: string;
  model: string;
  osVersion: string;
  platform: string;
}

export default class Device {
  static getInfo(options: {
    success?: (data: DeviceInfo) => void;
    fail?: (data: string, code: number) => void;
  }): void;
}
```

使用示例：

```javascript
import battery from '@system.battery';
import device from '@system.device';

battery.getStatus({
  success: function(data) {
    console.info('Level: ' + data.level + ', Charging: ' + data.charging);
  }
});

device.getInfo({
  success: function(data) {
    console.info('Brand: ' + data.brand + ', Model: ' + data.model);
  }
});
```

注意：`device.getInfo` 返回的 `osVersion`/API 信息与构建配置的 target/compatible 不是同一字段，见 [API 版本](system.md#api-版本)。

## @system.vibrator / @system.geolocation

```javascript
// @system.vibrator
export default class Vibrator {
  static vibrate(options: {
    mode?: 'short' | 'long';
    success?: () => void;
    fail?: (data: string, code: number) => void;
    complete?: () => void;
  }): void;
}

// @system.geolocation
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export default class Geolocation {
  static getLocation(options: {
    success?: (data: LocationData) => void;
    fail?: (data: string, code: number) => void;
  }): void;
}
```

```javascript
import vibrator from '@system.vibrator';

vibrator.vibrate({ mode: 'short' });
```

`vibrator.vibrate(options)` 从 API 3 起提供，依赖设备马达，只能在真机确认。新 SDK 可能将它标为 API 8 起 deprecated，但 Lite Wearable 旧工程不应在没有 SDK/syscap/真机证据时改用 `@ohos.vibrator` 或 ArkTS kit 导入。

需要在 Lite 模块配置中声明 `ohos.permission.VIBRATE`。部分系统权限或产品策略仍可能阻止第三方应用调用，必须处理 `fail`。

### 振动使用规则

- 用户设置允许关闭振动；不要每次渲染或传感器采样都振动。
- 点击防抖，避免快速连点形成连续马达请求。
- 心率、计步等后台回调不得默认触发振动。
- `short`/`long` 的实际时长、强度、并发调用行为和静音/勿扰模式影响按型号记录。
- API 没有通用的自定义波形、强度或取消能力时，不要伪造这些接口。
- 模拟器最多验证调用路径，不代表硬件振动、权限或功耗结果。

## @system.audio

```text
接口要点：
- src   : 播放源路径（必须是可写位置的文件，见下）
- play  : 开始播放
- stop  : 停止播放
- volume: 音量，范围 0.0 – 1.0
```

要点：

- 使用 `@system.audio` 时在 `config.json` 配置权限 `ohos.permission.MODIFY_AUDIO_SETTINGS`，详见 [真机系统](system.md#权限请求)。
- 音量限制为 `0.0` 到 `1.0`；UI 的 0–100 值除以 100。
- **不能直接播放 `internal://app/rawfile/...` 音频**，必须先复制到 `internal://app/` 可写位置再播放。
- `@system.audio` 按**单活动音源**设计：BGM 与音效不并发，切换音源前先 `audio.stop()`。
- 完整复制流程、播放切换、格式控制与验证矩阵见 [真机系统](system.md#音频播放)。

## 错误码表

| 错误码 | 说明 |
|---|---|
| 0 | 成功 |
| 其他 | 失败 |

回调签名统一为 `fail?: (data: string, code: number) => void`，`code` 非 0 即为失败；具体业务错误码以 SDK 文档为准。

## @system vs @ohos vs @kit

- 优先使用目标设备已验证的 `@system.*` 接口。
- 只有**兼容矩阵与真机共同证明**后，才迁移到 `@ohos.*` 或 `@kit.*`。
- 不得因为接口在新 SDK 中存在就认定旧设备可用；不得把 `Wearable` 支持等同于 `Lite Wearable` 支持。
- 迁移声明必须标注验证状态（已验证 / 资料支持未实测 / 未知），见 [输出要求](build-sign.md#输出要求)。

## 相关主题

- 各模块依赖的设备硬件能力：[hardware.md](hardware.md)
- 文件 URI 与 common/rawfile 路径规范：[file-system.md](file-system.md)
- 音频复制、播放与权限细节：[音频播放](system.md#音频播放)
- API 版本字段与设备档位：[API 版本](system.md#api-版本)
- 异步回调的内存与清理约束：[内存约束](js-syntax.md#内存约束)
