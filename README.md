# 鹈鹕测试 v2 · The Pelican Test (the chase)

> 风把一张画吹走了。鹈鹕骑上自行车去追。
>
> *The wind took a drawing, and something went after it.*

一部 **2 分 17 秒**（137 秒，8220 帧，1920×1080 @ 60 fps）的程序生成短片。
**片中没有一张手绘图，也没有一秒录音**——每一帧画面由代码当场画出，每一个音符由代码实时合成。

这不是 v1。这是在同一套程序化框架上做的**二次创作**：叙事、文本、音乐全部重写，
二十格美术与引擎保留。差异见 [§5 与 v1 的差异](#5-与-v1-的差异)。

---

## 目录

1. [这是什么](#1-这是什么)
2. [怎么跑起来](#2-怎么跑起来)
3. [设计：它是怎么工作的](#3-设计它是怎么工作的)
4. [技术应用](#4-技术应用)
5. [与 v1 的差异](#5-与-v1-的差异)
6. [创新点](#6-创新点)
7. [原作者与致谢](#7-原作者与致谢)
8. [目录结构](#8-目录结构)
9. [版权](#9-版权)

---

## 1. 这是什么

一只白鹈鹕骑着自行车，穿过二十个时代的画。每过一道画框，世界就换一种画法。

**v2 的动机变了**：不再是"穿越美术史"的观光，而是**追逐**——那张被风吹走的画一直飘在它前面，
每穿过一个时代，画就被那个时代重新画一遍，鹈鹕也跟着变。追上之后发现：画上画的，正是它自己。

### 二十个时代

| # | 画风 | 年代 | 这一格里发生了什么 |
|---|---|---|---|
| 1 | 撒哈拉岩画 | 约公元前 4000 年 | 牧人和牛群停下脚步，围观这位骑车的来客 |
| 2 | 埃及壁画 | 约公元前 1300 年 | 一幅还没画完的墓室壁画：鹈鹕摆出标准的埃及侧身姿势 |
| 3 | 汉画像石拓片 | 约公元 100 年 | 混进官员的车马出行队伍，石匠当场刻下「鹈鹕骑者」 |
| 4 | 唐代白描 | 约 750 年 | 吴带当风——羽毛和衣带一起翻飞 |
| 5 | 宋代山水 | 约 1000 年 | 镜头推进千仞高山，才在山路上找到小小的骑车鹈鹕 |
| 6 | 清明上河图 | 约 1100 年 | 骑上虹桥，桥上的路人纷纷回头 |
| 7 | 玛雅抄本 | 约 1200 年 | 旁边有人用玛雅点横数字，记下它踩了多少圈 |
| 8 | 莫卧儿细密画 | 约 1600 年 | 宫廷花园里，宾客从好几个视角同时围观 |
| 9 | 八大山人 | 约 1690 年 | 寥寥几笔，大片留白，鹈鹕翻了一个八大式的白眼 |
| 10 | 爪哇皮影戏 | 约 1800 年 | 变成镂空皮影，车轮一顿一顿地转 |
| 11 | 浮世绘 | 1830 年代 | 富士山下的田间小道，赶路的人都回过头来 |
| 12 | 星月夜 | 1889 年 | 夜空的漩涡跟着车轮一起转 |
| 13 | 呐喊 | 1893 年 | 呐喊者被吓了一跳，鹈鹕吼了回去，然后是尴尬的沉默 |
| 14 | 诺斯费拉图 | 1922 年 | 墙上的影子自己爬上楼梯，离开时"通了电" |
| 15 | 示波器矢量图 | 1950 年代 | 有人转错旋钮，鹈鹕扭成李萨如图形 |
| 16 | 8-bit 像素游戏 | 1980 年代 | 跳过坑洞，吃到金币，弹出 1UP |
| 17 | 早期聊天窗口 | 2000 年代 | 被发成一张 256 色动图，对方连发两次窗口抖动 |
| 18 | 蒸汽波 | 2010 年代 | 世界慢放，大理石像转过头，磁带跳针 |
| 19 | 竖屏短视频 | 2020 年代 | 画面变成竖屏，定格、慢放、点赞爆满 |
| 20 | 代码美学 | 大模型时代 | 一行一行 SVG 代码，把它重新画出来 |

最后二十幅画折成一面 7×3 展墙，第二十一格是一张空着的发布会席位。

---

## 2. 怎么跑起来

需要 **Node 20+**、**Google Chrome**、**ffmpeg** 在 PATH 上。

```bash
npm install
npm run dev        # → http://127.0.0.1:5180/  浏览器里实时渲染整片（带声音）
```

> **也可以作为 npm 包安装**（从 GitHub Packages）：见 [docs/using-as-a-package.md](docs/using-as-a-package.md)。
> 成片不打包在仓库里，请从 [Releases](https://github.com/mengxing123456789/pelican-test/releases) 下载。

### 出成片

```bash
npm run audio      # 合成配乐 → audio/mix.wav（约 5–9 分钟）
npm run render     # 渲染 8220 帧 → frames/（6 个 Chrome 并行，约 10–15 分钟）
npm run encode     # 帧 + 音频 → out/pelican-test_1080p60.mp4
```

> **磁盘预警**：全片 PNG 序列约 **21 GB**（单帧平均 3.1 MB）。先确认可用空间。
> 渲染器在磁盘写满时会把失败帧记成 0 字节却仍返回退出码 0 —— 用 `npm run check:frames` 核验。

### 各平台

| 平台 | 状态 |
|---|---|
| macOS | 原作者的目标平台，原生可跑 |
| Windows | 已适配（本项目改动），实测 RTX 4060 上连续渲染 4.8–5.7 fps |
| Linux | 已适配 Chrome 路径探测，未实测 |

Windows 上做了三处修改，macOS 行为不变：

| 原本（macOS 专有） | Windows / Linux 上的处理 |
|---|---|
| Chrome 路径写死 `/Applications/...` | 按平台探测；`CHROME_PATH` 仍优先 |
| `--use-angle=metal` | Windows 用 `--use-angle=d3d11 --force_high_performance_gpu`；`PT_SOFTWARE_GL=1` 退回 SwiftShader |
| puppeteer 默认 180s `protocolTimeout` | 设为 0（配乐渲染要跑约 285 秒，重场景单帧可达 38 秒） |

---

## 3. 设计：它是怎么工作的

### 3.1 一句话：整部片子是**时间的纯函数**

给出任意时刻 `t`，程序就能算出那一刻的完整画面。同一个 `t` 无论渲染多少次，结果逐字节相同。

这条约束决定了很多事：

- 没有 `Math.random()`、没有 `Date.now()`，随机走 `rngAt(t, salt)`
- 于是可以**多进程并行渲染**：把 8220 帧切成 N 片，各浏览器互不依赖
- 于是断点续渲成立：渲染中断后 `--resume` 跳过已有帧

### 3.2 共享骨架 + 二十种画法

所有时代共用**同一副骨架**（`src/rig/pelican.js`）：鹈鹕的身体、自行车的车架、曲柄、车轮的相位。
每个时代只负责"用自己的画法把同一副骨架画出来"。

这就是为什么鹈鹕跨过画框时前后两半能严丝合缝——它从来没有换过骨架，只是换了画它的人。

### 3.3 时间轴是唯一事实来源

`src/beat/timeline.js` 定义了一切：120 BPM、每小节 2 秒、60 fps、
序幕 0–5 秒、第 *i* 幅画从 `5 + 6(i−1)` 秒开始、尾声 125–137 秒。

**19 个过框点全部落在强拍上**，`npm run check` 会逐个验证。

### 3.4 三层画布

| 层 | 内容 | 为什么分开 |
|---|---|---|
| 底层 2D | 文字、标题、字幕 | p5.brush 会清掉 p5 的 `text()` |
| WEBGL | 所有笔刷绘制的美术 | p5.brush 必须在 WEBGL 画布上工作 |
| 合成 | 上面两层拍平成一张 PNG | 交付给编码器的是单一帧 |

### 3.5 画面如何变成 MP4

```
renderFrame(t) → 合成 PNG → 落盘 f00000.png …
                                    ↓
                        ffmpeg 按序读入 + 音频
                                    ↓
                         H.264 + AAC → MP4
```

帧文件名补零到五位，保证字典序 = 时间序（ffmpeg 的 image2 输入依赖这一点）。

---

## 4. 技术应用

| 技术 | 用在哪 | 为什么是它 |
|---|---|---|
| **p5.js 2.3.4** | 绘图运行时 | 保留了 WEBGL、几何、变换的完整控制 |
| **p5.brush 2.2.3** | 水墨 / 厚涂 / 岩画质感 | 真正的笔刷引擎，能画出飞白、晕染、皴法，而不是滤镜 |
| **Web Audio API** | 全片配乐 | 浏览器内离线渲染，无采样无录音；`OfflineAudioContext` 比实时快约 700 倍 |
| **OfflineAudioContext** | 配乐批量渲染 | 137 秒配乐在浏览器里渲染，不占用音频设备 |
| **puppeteer-core** | 无头浏览器驱动 | 逐帧渲染 + 截帧；多实例并行 |
| **ANGLE / D3D11** | GPU 渲染后端 | Windows 上用独显；SwiftShader 仅作回退 |
| **ffmpeg** | 编码封装 | H.264 + AAC + faststart |
| **确定性 PRNG** | 全部随机 | mulberry32；同一 `t` 永远同一结果 |
| **帧缓冲烘焙** | 重场景优化 | 静态层只画一次，之后每帧只画动的部分 |

### 关键工程决策

**为什么不用 WebCodecs 硬件编码？** 本项目用 PNG 序列 + ffmpeg。理由：无损中间态便于逐帧比对与断点续渲，
且避开了 `VideoFrame` 只能截取单层画布的陷阱（本片有三层）。

**为什么配乐要在浏览器里渲染？** Node 没有 `OfflineAudioContext`。浏览器是唯一能跑 Web Audio 的地方，
所以配乐渲染也是一次 puppeteer 会话。

**为什么烘焙？** p5.brush 实测：20–60 笔约 3–12 ms，但 240 笔要 55–120 ms，400 笔要 140–225 ms。
宋代山水需要约 200 笔皴法——是每帧预算的十倍以上。所以静态层只烘焙一次。

---

## 5. 与 v1 的差异

v1 指已发布的 [RoyceBella-commits/The-Pelican-Test](https://github.com/RoyceBella-commits/The-Pelican-Test)
（B 站 [BV1pLnw6YEzq](https://www.bilibili.com/video/BV1pLnw6YEzq/)，19.7 万播放）。

> v2 所在仓库与 v1 同源：已用配乐互相关验证，v1 音轨与 B 站音轨相关 **0.9995**。

### 改了什么

| 维度 | v1 | v2 |
|---|---|---|
| **叙事动机** | 观光：穿过二十个时代 | **追逐**：风卷走一张画，鹈鹕去追 |
| **片头** | 「人类自古以来就痴迷于画鹈鹕骑自行车」 | 「风把一张画吹走了」/「鹈鹕骑上自行车去追」 |
| **片尾** | 「截至目前，人类共提交了 20 份答卷」 | 「追了二十个时代，那张画终于落下来」/「画上画的，正是它自己」 |
| **主旋律** | 散步调：上一步、停一下、再上一步 | **追逐调**：上行模进，结尾**不落回主音** |
| **画的对象** | 无 | 新增**被追的那张画**，全程可见，逐格换画风 |
| **平台适配** | 仅 macOS | 增加 Windows / Linux |

### 没改什么

二十格美术、骨架、时间轴、拍点、渲染管线、烘焙机制——全部保留。

### 为什么这样改

v1 的旋律是"走路"的节奏，配"观光"成立。但一旦动机变成追逐，散步调就不对了。
所以新主题做了两件事：**连续上行模进**（一直在往上爬，不落地），以及
**结尾停在 A 而不是主音 D**（未解决感）。未解决才会让下一格显得"必须去"。

同理，结尾从"博物馆标签"（像在给观众报数）改成"追上发现是自己"——
把鹈鹕从被展示的对象变成行动的主体。

---

## 6. 创新点

1. **把"画什么"变成叙事对象**。v1 里"画"只是画框，v2 里"那张画"是角色：它有独立动机、
   有自己的音乐（轻快的回旋音型，与鹈鹕的上行动机区分），并且**逐格被不同时代重画**。

2. **用音乐结构承担叙事**。不靠旁白解释追逐，而用"上行不落地 + 不落主音"制造未完成感。

3. **结尾反转**。追了二十个时代的东西是自己的画像——把"美术史如何描绘我们"这个主题收在一句话里。

4. **程序化美术的跨时代一致性**。同一副骨架被二十种画法重绘，靠共享 rig 保证跨画框严丝合缝。

5. **完全确定性渲染**。整片是时间的纯函数，可并行、可断点、可逐字节复现。

---

## 7. 原作者与致谢

### 本仓库的基础

本项目**基于 [RoyceBella-commits/The-Pelican-Test](https://github.com/RoyceBella-commits/The-Pelican-Test)**——
即 v1 的源码，也是 B 站那支 19.7 万播放视频的来源。二十格美术、骨架、时间轴、渲染管线均出自该仓库。
v2 的改动范围见 [§5](#5-与-v1-的差异)。

**该仓库的原始版权声明**：代码 MIT，影片及其画面、音频 © 2026 Royce Bella 保留所有权利。
本仓库保留这些声明（见 [LICENSE](LICENSE) 与 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)）。

### v1 的方法论来源

v1 的工作方式参考了 **Tunai-0511** 的开源项目
**[meme67-art-history](https://github.com/Tunai-0511/meme67-art-history)**（代码 MIT）：
"共享绘图工具包 + 每幅画一个场景文件 + 按时间逐帧渲染 + 无头浏览器截帧 + 接触表自查"。

v1 与 v2 均**未使用**该项目的任何代码、画面、构图或笑点。

### 第三方库

| 组件 | 协议 | 说明 |
|---|---|---|
| [p5.js](https://p5js.org) 2.3.4 | **LGPL-2.1** | 动态加载，未修改 |
| [p5.brush](https://github.com/acamposuribe/p5.brush) 2.2.3 | MIT | © Alejandro Campos Uribe |
| simplex-noise | MIT | © Jonas Wagner（p5.brush 依赖） |
| puppeteer-core 25.x | Apache-2.0 | 开发依赖，未分发 |
| ffmpeg | LGPL/GPL | 未分发，调用本机安装 |

完整说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

---

## 8. 目录结构

```
├── film.html              预览页入口（浏览器实时渲染整片）
├── index.html             项目首页
├── package.json           依赖与脚本
├── README.md              本文件
├── PROVENANCE.md          版本关系与证据（v1 / v2 / 本地另一实现）
├── THIRD_PARTY_NOTICES.md 第三方库与致敬声明
│
├── src/
│   ├── beat/              ⏱ 时间轴：节拍、几何、骑行关键帧（唯一事实来源）
│   ├── kit/               🖌 绘图工具包：笔刷封装、烘焙缓存、文字、纸张材质、数学
│   ├── rig/               🦤 鹈鹕与自行车的参数化骨架（二十种画法共用）
│   ├── scenes/            🖼 二十个时代，一格一个文件 + 清单
│   └── main/
│       ├── film.js        逐帧合成器（画面 = 时间的函数）
│       ├── paper.js       ★ v2 新增：被追的那张画
│       ├── camera.js      镜头运动
│       ├── intro.js       序幕（v2 已改写文本）
│       ├── outro.js       尾声展墙与发布会席位（v2 已改写文本）
│       ├── press.js       发布会席位绘制
│       └── ui.js          预览页控件
│
├── audio/                 🎵 Web Audio 配乐
│   ├── score.js           ★ 主旋律与各时代编曲（v2 已重写主题）
│   ├── engine.js          离线渲染总线
│   ├── eras.js            各时代乐器编配
│   ├── instruments.js     合成乐器（拨弦、编钟、管风琴…）
│   ├── tape.js            蒸汽波磁带（变速变调）
│   ├── dsp.js             信号处理工具
│   └── levels.json        二十格响度标定
│
├── briefs/                📋 二十份美术简报 + STYLE.md 风格总纲
├── media/                 🖼 封面与展墙图（仓库内静态资源）
├── tools/                 🔧 渲染、截图、接触表、编码、检查、发布
└── out/                   📦 成片输出（gitignore）
```

### 命令一览

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地服务器，浏览器实时预览 |
| `npm run shot -- --t 5,11` | 截取指定时刻静帧 |
| `npm run sheet -- --film` | 全片接触表（每秒一格） |
| `npm run render` | 渲染全部 8220 帧 |
| `npm run audio` | 合成配乐 |
| `npm run levels` | 自动平衡各时代响度 |
| `npm run encode` | 帧 + 音频 → MP4 |
| `npm run cover` | 生成封面 |
| `npm run check` | 结构自检（禁用 API、过框节拍、确定性） |
| `npm run check:frames` | 核验帧序列完整性（防磁盘写满的假成功） |
| `npm run publish:api` | 通过 GitHub API 推送（git push 被墙时） |

---

## 9. 版权

- **代码**：MIT，见 [LICENSE](LICENSE)，© 2026 Royce Bella
- **影片本身**（画面、成片、渲染音频、封面与 `media/` 内图片）：© 2026 Royce Bella，保留所有权利
- **v2 的改动部分**（叙事文本、主题旋律、`paper.js`）：在同样的许可下发布
- 第三方库与致敬说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

---

**English summary**: *The Pelican Test v2 — the chase.* A 2:17 procedurally generated film:
a pelican chases a drawing the wind took, through twenty eras of art, each of which re-draws the
drawing and the pelican in its own medium. Every frame is a pure function of time (p5.js + p5.brush);
all music is synthesised with Web Audio. Based on
[RoyceBella-commits/The-Pelican-Test](https://github.com/RoyceBella-commits/The-Pelican-Test),
which itself learned its working method from
[Tunai-0511/meme67-art-history](https://github.com/Tunai-0511/meme67-art-history).
v2 rewrites the narrative, the text and the theme, and adds the chased drawing; the twenty panels
and the engine are kept. Code MIT; the film is © 2026 Royce Bella.
