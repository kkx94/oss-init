# oss-init

为 Node.js 和 Python 开源仓库生成、接入、检查并安全更新中英双语基线。

[简体中文](README.zh-CN.md) | [English](README.md)

[![CI](https://github.com/kkx94/oss-init/actions/workflows/ci.yml/badge.svg)](https://github.com/kkx94/oss-init/actions/workflows/ci.yml)
[![npm 版本](https://img.shields.io/npm/v/%40kkx94%2Foss-init)](https://www.npmjs.com/package/@kkx94/oss-init)
![零运行时依赖](https://img.shields.io/badge/runtime_dependencies-0-brightgreen)
![许可证](https://img.shields.io/github/license/kkx94/oss-init)
[![Node 版本](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)

`oss-init` 提供四个相互配合的命令：

1. **生成**仓库基线，包含实际文档、社区文件、起步代码、测试和可选 GitHub Actions 工作流。
2. **接入**已有 Node.js 或 Python 仓库，只补充缺失的维护文件，所有原有路径继续由用户所有。
3. **检查**现有仓库的 17 项开源卫生规则。分数只衡量文件是否齐全与基本文档质量，不代表项目重要性、安全性或采用情况。
4. **更新**早期 `oss-init` 生成或接入的文件，默认保留用户已修改的内容。

该 CLI 没有运行时依赖，也不需要构建步骤，支持 Node.js 22 及更高版本。仓库还提供一个零依赖 GitHub Action，可在 CI 中强制执行卫生检查。

## 安装

从公开 npm registry 安装或运行作用域包：

```bash
npx @kkx94/oss-init
npm install --global @kkx94/oss-init
```

未作用域的 npm 包名 `oss-init` 属于另一位维护者。安装后的 CLI 命令仍然是 `oss-init`。

## 为什么做这个项目

新仓库往往需要重复准备许可证、贡献指南、安全报告流程、Issue 模板、测试和 CI。`oss-init` 将这些内容组合成适合中小型 Node.js 或 Python 项目的可重复起点，并可生成英文和中文文档。

生成结果只是基线，不是认证。维护者仍需要根据自己的项目调整政策、验证发布设置，并如实记录项目行为。

## 可重现 Demo

在源码检出目录运行一条命令，即可端到端验证真实 CLI。Demo 会在临时目录生成 Node.js 和 Python 仓库，安全接入一个已有项目且不修改其包元数据，运行生成的测试，确认卫生分数，预览安全更新，然后删除临时文件。该流程不使用网络，也不修改当前仓库。

```bash
npm run demo
```

预期摘要（所有命令都会真实执行，不是模拟）：

```text
✓ 已生成双语 Node.js 仓库
✓ 生成的 Node.js 测试通过
✓ node-demo 卫生检查通过 (100/100)
✓ 安全更新预览完成，未修改文件
✓ 已接入现有 Node.js 仓库，未替换包元数据
✓ 已生成双语 Python 仓库
✓ 生成的 Python 测试通过
✓ python-demo 卫生检查通过 (100/100)
✓ 端到端 Demo 通过
```

同一 Demo 也会在 [GitHub Actions](https://github.com/kkx94/oss-init/actions/workflows/ci.yml) 中持续运行。

## 用法

### 生成仓库

```bash
oss-init                              # 交互式向导
oss-init my-project --lang node --ci  # 非交互式
```

`init` 是默认命令，因此 `oss-init [dir]` 与 `oss-init init [dir]` 等价。

| 选项 | 取值 | 默认值 | 说明 |
|---|---|---|---|
| `--lang` | `node`, `python` | `node` | 模板语言 |
| `--license` | `mit`, `apache-2.0` | `mit` | 生成的许可证 |
| `--docs` | `en`, `zh`, `bilingual` | `bilingual` | README 语言 |
| `--name` | 字符串 | 目录名 | 项目/包名；Node.js 支持 npm scope |
| `--author` | 字符串 | `git user.name` | 写入 LICENSE 和首次提交的作者 |
| `--github-user` | 字符串 | 检测到的 `gh` 账号 | 生成仓库链接使用的 GitHub 用户名 |
| `--template` | 目录 | 无 | 使用 `common/` 和 `<lang>/` 中的组织模板覆盖内置模板 |
| `--ci` | 开关 | 关 | 生成 `.github/workflows/ci.yml` |
| `--publish` | 开关 | 关 | 生成 `.github/workflows/release.yml` |
| `--git` | 开关 | 关 | 初始化 Git 并创建首次提交 |
| `--github` | 开关 | 关 | 执行 `--git`，创建公开 GitHub 仓库并推送；需要 `gh` |
| `--no-agents` | 开关 | 关 | 不生成 `AGENTS.md` |
| `--dry-run` | 开关 | 关 | 只预览生成文件，不写入 |
| `--force`, `-f` | 开关 | 关 | 允许向非空目录写入 |
| `--help`, `-h` | 开关 | 关 | 显示帮助 |
| `--version`, `-v` | 开关 | 关 | 显示版本 |

当目标目录非空时，`oss-init` 会报告冲突路径，并要求使用 `--force` 才会写入。请先检查目标目录。

#### 生成内容

| 类别 | 文件 |
|---|---|
| 文档 | 按语言选项生成的 README、`CHANGELOG.md`、`AGENTS.md` |
| 社区 | `CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`SECURITY.md` |
| 法律 | MIT 或 Apache-2.0 `LICENSE` |
| 工具 | `.gitignore`、`.gitattributes`、`package.json` 或 `pyproject.toml` |
| GitHub | Issue 模板和 Pull Request 模板 |
| CI/CD | 可选 CI 与发布工作流 |
| 起步代码 | 带可通过测试的 Node.js 或 Python 小模块 |

生成的 Node.js CI 在 Linux 上测试 Node.js 22 和 24，并在 Windows 上测试 Node.js 24。生成的 Python CI 在 Linux 上测试 Python 3.10 至 3.13，并在 Windows 上测试 Python 3.13。两者都提供稳定的聚合检查名 `CI`，可用于分支保护。

### 接入已有仓库

`adopt` 让并非由 oss-init 创建的仓库也能进入安全维护周期：

```bash
oss-init adopt . --dry-run       # 检查所有计划新增内容
oss-init adopt . --ci            # 补充缺失的社区文件和 CI
oss-init adopt . --lang python   # 为 Node.js/Python 混合仓库指定类型
```

该命令读取 `package.json` 或 `pyproject.toml` 的 PEP 621 `[project]` 表，并尽可能识别项目名称、描述、作者、许可证和 GitHub 所有者。混合仓库必须通过 `--lang` 消除歧义；无法识别许可证时必须显式提供 `--license`。

使用 `--ci` 时，接入流程会从已有仓库推导命令，而不会假设项目采用起步模板的配置。Node.js 项目必须有 `test` script；工具会根据 `packageManager` 和锁文件选择 npm、pnpm 或 Yarn，只在存在 `lint` script 时运行 lint。Python 项目必须能识别出 pytest 或 unittest 测试及相应安装方式。配置不完整或存在歧义时，会在写入任何文件前停止。发布自动化不会被猜测：`adopt --publish` 会零写入退出，因为发布凭据与命令属于项目专用配置。

接入不会覆盖任何已有文件，也不会生成起步源码、测试、`package.json` 或 `pyproject.toml`。schema v3 会同时记录 oss-init 创建的文件，以及接入前已经属于仓库的模板路径。未来 `update` 可以安全加入新出现的维护文件，但即使执行 `update --force`，也不会接管接入前已有的路径。

| 选项 | 说明 |
|---|---|
| `--lang <node\|python>` | 同时存在两类项目清单时选择项目类型 |
| `--license <mit\|apache-2.0>` | 仅在项目没有许可证时选择要添加的许可证 |
| `--docs <en\|zh\|bilingual>` | 缺少 README 时使用的语言；默认 `en` |
| `--name`、`--author`、`--github-user` | 覆盖无法正确检测的元数据 |
| `--ci` | 仅在能推导出受支持的安装和测试方式时添加 CI |
| `--publish` | 接入模式不支持；不会写入文件 |
| `--no-agents` | 不添加 `AGENTS.md` |
| `--dry-run` | 只预览，不写文件和 manifest |

### 叠加组织模板

使用 `--template <dir>` 可以保留内置基线，同时替换单个文件或添加组织专用文件。自定义目录沿用内置的 `common/`、`node/` 和 `python/` 结构：

```text
company-templates/
├── common/
│   ├── README.md.tpl
│   └── NOTICE.md.tpl
└── node/
    └── docs/architecture.md.tpl
```

```bash
oss-init my-service --lang node --template ./company-templates
```

`common/` 下的文件适用于两种语言，所选语言目录中的文件随后叠加。相同相对路径会覆盖内置模板，新路径会增加生成文件。模板文件名和 UTF-8 文本可以使用 `{{projectName}}`、`{{author}}` 等内置值；未知值会在写入任何项目文件之前报错。

为保证后续更新可移植，`init` 会把本次选中的自定义模板文本写入 `.oss-init.json`，而不是记录本机源目录。即使源目录移动或删除，`update` 仍能复现相同文件，同时继续通过 manifest 哈希保护用户修改。符号链接、路径逃逸、保留的 `.git/` 与 `.oss-init.json` 目标、超过 200 个文件、单文件超过 256 KiB 或总快照超过 2 MiB 都会被拒绝。

### 更新已生成的仓库

`init` 和 `adopt` 会写入 schema v3 的 `.oss-init.json` manifest，其中包含标准化项目身份、渲染选项、SHA-256 哈希、明确的路径所有权和可选的可移植自定义模板快照。schema v1 与 v2 仍然兼容，更新时会迁移 v0.2.x 至 v0.4.x 写入的 manifest。

```bash
oss-init update                # 更新仍未被用户修改的生成文件
oss-init update --dry-run      # 只预览，不写入
oss-init update --force        # 也覆盖用户修改过的生成文件
```

`update` 会先验证完整 manifest，包括路径与哈希；每次写入前再检查目标路径。与记录哈希不同的现有或退役文件会默认保留，只有 `--force` 才会覆盖或删除。更新的文件与 manifest 以原子方式写入，成功或失败后都会清理临时数据。

### 检查仓库

```bash
oss-init check                 # 检查当前目录
oss-init check ./other-repo    # 检查其他仓库
oss-init check --json          # 机器可读输出
oss-init check --fix           # 添加缺失的社区文件
```

`check` 检查 17 项文档、社区文件和 CI 规则。分数达到 80 会报告为健康。普通检查在分数低于 80 时以状态码 1 退出，因此可用于 CI。`check --fix` 只添加缺失文件，不会覆盖已有 README 或其他已存在文件。

| 选项 | 说明 |
|---|---|
| `--json` | 输出 JSON |
| `--fix` | 使用对应 Node.js 或 Python 模板添加缺失文件 |
| `--quiet` | 只输出摘要 |
| `--help`, `-h` | 显示帮助 |
| `--version`, `-v` | 显示版本 |

### 在 GitHub Actions 中执行检查

该 Action 会检查已 checkout 的仓库，写入详细的任务摘要，在分数低于可配置阈值时失败，并通过 `steps.<id>.outputs.score` 输出数字分数。

```yaml
name: Repository hygiene

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - id: oss-hygiene
        uses: kkx94/oss-init@v0.4.0
        with:
          fail-below: "80"
      - run: echo "Hygiene score ${{ steps.oss-hygiene.outputs.score }}/100"
```

`path` 默认为仓库根目录，并且必须位于 checkout 工作区之内。`fail-below` 接受 0 至 100 的整数，默认为 80。

上面的版本标签选择 v0.4.0 release。如果需要不可变的供应链输入，请绑定该 release 的完整 commit SHA，并有意识地更新该 SHA。

## 示例

```bash
# 带 CI 和发布自动化的双语 Node.js 项目
oss-init my-lib --lang node --docs bilingual --ci --publish

# 显式设置 GitHub 身份的 Python 项目
oss-init data-tool --lang python --github-user octocat --ci

# 生成、初始化 Git、创建 GitHub 仓库并推送
oss-init my-lib --ci --github

# 检查现有仓库，并且只添加缺失文件
oss-init check --fix

# 将已有仓库接入安全更新周期
oss-init adopt . --dry-run
oss-init adopt . --ci
```

## 开发

```bash
npm test
npm run lint
npm run demo
node bin/oss-init.js check
npm pack --dry-run --json
```

主仓库 CI 在 Linux 上覆盖 Node.js 22、24 和 26，在 Windows 上覆盖 Node.js 24。发布流程通过 GitHub OIDC Trusted Publishing 向 npm 认证（仓库不保存 npm token），验证 tag 与 `package.json`、运行测试和包检查、通过 npm provenance 发布、等待公开 registry 可见，并在干净目录中验证 `npx`，最后才创建 GitHub Release。

## 文档

- [贡献指南](CONTRIBUTING.md)
- [行为准则](CODE_OF_CONDUCT.md)
- [安全政策](SECURITY.md)
- [更新日志](CHANGELOG.md)
- [编码智能体指南](AGENTS.md)

## 社区

- 已在公开仓库中使用 oss-init？[提交采用报告](https://github.com/kkx94/oss-init/issues/new?template=adoption.yml)。项目只会在验证后列入采用者；不会根据 star 或下载量推断采用。
- 发现缺陷或有具体流程需求？[创建 Issue](https://github.com/kkx94/oss-init/issues/new/choose)。

## 路线图

- [x] Python 模板
- [x] 带 manifest 迁移的安全生成文件更新
- [x] 跨平台生成 CI
- [x] 自定义模板目录（[#3](https://github.com/kkx94/oss-init/issues/3)）
- [x] 安全接入已有 Node.js 与 Python 仓库
- [ ] `check` 可配置规则集
- [ ] 根据用户需求增加其他语言模板

## 许可证与维护者

由 [kkx94](https://github.com/kkx94) 维护。使用 [MIT License](LICENSE)。
