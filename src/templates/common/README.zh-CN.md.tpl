# {{name}}

{{description}}

![License](https://img.shields.io/github/license/{{githubUser}}/{{name}})
![Node CI](https://img.shields.io/github/actions/workflow/status/{{githubUser}}/{{name}}/ci.yml?branch=main&label=ci)
![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

> 由 [oss-init](https://github.com/oss-init/oss-init) 脚手架生成 — 一行命令搭建生产级开源仓库，零依赖。

## 特性

- 现代 Node.js（ESM，Node >= 18）
- 零运行时依赖
- 内置测试运行器（`node --test`）
- 开箱即用的 GitHub Actions CI
- 持续维护中

## 安装

```bash
npm install
```

## 使用

```js
import { {{nameCamel}} } from './src/index.js';

const result = {{nameCamel}}(1, 2);
console.log(result); // 3
```

## 测试

```bash
npm test
```

## 参与贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解贡献流程、行为准则及提交 Pull Request 的规范。

## 安全

发现漏洞？请负责任地报告。详见 [SECURITY.md](SECURITY.md)。

## 许可证

{{licenseTitle}} © {{author}} — 见 [LICENSE](LICENSE)。
