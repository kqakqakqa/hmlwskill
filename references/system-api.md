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
- **value 仅字符串**，长度受限（具体不详）；存储内容读取/修改均异步。
- **`set` 空字符串值 = 删除**该 key 的数据项。
- `get` 的 `default` 为 key 不存在时返回默认值；未指定则返回空字符串。
- 异步回调模式，不是 Promise。

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

```javascript
interface AccelerometerData { x: number; y: number; z: number; }
interface HeartRateData { heartRate: number; }

export default class Sensor {
  static subscribeAccelerometer(options: {
    callback: (data: AccelerometerData) => void;
    fail?: (data: string, code: number) => void;
  }): void;

  static subscribeHeartRate(options: {
    callback: (data: HeartRateData) => void;
    fail?: (data: string, code: number) => void;
  }): void;
}
```

要点：

- **只有 `subscribeAccelerometer`/`subscribeHeartRate`，没有取消订阅接口**。订阅类接口必须有一一对应的取消路径；无 unsubscribe 时按页面生命周期重建来受控回收，并在 `onDestroy` 停止回调，见 [定时器 / 订阅配对](js-syntax.md#定时器--订阅配对)。
- 传感器默认使用最低可接受频率，不能为了 UI 每帧刷新而使用 `game` 频率。
- 加速度计返回 x/y/z，心率返回 heartRate。真机才可证明传感器行为，见 [传感器硬件能力](hardware.md#传感器硬件能力)。

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
