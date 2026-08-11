# 🚀 OmniTerminal - Multi-Protocol Server & Database Management Hub

> 🌐 **Ngôn ngữ:** [English](README.md) | **Tiếng Việt**

**OmniTerminal** là ứng dụng desktop quản trị hệ thống máy chủ và cơ sở dữ liệu đa nền tảng (macOS, Windows, Linux) với hiệu năng cao, giao diện Dark Mode sang trọng, tích hợp bảo mật doanh nghiệp và **Trợ Lý AI Chuyên Sâu (DevOps & Database AI Assistant)**.

---

## 🌟 Các Tính Năng Nổi Bật (Key Features)

### 1. 🔒 Bảo Mật Kho Dữ Liệu Mã Hóa (Master Passphrase & Vault)
* **Master Passphrase Vault:** Mọi thông tin máy chủ, tài khoản, khóa bí mật đều được mã hóa bằng thuật toán **AES-256-GCM** kết hợp hàm tạo khóa **PBKDF2 (100,000 vòng lặp)**.
* **Sao Lưu & Phục Hồi Dữ Liệu Mã Hóa (Encrypted Vault Backup):** Xuất và nhập toàn bộ kho dữ liệu an toàn với mật khẩu mã hóa riêng (Passphrase) chuẩn **AES-256-GCM** chống lộ thông tin.
* **Quản Lý Khóa SSH Key Vault:** Sinh cặp khóa an toàn **RSA 4096-bit** và **Ed25519** ngay trong ứng dụng, hỗ trợ copy nhanh Public Key để đưa vào `~/.ssh/authorized_keys`.

### 2. 🛡️ Tích Hợp HashiCorp Vault (Bảo Mật Doanh Nghiệp)
* **Kết Nối Vault REST API:** Hỗ trợ kết nối máy chủ HashiCorp Vault qua **Vault Token** hoặc **AppRole (Role ID + Secret ID)**, hỗ trợ Namespace cho môi trường doanh nghiệp.
* **Hỗ Trợ Chứng Chỉ SSL Tự Ký & Cụm Cluster HA Standby:** Hỗ trợ kết nối mượt mà tới các cụm máy chủ Vault nội bộ dùng SSL/TLS tự ký và tự nhận diện phản hồi HTTP 429 chuẩn của Standby Node trong cụm High-Availability.
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
* **Đa CSDL:** Kết nối trực tiếp **MySQL / MariaDB**, **PostgreSQL** (Hỗ trợ kết nối SSL & quét đa Schema), **Redis Cache** và **MongoDB**.
* **Tree View & Tự Động Chuyển DB:** Duyệt danh sách Databases, Custom Schemas, Bảng (Tables) và Keys với tính năng tự chuyển vùng kết nối Database linh hoạt.
* **Query Console & SQL Editor:** Soạn thảo SQL linh hoạt, phím tắt `Ctrl + Enter` (hoặc `Cmd + Enter`) để thực thi.
* **Data Grid & Export CSV:** Hiển thị kết quả dưới dạng bảng tối màu chuẩn đẹp, đo thời gian thực thi (ms) và xuất dữ liệu nhanh ra file `.csv`.

### 7. 🤖 Trợ Lý AI Chuyên Sâu (DevOps & Database AI Assistant)
* **Nhà Cung Cấp Linh Hoạt:** Hỗ trợ **Google Gemini AI** (`gemini-1.5-flash`, `gemini-2.0-flash`), **OpenAI** (`gpt-4o`, `gpt-4o-mini`) và **Custom API (Ollama / vLLM / LocalAI / DeepSeek)** với Custom Base URL.
* **Tự Do Nhập Model Name:** Cho phép gõ trực tiếp tên Model bất kỳ bạn muốn.
* **Auto-Capture Live Context:** Nút **"📥 Nạp Tự Động Từ Màn Hình Terminal/CSDL"** tự nạp 40 dòng log Terminal màn hình hoặc câu lệnh/vết lỗi SQL thời gian thực cho AI phân tích.
* **Định Dạng Markdown Chuẩn Đẹp:** Tự động format Markdown chỉn chu, có nút **"Dán Lệnh"** trực tiếp từ code AI vào SSH Terminal.

### 8. 🔑 Quản Lý Mật Khẩu (Password Manager kiểu KeePass)
* **Lưu Trữ Mã Hóa An Toàn:** Mã hóa và lưu trữ không giới hạn thông tin đăng nhập (Tiêu đề, Tên đăng nhập/Email, Mật khẩu, URL, Ghi chú) bằng AES-256-GCM.
* **Trình Sinh Mật Khẩu Tự Động:** Tùy chỉnh độ dài (8-64 ký tự) với tùy chọn bật/tắt Chữ hoa (A-Z), Chữ số (0-9) và Ký tự đặc biệt (@#$).
* **Thao Tác Clipboard Thông Minh:** Copy Tên đăng nhập và Mật khẩu 1-click với phản hồi giao diện trực quan và tính năng ẩn/hiện mật khẩu.

### 9. 🛡️ Quản Lý Mã Xác Thực OTP Thời Gian Thực (2FA)
* **Chuẩn Thuật Toán TOTP:** Tương thích hoàn toàn với Google Authenticator / Authy thông qua `otplib`.
* **Đồng Hồ Đếm Ngược 30 Giây:** Hiển thị thời gian còn lại đếm ngược trực quan trước khi tự động đổi mã 6 chữ số mới.
* **Sao Chép Mã Một Chạm:** Định dạng chuỗi số thoáng (ví dụ `123 456`) dễ nhìn cùng nút copy tiện lợi.

### 10. ⚡ Thư Viện Script & Chạy Lệnh Hàng Loạt (Multi-Exec)
* **Quản Lý Snippet Snippets:** Lưu trữ các đoạn mã Shell/Bash và câu lệnh SQL tái sử dụng với tính năng tìm kiếm và kích hoạt chạy hàng loạt 1-click.
* **Bộ Thực Thi Song Song (Parallel Execution Engine):** Chạy đồng thời một câu lệnh SSH hoặc SQL trên hàng loạt máy chủ/CSDL bất đồng bộ.
* **Hiển Thị Kết Quả Song Song:** Giao diện lưới dạng card hiển thị log stdout, stderr, đo thời gian thực thi (ms) và trạng thái thành công/thất bại theo thời gian thực.

### 11. 🛡️ Ghi Vết & Nhật Ký Kiểm Toán Phiên Làm Việc (Session Recording & Audit Logs)
* **Ghi Vết Chuẩn Asciinema v2:** Tự động ghi vết phiên làm việc SSH ra định dạng chuẩn `.cast` (lưu trữ đầy đủ luồng input/output và mốc thời gian offset).
* **Trình Phát Lại Phiên SSH (Asciinema Session Player):** Phát lại trực tiếp nội dung phiên SSH ngay trong ứng dụng với các nút Play, Pause, Điều chỉnh tốc độ (`1x`, `2x`, `4x`) và thanh tua thời gian.
* **Phát Hiện & Cảnh Báo Lệnh Nguy Hiểm:** Kiểm toán thời gian thực các câu lệnh SQL và SSH với bộ đánh giá rủi ro tự động (Cảnh báo màu đỏ cho `rm -rf`, `DROP TABLE`, `chmod 777`).
* **Xuất Báo Cáo Nhật Ký:** Cho phép xuất dữ liệu kiểm toán ra file định dạng `.cast` hoặc file báo cáo `.txt`.

### 13. 📊 Giám Sát Tài Nguyên Máy Chủ Real-time (Agentless Server Metrics)
* **Theo Dõi Thời Gian Thực:** Giám sát dung lượng CPU (%), RAM (%), Ổ đĩa (/) và Băng thông mạng Network I/O (KB/s Download/Upload) của máy chủ từ xa thông qua kết nối SSH nhẹ nhàng không cần cài agent.
* **Thanh Trạng Thái Linh Hoạt:** Chuyển đổi giữa định dạng thu gọn trên thanh tiêu đề và bảng điều khiển mở rộng với màu sắc cảnh báo rủi ro quá tải (Xanh -> Vàng -> Đỏ).

### 14. 🌉 Quản Lý Bastion Jump Host (Đường Hầm Nhảy Cóc 1-3 Lớp)
* **Truy Cập Mạng Nội Bộ (Private Subnet):** Cho phép kết nối an toàn qua 1 đến 3 máy chủ Bastion/Jump trung gian để truy cập máy chủ nằm sâu trong mạng nội bộ.
* **Xử Lý Chuỗi Kết Nối Tự Động:** Tích hợp luồng `forwardOut` của `ssh2` tự động hóa chuỗi xác thực qua nhiều Hop.

### 15. 💡 Shell Smart Assistant & Tự Động Phát Hiện Sự Cố Log
* **Thanh Gợi Ý Lệnh Thông Minh:** Tự động đưa ra gợi ý câu lệnh dựa trên lịch sử gõ, biến môi trường và mẫu CLI Linux/Kubernetes/Docker phổ biến.
* **Cảnh Báo Lỗi Log Thời Gian Thực:** Tự động phát hiện các từ khóa lỗi nghiêm trọng (`OutOfMemory`, `OOMKilled`, `Connection Refused`, `Segmentation Fault`, `FATAL ERROR`) và hiển thị banner cảnh báo lập tức.

### 16. 🗄️ Visual ERD, Schema Diff & Visual Query Builder
* **Sơ Đồ Quan Hệ ERD Trực Quan:** Hiển thị cây liên kết bảng, Khóa chính (PK), Khóa ngoại (FK) và kiểu dữ liệu từng cột.
* **So Sánh Cấu Trúc (Schema Diff) & Sinh Migration:** So sánh cấu trúc CSDL giữa 2 môi trường (ví dụ Dev vs Staging) và tự động tạo script SQL Migration.
* **Visual SQL Query Builder:** Tự động sinh câu lệnh SQL bằng thao tác chọn bảng, chọn cột, thiết lập điều kiện JOIN và WHERE mà không cần gõ SQL thủ công.

### 17. 📦 Export/Import Data Pump Stream & Hệ Sinh Thái Cloud/Container
* **Streaming Dump & Restore Dữ Liệu Lớn:** Sao lưu/khôi phục CSDL dung lượng lớn hỗ trợ định dạng SQL DDL/DML, JSON, Parquet kèm tùy chọn mã hóa stream AES-256.
* **Docker & Kubernetes Panel:** Xem danh sách Containers và K8s Pods, theo dõi log thời gian thực và mở Terminal `docker exec` / `kubectl exec` 1-click.
* **Cloud Infrastructure Explorer:** Kết nối API AWS, GCP, Azure hiển thị danh sách Instance/VM và mở kết nối SSH/RDP 1-click.

### 18. 🛡️ Command Guard Phê Duyệt Lệnh & Tamper-Evident Audit Logs (ISO 27001 / SOC 2)
* **Quy Trình Phê Duyệt Lệnh Nguy Hiểm (Command Guard):** Yêu cầu xác thực Master Passphrase hoặc mã OTP (6 chữ số) trước khi chạy các lệnh nguy hiểm (`DROP DATABASE`, `systemctl stop`, `rm -rf`).
* **Audit Log Chống Sửa Đổi (Tamper-Evident):** Tự động tính toán mã băm SHA-256 HMAC cho từng bản ghi nhật ký kiểm toán đảm bảo tuân thủ tiêu chuẩn an toàn ISO 27001 / SOC 2.

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
   git clone https://github.com/hellendaothanh/terminal.git
   cd terminal
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
│   │   ├── PasswordManager.tsx # Trình quản lý Mật khẩu kiểu KeePass
│   │   ├── OTPManager.tsx      # Trình tạo mã OTP 2FA thời gian thực
│   │   ├── Sidebar.tsx         # Thanh danh sách Máy chủ & Bảo mật (Hỗ trợ Mini-bar)
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
