# 上架与发布指南

面向 `awesome-dsh-plugin` 精选列表（dsh-market 的插件来源）。规则出处：
<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md>

---

## 0. 先决条件

| 要求 | 状态 |
| --- | --- |
| `package.json` 声明 `dsh.bundle` | ✅ 已有 |
| 仓库根有 `cordis.patch.yml` | ✅ 已有 |
| 仓库里有真实可用的代码 | ✅ 已有 |
| 仓库创建满 **1 天** | ⏳ 建仓后要等一天，CI 会检查 |
| 仓库带 **`dsh-plugin`** topic | ⏳ 建仓后手动加 |
| 描述与代码相符、无营销词 | ✅ 见下 |

---

## 1. 建仓并推送

本地仓库已经 `git init` 并提交完毕（作者 `chenyuan1251`），远程仓库还没建。先在 GitHub 建一个**空仓库**：

<https://github.com/new> → Repository name 填 `dsh-pet-niumali` → 选 **Public** →
**不要**勾 "Add a README file" / ".gitignore" / "license"（本地已有提交，勾了会冲突）。

```bash
cd dsh-pet-niumali
git remote add origin https://github.com/chenyuan1251/dsh-pet-niumali.git
git push -u origin main
```

推送后在 GitHub 仓库页面右侧 **About → Topics** 加上 `dsh-plugin`（**必填**，CI 会检查），
顺手也加 `dsh`、`desktop-pet`。

## 2. 选择 category

合法值只有这些：`agi` `ui` `usage` `theme` `model` `identity` `session` `memory`
`tools` `wsl` `browser` `vision` `voice` `docs` `skill` `workflow` `git` `notify`
`dev` `security` `remote` `market` **`fun`**。

本插件选 **`fun`**（Just for Fun）。选不准不会被打回，维护者会直接改。

## 3. 提交收录

Fork `awesome-dsh-plugin/awesome-dsh-plugin`，新开一个分支，**只加一个文件**：

`data/plugins/chenyuan1251__dsh-pet-niumali.yml`

```yaml
url: https://github.com/chenyuan1251/dsh-pet-niumali
name: chenyuan1251/dsh-pet-niumali
category: fun
description:
  en: A desk pet that floats over the DSH interface and opens into a daily check-in, focus timer and habit journal.
  zh: 浮动在 DSH 界面上的桌宠，点开是打卡、专注计时与生活手帐。
```

要点：

- **只有 `description.en` 是必填**，中文可省略（维护者会补）。描述里若含 `: `（冒号 + 空格）必须给整串加引号。
- **不要手写 `npm:` 字段** —— 会被校验拒绝，映射由 registry 自动采集。
- 一个 PR 最多 **3** 个条目；只改自己那一条，别碰别人的。
- 描述**必须与代码相符**：评审会逐条核对功能点，夸大（比如承诺后端、云同步、AI 能力）是最常见的被打回原因。

准备提交时，可直接用仓库里生成好的 `data/plugins/` 条目（见下）。

## 4. 截图

市场会读 `package.json` 旁边的 `screenshots.json`：

```jsonc
[ "assets/screenshots/01-pet-page.png" ]
```

- 1–8 张，路径相对该 JSON 文件，不能以 `/` 开头、不能含 `..`。
- 绝对 URL 也可以，但**必须是 GitHub 托管的 https**（第三方图床会被拒）。
- 不写这个文件的话，市场会从 README 里抽图。

补图建议：重启 DSH 后截一张「界面上悬浮的小牛浮球 + 展开的浮窗」，存成
`assets/screenshots/02-floating-ball.png`，再加进 `screenshots.json`。

## 5. CI 会依次检查

1. 单个 PR 条目数 ≤ 3
2. 从你的 `package.json` 读 `dsh.bundle`（**只声明 `dsh.client` 会在这里失败**）
3. 仓库年龄 ≥ 1 天
4. `awesome-lint` 与站点构建（双语一致性、分隔符、日期、截图）

失败信息会写清楚要改什么，在同一个分支上推修复即可，不用重开 PR。

## 6. 发新版

```bash
# 改完代码后
npm version patch          # 或 minor / major
git push origin main --follow-tags
```

市场每次打开都实时拉取列表，push 完就生效；不需要重新提交收录。已经收录的插件若长期停更或归档，会被定期清理。

---

## ⚠️ 预发布版本的 semver 陷阱（已修，勿改回去）

node-semver 只有在范围里**存在一个与该版本 `major.minor.patch` 元组完全一致、且自身也带预发布标签的比较符**时，才会放行预发布版本。

- ❌ `>=0.1.5-rc.1 <0.3.0` —— 0.1.5 和 0.3.0 两个元组上都不匹配 `0.2.0-rc.2`，会**静默排除**它。
- ✅ `>=0.1.5-rc.1 <0.2.0-0 || >=0.2.0-rc.1 <0.3.0-0`

`dsh.compatibility.dsh` 与 `engines.dsh` 用的都是下面这条修正后的写法，覆盖 `0.1.5-rc.*` 到 `0.2.x`。