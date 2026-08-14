# 真机系统（system）

> 设备侧资源与能力受限：JS heap 按档位分（不到 1M 级别），API 版本与 WearEngine 版本决定可用特性，图片池、音频播放与权限请求需按约束处理。模拟器与预览器不能证明真实传感器、文件接口、音频解码、图片释放或内存上限。

## 目录

- [真机系统（system）](#真机系统system)
  - [目录](#目录)
  - [JS heap 档位](#js-heap-档位)
  - [API 版本](#api-版本)
  - [WearEngine 版本](#wearengine-版本)
  - [图片池](#图片池)
  - [音频播放](#音频播放)
  - [权限请求](#权限请求)
  - [验证约束](#验证约束)
  - [相关主题](#相关主题)

## JS heap 档位

JS heap 按 64 / 256 / 512 KB 档位划分。**型号相似不代表 heap 相同**，例如 GT3 与 GT3 Pro 已出现 256/512 KB 差异；目标型号未知时按 64 KB 基线实现。

| 系列/型号 | 原表 JS heap | 处理方式 |
|---|---:|---|
| GT2 42mm、GT2 46mm、GT2e、GT2Pro、GT2ProECG、GS3、GSPro | 64 KB | 最低档，禁止常驻大型数据；作为跨代兼容默认基线 |
| GT3 42mm、GT3 46mm | 256 KB | 中档，仍需分片与有限缓存 |
| GT3 Pro 43mm、GT3 Pro 46mm | 512 KB | 高档，但不可假设所有 GT3 都为 512 KB |
| FIT3、FIT2 | 512 KB | 高档；仍需真机确认固件差异 |
| 较新 GT4/GT5/GT6、Runner2、Ultimate2、FIT4/D2 等 | 常见为 512 KB | 新推出的型号/固件未逐项证实，通常不小于 512KB，但需要真机验证 |

对应档位的常驻数据上限、峰值管理与清理规则见 [js-syntax.md](js-syntax.md#内存约束)。设备档案字段见 [hardware.md](hardware.md#设备档案)。

## API 版本

**"设备返回的 API 版本""最高 target""最高 compatible"不是同一字段，不能互相替代。**

- 最高 target：构建目标（`compileSdkVersion`），决定编译时可用的 API。
- 最高 compatible：兼容的最低 SDK（`compatibleSdkVersion`），决定可在哪些设备运行。
- 运行时可查询的 API 版本：`deviceInfo` 等返回的观察值。

社区实测观察值（带 `?` 表示来源未确认，见 [hardware.md](hardware.md#硬件不确定性)）：

- GT2 系列：最高 target 常见为 API 6，compatible 常见为 API 3；GS3/GSPro 字段带不确定标记。
- GT3 系列：target/compatible 多为 API 7（带 `?`），`deviceInfo` 可能为 API 6（带 `?`）。
- GT4/GT5/GT6、FIT3/FIT4、D2 等较新设备：target/compatible 多为 API 10+，`deviceInfo` 观察值跨 API 11、12、20、21。
- FIT2、D 等较旧方表：target/compatible 多为 API 7（带 `?`）。

接口的 `@since`/`@deprecated`/`@syscap` 核对见 [build-sign.md](build-sign.md#sdk-api-兼容性核对)。

## WearEngine 版本

WearEngine 版本决定设备侧可用特性，记录在设备档案中（见 [hardware.md](hardware.md#设备档案)）。固件升级可能改变 `deviceInfo` 返回值、接口行为或构建目标，但不能假设会扩大物理内存。资料中带 `?` 的字段只能作为待验证信息。

## 图片池

图片解码使用独立内存池，用户经验值约为十几 MB。**该经验不是公开保证，也不表示可以无限预加载**。

- 以解码尺寸估算：`宽 * 高 * 4` 字节/张（RGBA 近似值），不能只看 PNG/JPEG 压缩大小。
- 将素材预缩放到目标显示尺寸；不要依赖真机端对超大原图缩放；真机端对小图片缩放是允许且内存友好的，但是要注意可能导致的模糊问题。
- 限制同屏、隐藏层、动画帧、预加载和缓存中的并发解码图片数。更新图片时避免旧图和新图长期同时保留。
- 对长期换图页面，在实机验证普通赋值是否释放图片；若不会释放，保存最小状态并使用页面替换/重建作为受控回收手段。
- 不用图片池较大来放宽 JS heap 约束；图片路径、帧表、元数据和绑定对象仍占 JS heap。

单张解码估算参考：

| 尺寸 | 近似解码占用 |
|---:|---:|
| 466x466 | 0.83 MiB |
| 454x454 | 0.79 MiB |
| 408x480 | 0.75 MiB |
| 390x390 | 0.58 MiB |
| 336x396 | 0.51 MiB |
| 336x306 | 0.39 MiB |

真实值会受像素格式、对齐、缩放副本和引擎缓存影响。动画帧、遮罩、背景、CG、角色立绘和离屏图片要合并计算最大并发数。相关分辨率见 [hardware.md](hardware.md#屏幕与适配分辨率)。

## 音频播放

音频必须**先复制到可写位置再播放**：

```text
编译前路径: resources/rawfile/audio/music/bgm.mp3
编译后路径: internal://app/rawfile/audio/music/bgm.mp3
复制后播放: internal://app/music/bgm.mp3
```

首次启动流程：

1. 用 `file.access` 检查复制完成标记或目标文件。
2. 用 `file.list` 遍历 `internal://app/rawfile/audio`。
3. 用 `file.mkdir` 创建目标目录。
4. 逐个、顺序调用 `file.copy`，等待 `success/fail/complete` 后再处理下一项，避免并发回调占用 heap。
5. 只有全部文件复制成功并用 `file.access` 验证关键 MP3、`playList`、`cur_playlist` 后，才写完成标记或清理源目录。
6. 任一复制失败时保留可重试状态，不进入播放页，不把"目录不存在"直接等同于"复制成功"。

播放与切换：

- 导入 `audio from '@system.audio'`，接口要点见 [system-api.md](system-api.md) 的 @system.audio 章节。
- 将 `audio.volume` 限制为 `0.0` 到 `1.0`；UI 的 0–100 值除以 100。
- 播放前执行 `audio.stop()`，再设置 `audio.src = 'internal://app/music/name.mp3'`，最后 `audio.play()`。
- 按单活动音源处理：BGM 与音效不并发——停止 BGM、播放音效、依据已知时长加少量余量后恢复 BGM。
- 缓存音效开关和音量；不要每次短音效都读取存储。新音效到来时先清理旧的 BGM 恢复定时器。
- 在页面 `onDestroy` 和应用 `onDestroy` 中停止音频；同时清除恢复定时器、动画同步定时器并恢复屏幕常亮设置。退出、右滑、路由替换和异常路径都执行同一幂等清理函数。

低开销实现骨架：

```javascript
import audio from '@system.audio';

function stopAudio() {
  try {
    audio.stop();
  } catch (error) {
    console.error('audio.stop failed: ' + error);
  }
}

function playFile(path, volume) {
  stopAudio();
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.src = path;
  audio.play();
}
```

```javascript
export default {
  data: {
    restoreTimer: null
  },
  onShow: function() {
    playFile('internal://app/music/bgm.mp3', 0.5);
  },
  onDestroy: function() {
    if (this.restoreTimer) {
      clearTimeout(this.restoreTimer);
      this.restoreTimer = null;
    }
    stopAudio();
  }
};
```

文档允许在 `.js` 源码中使用箭头函数和 `const/let`，但音频流程异步回调较多，普通函数可减少对旧构建链和 helper 的依赖。Promise 与 `async/await` 不在 Lite ES6 语法白名单中，不要用于此流程。

格式与资源控制：

- 优先真实 MP3。文件扩展名不能代替编码格式验证。MP3 文件头接受 `49 44 33`（ID3）或有效 MPEG 帧同步 `FF Ex`；出现 `ftyp` 通常是 M4A/MP4，必须转码。WAV 体积大；OGG 仅在目标真机验证后使用。不要把改后缀的 AAC/M4A 当 MP3。
- 社区经验上限：128/192 kbps、单文件不超过 5 MB、总音频资源不超过 50 MB；这些是经验上限，不是所有型号保证。对低存储设备采用更保守预算。
- 音频文件列表 `playList` 采用 `文件名,启用标志,保留字段,时长秒;`，例如 `bgm.mp3,1,0,120;click.mp3,1,0,1;`。`cur_playlist` 内容为 `playList`。保持文件名大小写与真实文件一致。
- `rawfile/audio/get.js` 依赖 Node `fs` 和 `audio-loader`，只能在电脑上生成播放列表；绝不能在 JerryScript 表端导入或执行，发布包不需要时移出 rawfile。

验证矩阵：完全卸载后的首次安装（复制进度、目录创建、文件校验和首次播放）；第二次及后续启动（不重复复制、不误删、不跳过失败恢复）；真 MP3、伪 MP3、文件缺失、空间不足和复制中断；BGM 播放、连续短音效、快速切页、退出时播放、应用销毁；音量 0、0.5、1，以及越界 UI 输入的钳制；动画同步（动画时长、音效时长和恢复定时器一致；销毁后不再触发）；最低 API/heap 真机。模拟器只能验证流程和 UI，不能证明解码器、音频焦点或退出清理。

## 权限请求

- 使用 `@system.audio` 时在 `config.json` 配置 `ohos.permission.MODIFY_AUDIO_SETTINGS`：

```json
"reqPermissions": [
  {
    "reason": "访问音频功能",
    "usedScene": { "when": "always" },
    "name": "ohos.permission.MODIFY_AUDIO_SETTINGS"
  }
]
```

- 音量限制为 `0.0` 到 `1.0`。
- 其他接口所需权限在 [build-sign.md](build-sign.md#sdk-api-兼容性核对) 按接口核对。

## 验证约束

- **模拟器不证明真实传感器、功耗、文件系统差异、图片释放或内存上限**。
- 接口文档明确"仅支持真机调试"时，必须将真机结果列为发布阻塞项。
- 部分 DevEco Studio 5.0/API 10 预览器和 Lite Wearable 模拟器不能调用 `@system.file`；任何 file/rawfile、图片、音频流程都必须打包签名后上真机验证。
- 验证分层与输出要求见 [build-sign.md](build-sign.md#验证分层)。

## 相关主题

- 设备型号、分辨率与硬件能力：[hardware.md](hardware.md)
- JS heap 使用细则与清理：[js-syntax.md](js-syntax.md#内存约束)
- `@system.*` 接口签名与权限核对：[system-api.md](system-api.md)
- 文件复制与路径规范：[file-system.md](file-system.md)
- 签名真机验证流程：[build-sign.md](build-sign.md)
