/**
 * Neo File Drop — Input Validation
 */

/**
 * Sanitizes a folder name by removing invalid filesystem characters.
 * @param {string} name - Raw folder name.
 * @returns {string} Sanitized folder name.
 */
function sanitizeFolderName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim().substring(0, CONFIG.MAX_FOLDER_NAME_LENGTH);
}

/**
 * Validates a folder name.
 * @param {string} name - Folder name to validate.
 * @returns {{valid: boolean, error?: string}}
 */
function validateFolderName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Folder name is required.' };
  }
  
  const sanitized = sanitizeFolderName(name);
  if (sanitized.length === 0) {
    return { valid: false, error: 'Folder name contains only invalid characters.' };
  }
  
  if (sanitized.length < 1) {
    return { valid: false, error: 'Folder name must be at least 1 character.' };
  }
  
  return { valid: true };
}

/**
 * Validates a submission ID format (6-char alphanumeric).
 * @param {string} id - Submission ID to validate.
 * @returns {{valid: boolean, error?: string}}
 */
function validateSubmissionId(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Submission ID is required.' };
  }
  
  if (!/^[A-Z0-9]{6}$/.test(id)) {
    return { valid: false, error: 'Submission ID must be exactly 6 uppercase alphanumeric characters.' };
  }
  
  return { valid: true };
}

/**
 * Validates file metadata for initiating a resumable upload.
 * @param {string} fileName
 * @param {number} fileSize
 * @param {string} mimeType
 * @returns {{valid: boolean, error?: string}}
 */
function validateFileMetadata(fileName, fileSize, mimeType) {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, error: 'File name is required.' };
  }
  
  if (fileName.length > CONFIG.MAX_FILENAME_LENGTH) {
    return { valid: false, error: 'File name exceeds maximum length of ' + CONFIG.MAX_FILENAME_LENGTH + ' characters.' };
  }
  
  if (typeof fileSize !== 'number' || fileSize < 0) {
    return { valid: false, error: 'File size must be a non-negative number.' };
  }
  
  if (!mimeType || typeof mimeType !== 'string') {
    return { valid: false, error: 'MIME type is required.' };
  }
  
  return { valid: true };
}
