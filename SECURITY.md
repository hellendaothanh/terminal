# Security Policy

The OmniTerminal team takes security vulnerabilities seriously. As an application managing sensitive credentials, remote connections, and database sessions, we appreciate your efforts to responsibly disclose any issues you may find.

---

## Supported Versions

Only the latest release of OmniTerminal receives active security patches.

| Version | Supported          |
| ------- | ------------------ |
| >= 1.0.x | :white_check_mark: |
| < 1.0.0  | :x:                |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub Issues.**

If you believe you have discovered a security vulnerability in OmniTerminal, please report it through one of the following channels:

1. **GitHub Security Advisory (Preferred):**
   - Go to the repository's **Security** tab.
   - Click on **Advisories** $\rightarrow$ **Report a vulnerability**.
2. **Private Email:**
   - Send an email to `security@hellendaothanh.dev` (or your preferred contact email).

### What to Include in Your Report
To help us triage and resolve the issue quickly, please include:
- A clear description of the vulnerability and its potential impact.
- Step-by-step instructions (or proof-of-concept code) to reproduce the issue.
- The operating system, application version, and runtime environment.
- Any suggested mitigations or fixes, if available.

### Response Timeline
- **Initial Acknowledgement:** Within 48 hours of report submission.
- **Status Update & Assessment:** Within 5 business days.
- **Fix & Disclosure:** We will work on a patch and coordinate a public release timeline with you before disclosing details publicly.

---

## Security Best Practices for Users

- **Master Passwords & Vaults:** Ensure you use a strong, unique master password to protect your encrypted local storage.
- **SSH Private Keys:** Always protect private keys with passphrases where possible.
- **Command Guard:** Keep Command Guard enabled on Production environments to prevent accidental destructive commands (`rm -rf /`, `DROP DATABASE`).
