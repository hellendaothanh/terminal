# 🚀 OmniTerminal - Multi-Protocol Server & Database Management Hub

**OmniTerminal** là ứng dụng desktop quản trị hệ thống máy chủ và cơ sở dữ liệu đa nền tảng (macOS, Windows, Linux) với hiệu năng cao, giao diện Dark Mode sang trọng, tích hợp bảo mật doanh nghiệp và **Trợ Lý AI Chuyên Sâu (DevOps & Database AI Assistant)**.

---

## 🌟 Các Tính Năng Nổi Bật (Key Features)

### 1. 🔒 Bảo Mật Kho Dữ Liệu Mã Hóa (Master Passphrase & Vault)
* **Master Passphrase Vault:** Mọi thông tin máy chủ, tài khoản, khóa bí mật đều được mã hóa bằng thuật toán **AES-256-GCM** kết hợp hàm tạo khóa **PBKDF2 (100,000 vòng lặp)**.
* **Quản Lý Khóa SSH Key Vault:** Sinh cặp khóa an toàn **RSA 4096-bit** và **Ed25519** ngay trong ứng dụng, hỗ trợ copy nhanh Public Key để đưa vào `~/.ssh/authorized_keys`.

### 2. 🛡️ Tích Hợp HashiCorp Vault (Bảo Mật Doanh Nghiệp)
* **Kết Nối Vault REST API:** Hỗ trợ kết nối máy chủ HashiCorp Vault qua **Vault Token** hoặc **AppRole (Role ID + Secret ID)**, hỗ trợ Namespace cho môi trường doanh nghiệp.
* **Truy Xuất Secret Động (Dynamic Secret Fetching):** Tự động truy xuất mật khẩu máy chủ/CSDL trực tiếp từ HashiCorp Vault thời gian thực ngay trước khi mở phiên kết nối SSH, SFTP, RDP hoặc Database.

### 3. 💻 SSH Terminal Hiệu Năng Cao
* **Xterm Engine Mạnh Mẽ:** Tích hợp engine `@xterm/xterm` hỗ trợ PTY stream hai chiều tốc độ cao.
* **Căn Chỉnh Tự Động (Auto Resizing):** Lắng nghe thay đổi kích thước cửa sổ (`ResizeObserver` + `@xterm/addon-fit`) để điều chỉnh dòng/cột (`cols/rows`) tự động.
* **Tùy Biến Giao Diện:** Tùy chọn Font chữ (JetBrains Mono, Menlo...), cỡ chữ và các chủ đề màu sắc cao cấp (One Dark, Dracula, Monokai).
* **Nút Thao Tác Nhanh:** Copy/Paste 1-click, Tăng/Giảm cỡ chữ thời gian thực, Reconnect nhanh khi gián đoạn mạng.

### 4. 📂 Quản Lý Tệp Tin SFTP / SCP & Progress Tracking Realtime
* **Giao Diện Duyệt 2 Ngăn:** Duyệt cây thư mục từ xa trực quan, tạo mới/xóa thư mục (`mkdir`, `delete`).
* **Tiến Trình Realtime:** Floating card hiển thị phần trăm (%), tốc độ truyền dữ liệu và dung lượng `đã nạp / tổng dung lượng` (MB/GB) khi Upload/Download tệp tin lớn.

### 5. 🖥️ Remote Desktop (RDP) & Auto Credential Injection
* **Kết Nối TCP Socket Check:** Kiểm tra thực tế cổng 3389 trước khi kết nối.
* **Tự Động Đăng Ký Mật Khẩu:** Tự nạp Credential vào *Windows Credential Manager* (`cmdkey`) và *macOS Keychain* (`security`) giúp mở RDP tự động đăng nhập không hỏi lại mật khẩu.
* **Auto Resolution Fit:** Tự tính toán độ phân giải màn hình RDP khớp chuẩn với tab hiện tại.

### 6. 🗄️ Quản Lý Cơ Sở Dữ Liệu Natively (Database Management System)
* **Đa CSDL:** Kết nối trực tiếp **MySQL / MariaDB**, **PostgreSQL**, **Redis Cache** và **MongoDB**.
* **Tree View:** Duyệt danh sách Databases, Schemas, Bảng (Tables) và Keys.
* **Query Console & SQL Editor:** Soạn thảo SQL linh hoạt, phím tắt `Ctrl + Enter` (hoặc `Cmd + Enter`) để thực thi.
* **Data Grid & Export CSV:** Hiển thị kết quả dưới dạng bảng tối màu chuẩn đẹp, đo thời gian thực thi (ms) và xuất dữ liệu nhanh ra file `.csv`.

### 7. 🤖 Trợ Lý AI Chuyên Sâu (DevOps & Database AI Assistant)
* **Nhà Cung Cấp Linh Hoạt:** Hỗ trợ **Google Gemini AI** (`gemini-1.5-flash`, `gemini-2.0-flash`), **OpenAI** (`gpt-4o`, `gpt-4o-mini`) và **Custom API (Ollama / vLLM / LocalAI / DeepSeek)** với Custom Base URL.
* **Tự Do Nhập Model Name:** Cho phép gõ trực tiếp tên Model bất kỳ bạn muốn.
* **Auto-Capture Live Context:** Nút **"📥 Nạp Tự Động Từ Màn Hình Terminal/CSDL"** tự nạp 40 dòng log Terminal màn hình hoặc câu lệnh/vết lỗi SQL thời gian thực cho AI phân tích.
* **Định Dạng Markdown Chuẩn Đẹp:** Tự động format Markdown chỉn chu, có nút **"Dán Lệnh"** trực tiếp từ code AI vào SSH Terminal.

### 8. ⚡ Workspace Đa Tab & Docked Side Panel
* **Persistent Tab Sessions:** Các tab SSH, SFTP, RDP, Database duy trì kết nối liên tục trong bộ bộ nhớ khi chuyển tab.
* **Sidebar Collapse Mode (`Ctrl + B` / `Cmd + B`):** Nút thu gọn Sidebar danh sách máy chủ về dạng Mini-bar (50px) để tối đa hóa không gian màn hình Terminal.
* **Docked AI Side Panel:** Khung Trợ Lý AI đính kèm cạnh bên dạng Docked Panel giúp xem Terminal và hỏi đáp AI song song không lo bị che khuất.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

* **Core Framework:** Electron + React 18 + TypeScript + Vite
* **Terminal Engine:** `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`
* **Network & Database Drivers:** `ssh2`, `ssh2-sftp-client`, `mysql2`, `pg`, `ioredis`
* **Icons & Styling:** Lucide React, Custom Dark Mode Design System
* **Encryption:** Node.js Crypto (`crypto.pbkdf2Sync`, `crypto.createCipheriv` AES-256-GCM)

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng (Installation)

### Yêu cầu hệ thống:
* **Node.js**: phiên bản >= 18.0.0
* **npm** hoặc **yarn** / **pnpm**

### Các bước thực hiện:

1. **Clone repository và cài đặt dependencies:**
   ```bash
   git clone https://github.com/your-username/omni-terminal.git
   cd omni-terminal
   npm install
   ```

2. **Chạy ứng dụng ở chế độ Phát triển (Development Mode):**
   ```bash
   npm run dev
   ```

3. **Biên dịch và đóng gói sản phẩm (Production Build):**
   ```bash
   npm run build
   ```

---

## ⌨️ Bảng Phím Tắt Tiện Lợi (Shortcuts)

| Phím Tắt (Mac / Windows) | Chức Năng |
| :--- | :--- |
| `Cmd + B` / `Ctrl + B` | Bật / Tắt thu gọn danh sách Máy Chủ bên trái (Sidebar) |
| `Cmd + Enter` / `Ctrl + Enter` | Thực thi câu lệnh SQL trong Console Database Explorer |
| `Cmd + V` / `Shift + Insert` | Dán văn bản vào cửa sổ SSH Terminal |
| `Esc` | Đóng các khung Modal đang mở |

---

## 📁 Cấu Trúc Mã Nguồn Dự Án (Project Structure)

```
terminal/
├── electron/                   # Tiến trình chính Electron (Main & Preload)
│   ├── main.ts                 # Main Process Entry Point & IPC Handlers
│   ├── preload.ts              # Preload Script an toàn (Expose window.api)
│   └── services/               # Dịch vụ backend mã hóa, kết nối SSH/SFTP/DB/AI
│       ├── aiService.ts        # Tích hợp REST API Gemini, OpenAI, Custom Model
│       ├── databaseService.ts  # Driver kết nối MySQL, PostgreSQL, Redis
│       ├── hashicorpVaultService.ts # Kết nối HashiCorp Vault REST API
│       ├── rdpService.ts       # Quản lý phiên RDP & nạp Credential
│       ├── sftpService.ts      # Quản lý thao tác File & Tiến trình SFTP
│       ├── sshService.ts       # Quản lý SSH2 PTY stream
│       └── vaultService.ts     # Mã hóa kho dữ liệu AES-256-GCM
├── src/                        # Tiến trình hiển thị giao diện React (Renderer)
│   ├── App.tsx                 # Quản lý Tabs, Layout & Modals
│   ├── components/             # Các React Component UI
│   │   ├── AIAssistantDrawer.tsx # Bảng Trợ Lý AI đính kèm cạnh bên
│   │   ├── DatabaseExplorer.tsx  # Trình duyệt & Quản lý CSDL
│   │   ├── SSHTerminal.tsx     # Cửa sổ SSH Terminal Xterm
│   │   ├── SFTPExplorer.tsx    # Cửa sổ Duyệt File SFTP
│   │   ├── RDPViewer.tsx       # Cửa sổ Remote Desktop
│   │   ├── Sidebar.tsx         # Thanh danh sách Máy chủ (Hỗ trợ Mini-bar)
│   │   ├── TabBar.tsx          # Thanh TabBar đa tiến trình
│   │   └── TopBar.tsx          # Thanh Tiêu Đề lùi lề 80px cho macOS
│   ├── types/                  # Khai báo TypeScript Interfaces & APIs
│   └── index.css               # Design System Dark Mode
├── vite.config.ts              # Cấu hình Vite & Rollup Bundler
└── package.json                # Dependencies & Build Scripts
```

---

## 📄 Giấy Phép (License)

Dự án được phân phối dưới giấy phép **MIT License**.
