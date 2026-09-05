# Neo File Drop 🚀

> **A production-ready, mobile-first, login-free web portal for uploading files directly to Google Drive using official Google Drive Resumable Uploads.**

![Neo File Drop Banner](public/images/neo-character.png)

---

## ✨ Features

- **Zero Authentication Required**: Upload files directly to Google Drive without requiring users to log in or create Google accounts.
- **Large File Support (1 GB+)**: Uses Google Drive's official Resumable Upload protocol (`uploadType=resumable`). Files are streamed in 5 MiB slices using `Blob.slice()` with zero full-file memory buffering.
- **Network Resilience & Auto-Resume**: Automatically detects network disconnections (`navigator.onLine`). Automatically pauses, queries byte offsets upon reconnection (`Content-Range: bytes */TOTAL`), and resumes without restarting.
- **Interactive Neo Mascot Progress Bar**: Neo travels dynamically from 0% to 100% along the progress track with contextual status bubbles and celebration confetti.
- **Dedicated Submissions**: Organizes uploads into timestamped folders: `[Folder Name] - [YYYY-MM-DD] - [6-Char UID]`.
- **Pre-Configured for Netlify**: Includes `netlify.toml` with SPA redirects, caching rules, and security headers.

---

## 🏗️ Architecture

```
Neo File Drop
├── apps-script/                 # Google Apps Script Backend
│   ├── Code.gs                  # Main router (doGet, doPost)
│   ├── Config.gs                # Target Drive Folder ID configuration
│   ├── DriveService.gs          # Folder creation in Google Drive
│   ├── UploadService.gs         # Resumable session init & chunk relay
│   ├── Validation.gs            # Input sanitization
│   └── Security.gs              # Safe JSON responses & audit logging
├── src/
│   ├── components/              # Modular UI components
│   ├── hooks/                   # useUploadManager & useFileQueue
│   ├── services/                # Google Drive resumable uploader
│   └── utils/                   # Speed, ETA, byte formatting
├── netlify.toml                 # Netlify build & redirect rules
└── package.json
```

---

## 🚀 Quick Start

### 1. Backend Setup (Google Apps Script)

1. Open [script.google.com](https://script.google.com) and create a **New project**.
2. Copy the files from [`apps-script/`](apps-script/) into your project.
3. Open `Config.gs` and set your `PARENT_FOLDER_ID` (the Google Drive folder ID where uploads should be saved).
4. Under **Services (+)** on the left sidebar, add **Google Drive API** (v3).
5. Click **Deploy** → **New deployment** → Choose **Web app**:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
6. Copy the resulting **Web app URL**.

### 2. Frontend Local Development

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/iam-neo/Neo-File-Drop.git
   cd Neo-File-Drop
   npm install
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
   Set `VITE_APPS_SCRIPT_URL` to your Apps Script Web App URL.

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## 🌐 Deploying to Netlify

### Continuous Deployment via GitHub
1. Push this repository to GitHub.
2. Link the repository in [Netlify](https://app.netlify.com).
3. In Netlify Site Settings > **Environment variables**, add:
   - `VITE_APPS_SCRIPT_URL`: Your Apps Script Web App URL.
4. Netlify will build automatically using `netlify.toml`.

---

## 📄 License

MIT License. Free for personal and commercial use.
