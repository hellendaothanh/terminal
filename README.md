# 🚀 OmniTerminal - Multi-Protocol Server & Database Management Hub

> 🌐 **Language:** **English** | [Tiếng Việt](README_VN.md)

**OmniTerminal** is a high-performance, cross-platform desktop application (macOS, Windows, Linux) designed for server administration and database management. Built with a sleek Dark Mode UI, enterprise-grade encryption, and a built-in **DevOps & Database AI Assistant**.

---

## 🌟 Key Features

### 1. 🔒 Encrypted Master Passphrase & Local Vault
* **Master Passphrase Protection:** All server configurations, credentials, and private keys are encrypted using **AES-256-GCM** combined with **PBKDF2 key derivation (100,000 iterations)**.
* **Encrypted Vault Import/Export:** Securely backup and restore your entire vault data with custom **AES-256-GCM passphrase protection** for `.enc.json` files.
* **SSH Key Vault Manager:** Generate secure **RSA 4096-bit** and **Ed25519** key pairs directly within the application with one-click public key copying for `~/.ssh/authorized_keys`.

### 2. 🛡️ HashiCorp Vault Enterprise Integration
* **Vault REST API Support:** Seamlessly connect to HashiCorp Vault clusters via **Vault Token** or **AppRole (Role ID + Secret ID)**, including namespace support for enterprise environments.
* **Self-Signed SSL & Cluster HA Standby Support:** Native support for internal Vault servers with self-signed SSL/TLS certificates and automatic handling of High-Availability (HA) Standby Nodes (HTTP 429 status response).
* **Real-time Dynamic Secret Fetching:** Automatically retrieve server & database credentials on-the-fly from HashiCorp Vault right before initializing SSH, SFTP, RDP, or Database connections.

### 3. 💻 High-Performance SSH Terminal
* **Powered by Xterm Engine:** Integrated `@xterm/xterm` for high-throughput, bidirectional PTY streaming.
* **Auto-Resizing & Reflow:** Monitors window bounds (`ResizeObserver` + `@xterm/addon-fit`) to automatically compute and resize rows/columns (`cols/rows`).
* **Custom Themes & Fonts:** Supports JetBrains Mono, Menlo, Monaco, custom font sizes, and premium color palettes (One Dark, Dracula, Monokai).
* **Quick Tools Bar:** One-click Copy/Paste, font zoom controls, and instant Reconnect when network drops occur.

### 4. 📂 SFTP / SCP File Explorer & Real-Time Progress Bar
* **Dual-Pane File Browser:** Visually navigate remote directory trees, download/upload files, and perform directory operations (`mkdir`, `delete`).
* **Real-Time Progress Tracking:** Floating status bar displaying percentage (%), transfer speed, and transferred vs. total size (MB/GB) for large file transfers.

### 5. 🖥️ Remote Desktop (RDP) & Auto Credential Injection
* **TCP Socket Pre-check:** Verifies port 3389 availability prior to connection.
* **Automatic Credential Store:** Seamlessly registers credentials into *Windows Credential Manager* (`cmdkey`) and *macOS Keychain* (`security`) for zero-prompt auto-logins.
* **Auto Resolution Calculation:** Dynamically calculates client viewport bounds to fit RDP sessions.

### 6. 🗄️ Native Database Management System
* **Multi-Engine Support:** Native driver support for **MySQL / MariaDB**, **PostgreSQL** (with SSL mode & multi-schema support), **Redis Cache**, and **MongoDB**.
* **Database & Table Tree Browser:** View databases, custom schemas, tables, and Redis keys in an organized sidebar hierarchy with dynamic database switching.
* **SQL Query Console:** Interactive SQL editor with `Ctrl + Enter` (or `Cmd + Enter`) execution shortcut.
* **Data Grid & CSV Export:** Styled dark-mode data table view with row count breakdown, execution time measurement (ms), and one-click CSV export.

### 7. 🤖 DevOps & Database AI Assistant
* **Flexible Provider Support:** Native integration with **Google Gemini AI** (`gemini-1.5-flash`, `gemini-2.0-flash`), **OpenAI** (`gpt-4o`, `gpt-4o-mini`), and **Custom Endpoints (Ollama / vLLM / LocalAI / DeepSeek)**.
* **Free-Text Model Selection:** Type any model string directly into the model field with autocomplete recommendations.
* **Auto-Capture Live Context:** One-click **"📥 Auto-Capture Live Terminal / DB Context"** button imports recent terminal lines, active SQL queries, and error stack traces directly into the AI prompt.
* **Rich Markdown Formatter:** Clean HTML/Markdown renderer with syntax highlighting and one-click **"Paste to Terminal"** buttons.

### 8. 🔑 KeePass-style Password Manager
* **Secure Vault Storage:** Encrypt and store unlimited login credentials (Title, Username, Password, URL, Notes) using AES-256-GCM.
* **Built-in Password Generator:** Customize password length (8-64 chars) with toggleable Uppercase (A-Z), Numbers (0-9), and Symbols (@#$).
* **Smart Clipboard Actions:** One-click copy for Username and Password with instant visual feedback and masked password toggling.

### 9. 🛡️ Real-Time TOTP Authenticator (2FA)
* **Standard TOTP Algorithm:** Compatible with Google Authenticator / Authy standards via `otplib`.
* **Live 30-Second Countdown:** Interactive visual timer counting down remaining seconds before rotating 6-digit codes.
* **One-Tap Code Copying:** Large, spaced digit display (e.g. `123 456`) with quick clipboard copying.

### 10. ⚡ Parallel Multi-Exec & Snippet Library
* **Command Snippet Storage:** Store reusable Shell scripts and SQL queries categorized by tags with one-click multi-exec triggers.
* **Parallel Execution Engine:** Execute an SSH command or SQL query simultaneously across multiple selected servers or databases asynchronously.
* **Side-by-Side Output Visualizer:** Multi-card grid layout comparing stdout, stderr, execution times (ms), and success/error badges per host in real time.

### 11. 🛡️ Session Recording & Security Audit Logs
* **Asciinema v2 Session Recording:** Automatically records SSH terminal sessions in standard `.cast` format (including input/output streams and timing offsets).
* **Built-in Asciinema Session Player:** Replay recorded terminal sessions directly in app with Play, Pause, Speed adjustment (1x, 2x, 4x), and seek controls.
* **High-Risk Command Detection:** Real-time auditing for SQL queries and SSH commands with automatic risk scoring (CRITICAL / HIGH risk warnings for `rm -rf`, `DROP TABLE`, `chmod 777`).
* **Log Export Options:** Export audit trails to `.cast` or `.txt` log reports with timestamp integrity.

### 13. 📊 Real-Time Server Metrics Dashboard (Agentless)
* **Real-Time Monitoring:** Track remote server CPU (%), RAM (%), Disk (/), and Network I/O (KB/s download/upload) dynamically via lightweight SSH commands without installing any server agents.
* **Compact Header Badge & Detailed View:** Switch between a compact status bar badge and an expanded progress bar visualizer with color-coded overload alerts (Green -> Amber -> Red).

### 14. 🌉 Bastion Jump Host Support (1-3 Hops Multi-Hop Tunneling)
* **Private Subnet Access:** Seamlessly route SSH and SFTP connections through up to 3 layers of Bastion/Jump hosts into isolated internal networks.
* **Automatic Tunnel Chaining:** Built-in `ssh2` `forwardOut` stream handling handles multi-hop SSH authentication automatically.

### 15. 💡 Shell Smart Assistant & Log Anomaly Detection
* **Intelligent Auto-Completion:** Dynamic command recommendations bar built from shell command history, environment variables, and Linux/Kubernetes/Docker CLI templates.
* **Log Anomaly Detection:** Real-time stream monitor flags critical error keywords (`OutOfMemory`, `OOMKilled`, `Connection Refused`, `Segmentation Fault`, `FATAL ERROR`) with immediate red alert banners.

### 16. 🗄️ Visual ERD, Schema Diff & Visual Query Builder
* **Visual ERD Diagram:** View interactive database schema relationships, Primary Keys (PK), Foreign Keys (FK), and column data types.
* **Environment Schema Diff & Migration Generator:** Compare database schemas between 2 environments (e.g. Dev vs Staging) and automatically generate SQL migration scripts.
* **Visual SQL Query Builder:** Drag-and-drop table selection, column pickers, JOIN links, and WHERE filter builders generate standardized SQL queries without typing SQL by hand.

### 17. 📦 Advanced Data Pump & Cloud/Container Ecosystem
* **Streaming Dump & Restore:** High-performance database dump and restore supporting SQL DDL/DML, JSON, and Parquet columnar formats with optional AES-256 stream encryption.
* **Docker & Kubernetes Panel:** View running Docker containers and Kubernetes Pods, inspect real-time logs, and launch 1-click `docker exec` / `kubectl exec` interactive shell terminals.
* **Cloud Infrastructure Explorer:** Connect AWS, GCP, and Azure APIs to view Virtual Machines/Instances and connect via 1-click SSH/RDP.

### 18. 🛡️ Command Guard & Tamper-Evident Audit Logs (ISO 27001 / SOC 2)
* **Command Guard Approval Workflow:** Requires Master Passphrase or 6-digit TOTP authentication before executing destructive commands (`DROP DATABASE`, `systemctl stop`, `rm -rf`).
* **Tamper-Evident Audit Logs:** Compute SHA-256 HMAC checksums for every audit log entry to ensure tamper resistance and compliance readiness.

### 19. 🎨 Modern UI/UX Redesign & Workspace Layout
* **Two-Pane Activity Sidebar:** A professional Activity Rail (Servers, Security, Databases, DevOps) with a dynamic secondary panel reduces visual clutter.
* **Modern Aesthetic & Glassmorphism:** Deep dark theme with beautiful frosted glass (`backdrop-filter`) top bars and modern browser-style tab management.
* **Quick Server Cloning:** One-click "Clone Server" functionality instantly duplicates configurations for rapid infrastructure deployment.

### 20. ☁️ S3 / Cloud Object Storage Explorer
* **Native S3 Integration:** Extending our file manager to natively support AWS S3, Google Cloud Storage, MinIO, and DigitalOcean Spaces for direct object storage manipulation.

### 21. 🚇 SSH Tunnel & Port Forwarding Manager
* **Visual Tunnel Manager:** A visual manager for Local, Remote, and Dynamic SOCKS5 Port Forwarding to seamlessly connect to internal databases/services behind Jump Hosts.

### 22. 📊 Multi-Log Tail & Centralized Log Aggregator
* **Real-time Log Streaming:** Group and stream real-time logs (`tail -f`) from multiple SSH servers simultaneously on a single dashboard, complete with regex filtering and color-coded alerts.

### 23. 🤝 Team Collaboration & Encrypted Vault Sharing
* **E2EE Team Cloud Sync:** Securely sync, export, and share workspaces, connection lists, and command snippets with your team via GitHub Gist or Amazon S3 using end-to-end encrypted channels.

### 24. 🔌 Plugin System & Custom Connectors
* **Dynamic Node.js Plugin Hooks:** A lightweight JavaScript/TypeScript hooks mechanism allowing the community to build and load custom connectors for anything, like Elasticsearch, ClickHouse, Apache Kafka, or custom proprietary internal tools.

---

## 🔮 Roadmap & Future Features

We are constantly expanding OmniTerminal. Stay tuned for upcoming features!

---

## 🛠️ Tech Stack

* **Core Framework:** Electron + React 18 + TypeScript + Vite
* **Terminal Engine:** `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`
* **Network & Database Drivers:** `ssh2`, `ssh2-sftp-client`, `mysql2`, `pg`, `ioredis`
* **Icons & UI:** Lucide React, Custom Dark Mode Design System
* **Security:** Node.js Crypto (`crypto.pbkdf2Sync`, `crypto.createCipheriv` AES-256-GCM)

---

## 🚀 Installation & Getting Started

### Prerequisites:
* **Node.js**: version >= 18.0.0
* **npm** / **yarn** / **pnpm**

### Quick Start:

1. **Clone the repository and install dependencies:**
   ```bash
   git clone https://github.com/hellendaothanh/terminal.git
   cd terminal
   npm install
   ```

2. **Run in Development Mode:**
   ```bash
   npm run dev
   ```

3. **Build & Package for Production:**
   ```bash
   npm run build
   ```

---

## ⌨️ Useful Keyboard Shortcuts

| Shortcut (Mac / Windows) | Action |
| :--- | :--- |
| `Cmd + B` / `Ctrl + B` | Toggle Collapse/Expand Left Server Sidebar |
| `Cmd + Enter` / `Ctrl + Enter` | Execute SQL query in Database Console |
| `Cmd + V` / `Shift + Insert` | Paste text into SSH Terminal |
| `Esc` | Close active modals |

---

## 📁 Project Structure

```
terminal/
├── electron/                   # Electron Main & Preload Processes
│   ├── main.ts                 # Main Process Entry Point & IPC Handlers
│   ├── preload.ts              # Secure Preload Script (Exposing window.api)
│   └── services/               # Backend encryption, network, DB & AI services
│       ├── aiService.ts        # Gemini, OpenAI & Custom Model REST API integration
│       ├── databaseService.ts  # Drivers for MySQL, PostgreSQL & Redis
│       ├── hashicorpVaultService.ts # HashiCorp Vault REST API integration
│       ├── rdpService.ts       # RDP session & credential injection
│       ├── sftpService.ts      # SFTP file transfer & progress events
│       ├── sshService.ts       # SSH2 PTY stream management
│       └── vaultService.ts     # AES-256-GCM vault encryption
├── src/                        # React Frontend (Renderer Process)
│   ├── App.tsx                 # Main layout, tab management & modals
│   ├── components/             # React UI Components
│   │   ├── AIAssistantDrawer.tsx # Docked AI Assistant Side Panel
│   │   ├── DatabaseExplorer.tsx  # Database Browser & Query Console
│   │   ├── SSHTerminal.tsx     # Xterm SSH Terminal Window
│   │   ├── SFTPExplorer.tsx    # Dual-pane SFTP Browser
│   │   ├── RDPViewer.tsx       # Remote Desktop Window
│   │   ├── PasswordManager.tsx # KeePass-style Password Manager
│   │   ├── OTPManager.tsx      # Real-time TOTP 2FA Authenticator
│   │   ├── Sidebar.tsx         # Server & Security list (supports 50px mini-bar mode)
│   │   ├── TabBar.tsx          # Multi-process Tab Bar
│   │   └── TopBar.tsx          # 80px padded header bar for macOS
│   ├── types/                  # TypeScript Interfaces & API types
│   └── index.css               # Dark Mode Design System
├── vite.config.ts              # Vite & Rollup configuration
└── package.json                # Dependencies & Build scripts
```

---

## 📄 License

Distributed under the **MIT License**.
