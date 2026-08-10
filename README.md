# 🚀 OmniTerminal - Multi-Protocol Server & Database Management Hub

> 🌐 **Language:** **English** | [Tiếng Việt](README_VN.md)

**OmniTerminal** is a high-performance, cross-platform desktop application (macOS, Windows, Linux) designed for server administration and database management. Built with a sleek Dark Mode UI, enterprise-grade encryption, and a built-in **DevOps & Database AI Assistant**.

---

## 🌟 Key Features

### 1. 🔒 Encrypted Master Passphrase & Local Vault
* **Master Passphrase Protection:** All server configurations, credentials, and private keys are encrypted using **AES-256-GCM** combined with **PBKDF2 key derivation (100,000 iterations)**.
* **SSH Key Vault Manager:** Generate secure **RSA 4096-bit** and **Ed25519** key pairs directly within the application with one-click public key copying for `~/.ssh/authorized_keys`.

### 2. 🛡️ HashiCorp Vault Enterprise Integration
* **Vault REST API Support:** Seamlessly connect to HashiCorp Vault clusters via **Vault Token** or **AppRole (Role ID + Secret ID)**, including namespace support for enterprise environments.
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
* **Multi-Engine Support:** Native driver support for **MySQL / MariaDB**, **PostgreSQL**, **Redis Cache**, and **MongoDB**.
* **Database & Table Tree Browser:** View databases, schemas, tables, and Redis keys in an organized sidebar hierarchy.
* **SQL Query Console:** Interactive SQL editor with `Ctrl + Enter` (or `Cmd + Enter`) execution shortcut.
* **Data Grid & CSV Export:** Styled dark-mode data table view with row count breakdown, execution time measurement (ms), and one-click CSV export.

### 7. 🤖 DevOps & Database AI Assistant
* **Flexible Provider Support:** Native integration with **Google Gemini AI** (`gemini-1.5-flash`, `gemini-2.0-flash`), **OpenAI** (`gpt-4o`, `gpt-4o-mini`), and **Custom Endpoints (Ollama / vLLM / LocalAI / DeepSeek)**.
* **Free-Text Model Selection:** Type any model string directly into the model field with autocomplete recommendations.
* **Auto-Capture Live Context:** One-click **"📥 Auto-Capture Live Terminal / DB Context"** button imports recent terminal lines, active SQL queries, and error stack traces directly into the AI prompt.
* **Rich Markdown Formatter:** Clean HTML/Markdown renderer with syntax highlighting and one-click **"Paste to Terminal"** buttons.

### 8. ⚡ Multi-Tab Workspace & Docked AI Side Panel
* **Persistent Tab Sessions:** Active SSH, SFTP, RDP, and Database sessions persist in DOM memory when switching tabs.
* **Sidebar Collapse Mode (`Ctrl + B` / `Cmd + B`):** Toggle server list sidebar into a 50px compact mini-bar to maximize terminal screen real estate.
* **Docked AI Side Panel:** The AI Assistant operates as a docked flex panel alongside the terminal without covering or obscuring terminal text.

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
│   │   ├── Sidebar.tsx         # Server list (supports 50px mini-bar mode)
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
