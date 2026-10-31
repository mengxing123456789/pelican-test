# AGENTS.md — 《鹈鹕测试》/ The Pelican Test

给在这个仓库里工作的 agent。**保持这份文件短**：它每次会话都会被自动加载并占用预算。
长内容放 `docs/`，这里只留下不能违反的约束、必须跑的命令，以及去哪读。

---

## 这是什么

一部 161 秒的全程序化短片：一只鹈鹕追一张被风吹走的画，穿过 24 个艺术时代。
没有任何手绘素材或录音——每帧由 p5.js + p5.brush 计算，每个音符由 Web Audio 合成。

- 上游原作：[RoyceBella-commits/The-Pelican-Test](https://github.com/RoyceBella-commits/The-Pelican-Test)（MIT）
- 本仓库是二次创作，改动边界与同源证据见 `docs/PROVENANCE.md`
- 技术栈：p5.js 2.3.4 · p5.brush 2.2.3 · Web Audio · puppeteer-core · ffmpeg

---

## 不能违反的三条

### 1. 画面是时间的纯函数

同一个 `t` 渲染两次必须逐字节相同。

- 禁止 `Math.random()`、`Date.now()`、`performance.now()`、`new Date()`
- 随机走 `rngAt(t, salt)`（`src/kit/math.js`）或 `brush.seed()` / `brush.noiseSeed()`
- `npm run check` 会扫描这些禁用 API，也会抽查确定性

### 2. 任何数量都从时间轴推导，不要写第二份

这一条在这个项目里已经犯过**四次**，每次都静默失败：

| 写死的地方 | 后果 |
|---|---|
| 片尾字幕「追了二十个时代」 | 24 格的片子说 20 格 |
| 展墙网格 `COLS = 7`（21 格） | 最后三格算成 `NaN`，**根本没画** |
| CI 断言 `FRAMES !== 8220` | 发布流水线锁死，npm 停在 2.0.0 |
| `timeline.js` 注释里的 `// 137` | 实际 161 秒，误导读者 |

唯一来源是 `src/beat/timeline.js`：`N_SCENES`、`DURATION`、`FRAMES`、`FPS`、`OUTRO_START`。

```bash
# 想知道当前的真实数字，打印而不是猜
node --input-type=module -e "import('./src/beat/timeline.js').then(m=>console.log(m.N_SCENES,'panels',m.DURATION,'s',m.FRAMES,'frames'))"
```

推论：网格尺寸、字幕里的计数、校验断言，全部从 `N_SCENES` 算出来；
检查应该断言**自洽**（`FRAMES === round(DURATION × FPS)`），而不是断言"等于某个版本"。

### 3. 别手工改 `audio/levels.json`

它由 `npm run levels` 测量各 era 的 RMS 后生成，`audio/score.js` 会 fetch 它并按 era id 查增益。
手改会让电平失衡且无法复现 —— 要调就改 `tools/levels.mjs` 里的 `BIAS` 再重新生成。

---

## 渲染与交付

### 先装依赖

`node_modules/` 不进仓库，任何 `npm run *`（包括 `check`）都需要先：

```bash
npm install
```

还需要本机有 **Google Chrome** 与 **ffmpeg**（在 PATH 上）。Chrome 路径可用 `CHROME_PATH` 覆盖。

### 不要用 `npm run render` 出全片

全片 PNG 约 29 GB，而磁盘可能装不下；更要命的是**磁盘写满时渲染器会把失败帧记成
0 字节却仍 `exit 0`** —— 这个项目曾因此产出 1359 个空帧并报告"成功"。

用分段流程（峰值磁盘约 5 GB/段）：

```bash
npm run audio              # 1. 合成配乐 → audio/mix.wav
npm run render:segmented   # 2. 渲染一段 → 核验 → 编码 → 删帧 → 下一段 → 拼接 → 混音
```

中断后续跑，加 `--skip-existing`（跳过已完成的段，但仍计入最终拼接）：

```bash
node tools/render-segmented.mjs --seg 1600 --skip-existing --workers 6
```

> **陷阱**：不加 `--skip-existing` 却用 `--from 6400` 续渲，最后只会拼出尾段，
> 静默产出一支两分钟的片子。段列表必须是"全片"，不是"本次渲染的部分"。

### 出片前必跑

```bash
npm run check:frames   # 帧数 / 0 字节 / 索引断层 / PNG 头
npm run check:sync     # 24 个切格点上是否有车铃起音
```

这两个脚本都是踩坑之后才写的，**跳过它们等于放弃验证**。
`check:sync` 解码的是**交付的 mp4**，不是中间产物，所以封装错误也能抓到 ——
它抓出过 `-shortest` 把音轨从 161 s 截成 134 s 的 bug。

`npm run preview` 会重新生成 README 里的九宫格图；`npm run dev` 起本地预览页。

---

## 改代码时的硬约束

| 主题 | 规则 |
|---|---|
| 文字 | 一律画在 2D 覆盖层。p5.brush 会清掉 p5 的 `text()` |
| `env.fit()` | 只能由场景自己调用一次；调度器再包一层会双重变换，画面缩到左上角 |
| 新场景的离屏画布 | 必须 `K.layer(key, w, h, (ctx, g) => ...)`，不能用 `document.createElement('canvas')` |
| `drawPen` | `color: false` 会把每个填充部件强制设为 `#ffffff`，盖掉底层颜色。要填色用 `strokeOnly: true` / `fillInk` |
| 新增场景 | 加文件到 `src/scenes/` + 在 `src/scenes/index.js` 的 `MANIFEST` 登记，两者缺一不可 |

---

## 推送（本机网络受限）

`git push` 在本机不通（`Recv failure: Connection was reset`），**即使开了代理**也只放通了
`api.github.com`。用 API 推送：

```bash
npm run publish:api        # tools/push-via-api.mjs
```

- 它会重写 commit sha（内容一致），所以本地 tag 与远端 tag 的 sha 对不上是正常的
- 偶发失败直接重跑一次，别急着改代码
- `gh release` 在后台 job 里会失效（不继承 workdir、没有仓库上下文），
  必须用**绝对路径 + 显式 `--repo mengxing123456789/pelican-test`**

---

## 去哪读

| 想知道 | 读 |
|---|---|
| 踩过的坑、验证方法、教训 | [`docs/MEMORY.md`](docs/MEMORY.md) —— **改代码前先读这个** |
| 上游是谁、v2 改了什么、凭什么说同源 | [`docs/PROVENANCE.md`](docs/PROVENANCE.md) |
| 每个版本改了什么、根因是什么 | [`CHANGELOG.md`](CHANGELOG.md) |
| 架构、实测数据、二十四个时代 | [`README.md`](README.md) |
| 当 npm 包用 | [`docs/using-as-a-package.md`](docs/using-as-a-package.md) |

## 文档纪律

每轮改动后同步更新：

- `CHANGELOG.md` —— 记**根因**和**排除过哪些可能**，不只记结论
- `README.md` —— 架构或实测数据变了才改
- `docs/MEMORY.md` —— 踩了新坑就补一条

根目录只放 4 个文件（`README.md` / `CHANGELOG.md` / `LICENSE` / `THIRD_PARTY_NOTICES.md`），
其余一律进 `docs/`。
