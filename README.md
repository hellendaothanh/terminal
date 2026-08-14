# 🚀 OmniTerminal - Multi-Protocol Server & Database Management Hub

> 🌐 **Language:** **English** | [Tiếng Việt](README_VN.md)

**OmniTerminal** is a high-performance, cross-platform desktop application (macOS, Windows, Linux) designed for server administration and database management. Built with a sleek Dark Mode UI, enterprise-grade encryption, and a built-in **DevOps & Database AI Assistant**.

---

## 🌟 Key Features

### 1. 🔒 Encrypted Master Passphrase & Local Vault
* **Master Passphrase Protection:** All server configurations, credentials, and private keys are encrypted using **AES-256-GCM** combined with **PBKDF2 key derivation (100,000 iterations)**.
* **KeePass-style Security (Passphrase + Key File):** Enhances security by combining a Master Passphrase with a private key file (`.key` containing a random 256-bit security key). Users can choose custom paths for both the Database file (`.enc`) and the Key file (`.key`) anywhere on their disk (e.g., in Google Drive / OneDrive for easy syncing and cross-platform compatibility between Windows and macOS).
* **Encrypted Vault Import/Export:** Securely backup and restore your entire vault data (including general terminal and AI settings) with custom **AES-256-GCM passphrase protection** for `.enc.json` files.
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

### 12. 📊 Real-Time Server Metrics Dashboard (Agentless)
* **Real-Time Monitoring:** Track remote server CPU (%), RAM (%), Disk (/), and Network I/O (KB/s download/upload) dynamically via lightweight SSH commands without installing any server agents.
* **Compact Header Badge & Detailed View:** Switch between a compact status bar badge and an expanded progress bar visualizer with color-coded overload alerts (Green -> Amber -> Red).

### 13. 🌉 Bastion Jump Host Support (1-3 Hops Multi-Hop Tunneling)
* **Private Subnet Access:** Seamlessly route SSH and SFTP connections through up to 3 layers of Bastion/Jump hosts into isolated internal networks.
* **Automatic Tunnel Chaining:** Built-in `ssh2` `forwardOut` stream handling handles multi-hop SSH authentication automatically.

### 14. 💡 Shell Smart Assistant & Log Anomaly Detection
* **Intelligent Auto-Completion:** Dynamic command recommendations bar built from shell command history, environment variables, and Linux/Kubernetes/Docker CLI templates.
* **Log Anomaly Detection:** Real-time stream monitor flags critical error keywords (`OutOfMemory`, `OOMKilled`, `Connection Refused`, `Segmentation Fault`, `FATAL ERROR`) with immediate red alert banners.

### 15. 🗄️ Visual ERD, Schema Diff & Visual Query Builder
* **Visual ERD Diagram:** View interactive database schema relationships, Primary Keys (PK), Foreign Keys (FK), and column data types.
* **Environment Schema Diff & Migration Generator:** Compare database schemas between 2 environments (e.g. Dev vs Staging) and automatically generate SQL migration scripts.
* **Visual SQL Query Builder:** Drag-and-drop table selection, column pickers, JOIN links, and WHERE filter builders generate standardized SQL queries without typing SQL by hand.

### 16. 📦 Advanced Data Pump & Cloud/Container Ecosystem
* **Streaming Dump & Restore:** High-performance database dump and restore supporting SQL DDL/DML, JSON, and Parquet columnar formats with optional AES-256 stream encryption.
* **Docker & Kubernetes Panel:** View running Docker containers and Kubernetes Pods, inspect real-time logs, and launch 1-click `docker exec` / `kubectl exec` interactive shell terminals.
* **Cloud Infrastructure Explorer:** Connect AWS, GCP, and Azure APIs to view Virtual Machines/Instances and connect via 1-click SSH/RDP.

### 17. 🛡️ Command Guard & Tamper-Evident Audit Logs (ISO 27001 / SOC 2)
* **Command Guard Approval Workflow:** Requires Master Passphrase or 6-digit TOTP authentication before executing destructive commands (`DROP DATABASE`, `systemctl stop`, `rm -rf`).
* **Tamper-Evident Audit Logs:** Compute SHA-256 HMAC checksums for every audit log entry to ensure tamper resistance and compliance readiness.

### 18. 🎨 Modern UI/UX Redesign & Workspace Layout
* **Two-Pane Activity Sidebar:** A professional Activity Rail (Servers, Security, Databases, DevOps) with a dynamic secondary panel reduces visual clutter.
* **Modern Aesthetic & Glassmorphism:** Deep dark theme with beautiful frosted glass (`backdrop-filter`) top bars and modern browser-style tab management.
* **Quick Server Cloning:** One-click "Clone Server" functionality instantly duplicates configurations for rapid infrastructure deployment.

### 19. ☁️ S3 / Cloud Object Storage Explorer
* **Native S3 Integration:** Extending our file manager to natively support AWS S3, Google Cloud Storage, MinIO, and DigitalOcean Spaces for direct object storage manipulation.

### 20. 🚇 SSH Tunnel & Port Forwarding Manager
* **Visual Tunnel Manager:** A visual manager for Local, Remote, and Dynamic SOCKS5 Port Forwarding to seamlessly connect to internal databases/services behind Jump Hosts.

### 21. 📊 Multi-Log Tail & Centralized Log Aggregator
* **Real-time Log Streaming:** Group and stream real-time logs (`tail -f`) from multiple SSH servers simultaneously on a single dashboard, complete with regex filtering and color-coded alerts.

### 22. 🤝 Team Collaboration & Encrypted Vault Sharing
* **E2EE Team Cloud Sync:** Securely sync, export, and share workspaces, connection lists, and command snippets with your team via GitHub Gist or Amazon S3 using end-to-end encrypted channels.

### 23. 🔌 Plugin System & Custom Connectors
* **Dynamic Node.js Plugin Hooks:** A lightweight JavaScript/TypeScript hooks mechanism allowing the community to build and load custom connectors for anything, like Elasticsearch, ClickHouse, Apache Kafka, or custom proprietary internal tools.

### 24. 🌐 Integrated Network Diagnostics Suite
* **Pre-Connection Validation:** Instantly test server/database network connectivity (Ping latency, trace routes, look up DNS records, or scan specific ports) directly from the Server/DB configuration modal before launching SSH, RDP, or Database clients.
* **Auto-Populated Targets:** Hostnames and IP addresses are automatically synchronized with the server profile configuration form for a frictionless diagnostic workflow.

### 25. 🤖 Terminal AI Autofix & Error Explainer (Bilingual EN/VI)
* **Intelligent Diagnostics & OS Detection:** Automatically detects target server OS (Rocky Linux 9, RHEL, Ubuntu, Debian, Alpine) and captures real-time terminal output without requiring manual copying. Contextually analyzes command failures (`command not found`, missing arguments, syntax errors, service failures, permission/OOM errors).
* **1-Click Autofix & Clean Markdown:** Generates distribution-tailored corrected commands (`dnf`/`yum` vs `apt`/`apk`) formatted in clean dark-theme code blocks with 1-click execution and copy buttons.

### 26. ⛵ Advanced Helm Release & CRD Explorer for Kubernetes
* **Helm Charts Management:** Visual management dashboard to search, install, upgrade, rollback (with revision histories), or uninstall Helm releases in a namespace directly from the 3-Pane explorer.
* **CRD Schema Inspector:** Hierarchical inspection of Custom Resource Definitions (CRDs) including API Groups, Scope types, and OpenAPI v3 validation specs.

### 27. 📑 Quick Commands Library & User Custom Command Manager
* **Bilingual Preset Commands:** Built-in template repository tailored for popular OSes (Red Hat, CentOS, Ubuntu, Debian) and common production software (PostgreSQL, Patroni, HAProxy, Keepalived, Kafka, MongoDB, Redis, MySQL, Vault, GitLab).
* **Command Customization:** Add, edit, and delete personal commands saved locally in persistent `localStorage` and shared instantly across sessions.
* **1-Click Execution & Copy:** Double-action triggers support copying command blocks or direct injection & execution into SSH sessions with smart line-break auto-detection.

### 28. 🖱️ Native In-Terminal Context Menu & Smart Shortcuts
* **Right-Click Context Menu:** Direct 1-click menu inside the SSH terminal window for Copy, Paste, Select All, and Clear Buffer.
* **Standard Keybindings & Middle-Click Paste:** Full support for `Ctrl+C` (on selection), `Ctrl+Shift+C` (copy), `Ctrl+V` / `Ctrl+Shift+V` (paste), and mouse middle-click paste.
* **Smart Auto-Completion:** Intelligent prefix-matching and sanitation that prevents command duplication and automatically removes accidental editor exit typos.

### 29. 👁️ Password Visibility Toggles (Show / Hide Password)
* **Visual Password Verification:** Integrated eye toggle icons (`👁️` / `👁️‍🗨️`) across all credential fields (Master Vault Passphrase, SSH ReAuth, Server Passwords, SSH Key Import Passphrase, Command Guard Approvals, and HashiCorp Vault / AI API Keys).

### 30. ⌨️ Interactive Ghost-Text Inline Autocomplete (Fig / Warp style)
* **Real-Time Predictive Overlay:** Ghost-text suggestions appear directly in the terminal cursor coordinates based on command history and system context.
* **1-Key Acceptance:** Press `Tab` or `Right Arrow (→)` to accept suggestions immediately; press `Esc` to dismiss.

### 31. 🛡️ Workspace & Environment Isolation
* **Color Tagging & Visual Boundaries:** Color indicators on the server list and tabs (`Production = Red`, `Staging = Yellow`, `Dev = Green`).
* **Production Danger Zone Warning:** Fullscreen red glowing perimeter and top warning banner alert to prevent catastrophic unintended command execution on live production servers.

### 32. 📡 Quick Web-based Remote Share (Live Pairing & Zero-Install Web Client)
* **P2P Real-Time Streaming:** Share live terminal sessions via WebRTC with 256-bit cryptographically secure token handshakes.
* **Read-Only & Interactive Modes:** Teammates can watch in real time or collaborate and co-type directly via browser on GitHub Pages or custom self-hosted Web relay servers.

### 33. 📐 Custom UI Density (Compact Mode)
* **Optimized for Small Screens:** Easily switch to Compact Mode in Settings to reduce toolbar heights, sidebar widths, and tab paddings for maximum terminal real-estate.

### 34. 🔄 Responsive Window Resizing & Viewport Auto-Fit
* **Seamless Screen Transitions:** Automatically recalculates PTY window dimensions (`cols` & `rows`) with debounce when toggling between fullscreen and windowed modes.
* **Auto-Scroll to Cursor/Prompt:** Guarantees bottom-line prompt visibility and prevents active command lines from getting cut off when shrinking the application window.

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
| `Cmd + C` / `Ctrl + Shift + C` / `Ctrl + C (Selection)` | Copy selected text from SSH Terminal |
| `Cmd + V` / `Ctrl + V` / `Ctrl + Shift + V` | Paste text into SSH Terminal |
| `Middle Click` / `Right Click` | Paste from Clipboard / Open Terminal Context Menu |
| `Esc` | Close active modals |

---

## 📁 Project Structure

```
terminal/
├── electron/                   # Electron Main & Preload Processes
│   ├── main.ts                 # Main Process Entry Point & IPC Handlers
│   ├── preload.ts              # Secure Preload Script (Exposing window.api)
│   └── services/               # Backend encryption, network, DB & AI services
│       ├── AuditLogService.ts  # Audit log management & HMAC checksums
│       ├── SSHTunnelService.ts # SSH local/remote/dynamic forwarding tunnels
│       ├── aiService.ts        # Gemini, OpenAI & Custom Model REST API integration
│       ├── databaseService.ts  # Drivers for MySQL, PostgreSQL & Redis
│       ├── hashicorpVaultService.ts # HashiCorp Vault REST API integration
│       ├── logTailService.ts   # Real-time multi-log streaming service
│       ├── netDiagnosticsService.ts # Network diagnostics utility (Ping, DNS, Port scan, etc.)
│       ├── pluginService.ts    # Lightweight JS/TS plugin hook manager
│       ├── rdpService.ts       # RDP session & credential injection
│       ├── s3Service.ts        # S3 & cloud object storage operations
│       ├── sftpService.ts      # SFTP file transfer & progress events
│       ├── sshService.ts       # SSH2 PTY stream management
│       ├── teamSyncService.ts  # E2EE Gist/S3 synchronization
│       └── vaultService.ts     # AES-256-GCM vault encryption
├── src/                        # React Frontend (Renderer Process)
│   ├── App.tsx                 # Main layout, tab management & modals
│   ├── components/             # React UI Components
│   │   ├── AIAssistantDrawer.tsx # Docked AI Assistant Side Panel
│   │   ├── AuditLogManager.tsx # Tamper-Evident audit log console
│   │   ├── CloudExplorer.tsx   # Cloud VMs & instance explorer
│   │   ├── CommandGuardApprovalModal.tsx # Destructive actions auth guard
│   │   ├── CustomConnectorPanel.tsx # Interface for plugins & connectors
│   │   ├── Dashboard.tsx       # System health, quick sessions & overview
│   │   ├── DataPump.tsx        # High-performance DB streaming export/import
│   │   ├── DatabaseExplorer.tsx  # Database Browser & Query Console
│   │   ├── DockerK8sPanel.tsx  # Containers & Pods dashboard
│   │   ├── ERDAndSchemaDiff.tsx  # Visual ERD & DB comparison tool
│   │   ├── ImportExportModal.tsx # Vault backups import & export
│   │   ├── KeyManagerModal.tsx # SSH key pair generator & vault
│   │   ├── LockScreen.tsx      # Secure app lock panel
│   │   ├── LogAggregator.tsx   # Multi-log tail aggregator dashboard
│   │   ├── MultiExecManager.tsx # Parallel command runner panel
│   │   ├── OTPManager.tsx      # Real-time TOTP 2FA Authenticator
│   │   ├── PasswordManager.tsx # KeePass-style Password Manager
│   │   ├── PluginManagerModal.tsx # Plugin list & configuration modal
│   │   ├── RDPViewer.tsx       # Remote Desktop Window
│   │   ├── ReAuthModal.tsx     # Session timeout re-authentication modal
│   │   ├── S3Explorer.tsx      # Cloud object storage browser
│   │   ├── SFTPExplorer.tsx    # Dual-pane SFTP Browser
│   │   ├── SSHTerminal.tsx     # Xterm SSH Terminal Window
│   │   ├── SSHTunnelManager.tsx # SSH port forwarding config UI
│   │   ├── ServerMetricsDashboard.tsx # Agentless server metrics visualizer
│   │   ├── ServerModal.tsx     # Server profile creator & editor
│   │   ├── SettingsModal.tsx   # Customization & app configurations
│   │   ├── ShellSmartAssistant.tsx # CLI auto-complete assistant
│   │   ├── Sidebar.tsx         # Server & Security list (supports 50px mini-bar mode)
│   │   ├── TabBar.tsx          # Multi-process Tab Bar
│   │   ├── TeamSyncModal.tsx   # Gist/S3 E2EE synchronization UI
│   │   └── TopBar.tsx          # 80px padded header bar for macOS
│   ├── types/                  # TypeScript Interfaces & API types
│   └── index.css               # Dark Mode Design System
├── vite.config.ts              # Vite & Rollup configuration
└── package.json                # Dependencies & Build scripts
```

---

## 🛡️ Security Auditing & Best Practices

To ensure OmniTerminal runs securely and without vulnerabilities, follow these tools and practices:

### 1. Dependency Vulnerability Audits
Run the built-in security auditing script to check for known vulnerabilities in external libraries:
```bash
npm run lint:security
```
This runs `npm audit` underneath and scans installed packages.

### 2. Static Code Analysis (SAST)
We use `eslint-plugin-security` to scan project code for security hotspots (e.g., vulnerable regex patterns, insecure imports, unsafe execution points):
1. Configure your IDE to run ESLint with the security ruleset active.
2. Run ESLint locally to scan the workspace.

### 3. Electron Hardening Rules
* **Context Isolation:** Enabled (`contextIsolation: true` in Electron main process config) to isolate renderer processes from raw Node.js API execution.
* **Preload Scripting:** Node.js capabilities are exposed safely to the renderer via `contextBridge.revealInMainWorld` in [preload.ts](file:///c:/Devsecops/terminal/electron/preload.ts).
* **Command Sanitization:** Ensure inputs are sanitized before calling system-level handlers in database, SSH, and RDP connectors.

---

## 📄 License

Distributed under the **MIT License**.
