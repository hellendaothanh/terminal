# Contributing to OmniTerminal

Thank you for your interest in contributing to OmniTerminal! We welcome contributions from the community to help make this tool better for DevOps, Sysadmins, and DBAs.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to the project maintainers.

---

## How Can I Contribute?

### 1. Reporting Bugs
- Check the [Issues tab](https://github.com/hellendaothanh/terminal/issues) to ensure the bug hasn't already been reported.
- Open a new issue using the **Bug Report** template.
- Include clear steps to reproduce the issue, expected vs. actual behavior, and relevant logs/screenshots (ensure sensitive credentials are obfuscated).

### 2. Suggesting Enhancements
- Check existing issues/discussions to avoid duplicates.
- Clearly describe the feature, the problem it solves, and potential use cases.

### 3. Submitting Pull Requests (PRs)
1. **Fork & Clone** the repository:
   ```bash
   git clone [https://github.com/hellendaothanh/terminal.git](https://github.com/hellendaothanh/terminal.git)
   cd terminal

```

2. **Install dependencies**:
```bash
npm install

```


3. **Create a feature branch**:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix

```


4. **Make your changes** and test locally:
```bash
npm run dev

```


5. **Ensure code quality**:
```bash
npm run build

```


6. **Commit your changes** using Conventional Commits:
```bash
git commit -m "feat(terminal): add visual explain query profiler"
git commit -m "fix(ssh): resolve reconnection timeout on multi-hop"

```


7. **Push to your fork & open a Pull Request** against the `main` branch.

---

## Development Guidelines

* **TypeScript Strictness**: Avoid using `any`. Define strong interfaces/types for SSH, Database clients, and IPC communications.
* **Security First**:
* Never log passwords, private keys, or plain credentials.
* Keep cryptographic functions (AES-256-GCM, TOTP) secure and tested.


* **Performance**: Ensure background session handling (WebSockets, PTY sessions, log streams) properly cleans up listeners to prevent memory leaks in Electron.

---

## License

By contributing to OmniTerminal, you agree that your contributions will be licensed under the project's repository license.

```
