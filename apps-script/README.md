# Neo File Drop — Apps Script Backend

## Setup Instructions

### 1. Create a New Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click **New project**
3. Name it: **Neo File Drop Backend**

### 2. Add All Script Files

Copy each `.gs` file from this directory into your Apps Script project:

| File | Purpose |
|------|---------|
| `Config.gs` | Configuration constants (set your parent folder ID here!) |
| `Code.gs` | Main entry point — `doGet()` and `doPost()` router |
| `DriveService.gs` | Google Drive folder creation |
| `UploadService.gs` | Resumable upload init, chunk relay, and status query |
| `Validation.gs` | Input validation helpers |
| `Security.gs` | Rate limiting, logging, and JSON response helpers |

### 3. Configure Your Parent Folder ID

1. Open **Config.gs**
2. Replace `'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE'` with your actual Google Drive folder ID
3. To find your folder ID: Open the folder in Drive → The ID is the last part of the URL:
   ```
   https://drive.google.com/drive/folders/XXXXXXXXXXXXXXXXXXXXXXXXXX
                                           ^^^^^^^^^^^^^^^^^^^^^^^^
                                           This is your folder ID
   ```

### 4. Enable Google Drive API

1. In Apps Script editor, click **Services** (+ icon) on the left sidebar
2. Find **Google Drive API** (Drive API v3)
3. Click **Add**

### 5. Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to **Select type** → Choose **Web app**
3. Configure:
   - **Description**: Neo File Drop v1.0
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone**
4. Click **Deploy**
5. **Copy the Web app URL** — you'll paste this into the Neo File Drop frontend settings

### 6. Authorize Permissions

The first time you deploy, Google will ask you to authorize:
- Google Drive (to create folders and upload files)

Click **Review Permissions** → Choose your account → **Allow**

> **Note**: If you see "This app isn't verified", click **Advanced** → **Go to Neo File Drop Backend (unsafe)** → **Allow**. This is expected for personal Apps Script projects.

### 7. Connect the Frontend

1. Open Neo File Drop in your browser
2. Click the **Settings** icon (⚙️) in the header
3. Paste your Web App URL
4. Click **Test Connection** to verify
5. Click **Save & Close**

You're ready to upload! 🎉

---

## API Reference

All requests use `POST` with `Content-Type: text/plain;charset=utf-8` and a JSON body.

### `healthCheck`
```json
{ "action": "healthCheck" }
```

### `createFolder`
```json
{
  "action": "createFolder",
  "folderName": "Wedding Photos",
  "submissionId": "ABC123"
}
```

### `initResumableUpload`
```json
{
  "action": "initResumableUpload",
  "folderId": "folder_id_from_createFolder",
  "fileName": "video.mp4",
  "fileSize": 1073741824,
  "mimeType": "video/mp4"
}
```

### `relayUploadChunk` (CORS fallback)
```json
{
  "action": "relayUploadChunk",
  "resumableUri": "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=...",
  "rangeStart": 0,
  "rangeEnd": 5242879,
  "totalBytes": 1073741824,
  "chunkBase64": "base64_encoded_5mb_chunk"
}
```

### `queryUploadStatus`
```json
{
  "action": "queryUploadStatus",
  "resumableUri": "...",
  "totalBytes": 1073741824
}
```
