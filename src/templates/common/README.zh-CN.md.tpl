# {{projectName}}

{{description}}

![许可证](https://img.shields.io/github/license/{{githubUser}}/{{repoName}})
{{ciBadge}}

> 本项目由 [oss-init]({{generatorRepoUrl}}) 生成。oss-init 是一个零运行时依赖的工具，用于创建并安全刷新开源仓库的基础文件。

## 已包含的基础能力

- 运行环境：{{runtimeSummary}}
- 初始项目零运行时依赖
- 内置测试
- {{ciSummary}}
- 贡献、安全、Issue 与 Pull Request 指南

## 需要根据项目调整的内容

这份脚手架是一个可维护的起点，不能代替针对具体项目的文档。首次公开发布前，请完成以下工作：

- 用项目要解决的真实问题、目标用户和支持的使用场景替换初始说明与示例代码。
- 记录公开 API、配置方式、兼容性政策，以及项目依赖的外部服务。
- 检查所选许可证、安全联系方式、贡献流程和行为准则中的联系信息。
- 仓库推送到正式 GitHub 地址后，配置分支保护和必需的状态检查。
- 删除不使用的文件或工作流，并在 `CHANGELOG.md` 中记录对用户有意义的变更。

## 安装

```bash
{{installCommand}}
```

## 使用

```{{codeFenceLanguage}}
{{usageExample}}
```

## 测试

```bash
{{testCommand}}
```

## 开发流程

安装项目后，在每次聚焦的代码修改前后运行测试，并保持文档与实际行为一致。Pull Request 应说明用户问题、采用的方案和验证方式。修复缺陷时应增加回归测试，不要提交密钥、生成的包归档或特定于本机的文件。

发布前，请确认包元数据和仓库链接正确，检查更新日志，并且只有在目标仓库已正确配置发布凭据或可信发布后，才使用生成的发布工作流。

## 参与贡献

欢迎贡献。提交 Pull Request 前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 和[行为准则](CODE_OF_CONDUCT.md)。

## 安全

请按照 [SECURITY.md](SECURITY.md) 的说明私下报告安全漏洞。

## 许可证

{{licenseTitle}} © {{author}} — 见 [LICENSE](LICENSE)。
