# 作为 npm 包使用 · Using this as a package

这个仓库同时发布为一个 npm 包，可以从 **GitHub Packages** 安装。
它不是那种 `import` 进来就能用的库——它是一个**可运行的影片工程**，
所以安装后的用法是"拿到这套源码和工具，然后自己渲染"。

## 安装

GitHub Packages 需要先指向对应 registry（包名带 scope，必须指定）：

```bash
# 在你的项目里
npm config set @mengxing123456789:registry https://npm.pkg.github.com
npm install @mengxing123456789/pelican-test
```

安装时需要认证。GitHub Packages 的读取也需要 token（`read:packages`），
在 `~/.npmrc` 里配置：

```ini
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## 安装后能做什么

```bash
cd node_modules/@mengxing123456789/pelican-test

npm install          # 装依赖：p5、p5.brush、puppeteer-core
npm run dev          # → http://127.0.0.1:5180/  浏览器实时预览整片
```

完整渲染（需要 Node 20+、本机 Chrome、ffmpeg）：

```bash
npm run audio        # 合成配乐 → audio/mix.wav
npm run render       # 渲染 8220 帧 → frames/（约 21 GB，先确认磁盘）
npm run check:frames # 核验帧序列完整性
npm run encode       # → out/pelican-test_1080p60.mp4
```

## 包里有什么

| 目录 | 内容 |
|---|---|
| `src/` | 全部源码：时间轴、绘图工具包、骨架、二十个场景、合成器 |
| `audio/` | Web Audio 配乐源码与响度标定 |
| `tools/` | 渲染、截图、接触表、编码、检查、发布工具 |
| `briefs/` | 二十份美术简报 + 风格总纲 |
| `film.html` / `index.html` | 预览页与项目页 |

**不包含**：渲染出的帧、成片、`node_modules`、`media/` 里的大图。
成片请从 [Releases](https://github.com/mengxing123456789/pelican-test/releases) 下载。

## 发布流程（维护者）

包由 GitHub Actions 在打 tag 时自动发布，不需要在本地登录 npm：

```bash
git tag v2.0.1
git push origin v2.0.1      # 触发 .github/workflows/publish.yml
```

也可以用 Actions 页面的 **Run workflow** 手动触发。

workflow 在发布前会先做完整性校验（语法检查、`package.json` 解析、
断言时间轴仍是 8220 帧 / 137 秒），避免把一个坏掉的包发出去。

## 许可

代码 MIT；影片本身（画面、成片、渲染音频、`media/` 内图片）
© 2026 Royce Bella，保留所有权利。详见仓库根目录 `LICENSE` 与 `THIRD_PARTY_NOTICES.md`。
