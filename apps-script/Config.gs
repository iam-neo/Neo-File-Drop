/**
 * Neo File Drop — Apps Script Configuration
 * 
 * REQUIRED: Set your Google Drive parent folder ID below.
 * This is the folder where all submission sub-folders will be created.
 * 
 * To find a folder ID:
 * 1. Open the target folder in Google Drive
 * 2. The ID is the last part of the URL: drive.google.com/drive/folders/[FOLDER_ID]
 */

const CONFIG = {
  /** Google Drive parent folder ID where submissions are stored */
  PARENT_FOLDER_ID: 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE',

  /** App version string (returned in health check) */
  VERSION: '1.0.0',

  /** Maximum file name length allowed */
  MAX_FILENAME_LENGTH: 255,

  /** Maximum folder name length allowed */
  MAX_FOLDER_NAME_LENGTH: 100,

  /** Allowed CORS origins (empty = allow all via Apps Script default) */
  ALLOWED_ORIGINS: []
};
