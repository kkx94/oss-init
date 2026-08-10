# {{name}}

{{description}}

![License](https://img.shields.io/github/license/{{githubUser}}/{{name}})
![Node CI](https://img.shields.io/github/actions/workflow/status/{{githubUser}}/{{name}}/ci.yml?branch=main&label=ci)
![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

> Scaffolded with [oss-init](https://github.com/oss-init/oss-init) — scaffold a production-grade open source repository in one command, with zero dependencies.

## Features

- Built with modern Node.js (ESM, Node >= 18)
- Zero runtime dependencies
- Built-in test runner (`node --test`)
- CI-ready: GitHub Actions workflow included
- Actively maintained

## Installation

```bash
npm install
```

## Usage

```js
import { {{nameCamel}} } from './src/index.js';

const result = {{nameCamel}}(1, 2);
console.log(result); // 3
```

## Testing

```bash
npm test
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started, our code of conduct, and the process for submitting pull requests.

## Security

Found a vulnerability? Please report it responsibly. See [SECURITY.md](SECURITY.md) for details.

## License

{{licenseTitle}} © {{author}} — see [LICENSE](LICENSE).
