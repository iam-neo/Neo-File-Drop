/**
 * Neo File Drop — Main Apps Script Entry Point
 * 
 * Google Apps Script Web App that handles all API requests from the
 * Neo File Drop frontend. Deployed as: Execute as "Me", Access "Anyone".
 * 
 * All requests arrive as POST with Content-Type: text/plain;charset=utf-8
 * to bypass CORS preflight (Apps Script does not support OPTIONS).
 * The JSON payload is parsed from the request body.
 * 
 * Supported actions:
 *   - healthCheck: Test connectivity and get server info
 *   - createFolder: Create a submission folder in Google Drive
 *   - initResumableUpload: Start a resumable upload session (returns session URI)
 *   - relayUploadChunk: Relay a single chunk to Google Drive (CORS fallback)
 *   - queryUploadStatus: Query byte offset of interrupted upload
 */

/**
 * GET handler — returns a simple health page.
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      status: 'ready',
      version: CONFIG.VERSION,
      message: 'Neo File Drop backend is running. Use POST for API calls.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST handler — main API router.
 * Parses the JSON body and dispatches to the appropriate handler based on `action`.
 */
function doPost(e) {
  try {
    // Rate limit check
    if (!checkRateLimit()) {
      return createErrorResponse('Too many requests. Please try again later.', 'RATE_LIMIT');
    }
    
    // Parse request body (arrives as text/plain JSON)
    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return createErrorResponse('Invalid JSON in request body.', 'INVALID_JSON');
    }
    
    var action = body.action;
    
    if (!action || typeof action !== 'string') {
      return createErrorResponse('Missing or invalid "action" field.', 'MISSING_ACTION');
    }
    
    // Route to handler
    switch (action) {
      case 'healthCheck':
        return handleHealthCheck();
      
      case 'createFolder':
        return handleCreateFolder(body);
      
      case 'initResumableUpload':
        return handleInitResumableUpload(body);
      
      case 'relayUploadChunk':
        return handleRelayUploadChunk(body);
      
      case 'queryUploadStatus':
        return handleQueryUploadStatus(body);
      
      default:
        return createErrorResponse('Unknown action: ' + action, 'UNKNOWN_ACTION');
    }
  } catch (globalError) {
    logAction('doPost_error', { error: globalError.message, stack: globalError.stack });
    return createErrorResponse('Internal server error: ' + globalError.message, 'INTERNAL_ERROR');
  }
}

// ─── Action Handlers ──────────────────────────────────────────────

function handleHealthCheck() {
  var configuredFolder = 'Not configured';
  try {
    if (CONFIG.PARENT_FOLDER_ID && CONFIG.PARENT_FOLDER_ID !== 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE') {
      var folder = DriveApp.getFolderById(CONFIG.PARENT_FOLDER_ID);
      configuredFolder = folder.getName();
    } else {
      configuredFolder = 'Root Drive (default)';
    }
  } catch (e) {
    configuredFolder = 'Error: ' + e.message;
  }
  
  return createJsonResponse({
    success: true,
    status: 'ready',
    version: CONFIG.VERSION,
    configuredFolder: configuredFolder
  });
}

function handleCreateFolder(body) {
  // Validate inputs
  var folderValidation = validateFolderName(body.folderName);
  if (!folderValidation.valid) {
    return createErrorResponse(folderValidation.error, 'VALIDATION_ERROR');
  }
  
  var idValidation = validateSubmissionId(body.submissionId);
  if (!idValidation.valid) {
    return createErrorResponse(idValidation.error, 'VALIDATION_ERROR');
  }
  
  var sanitized = sanitizeFolderName(body.folderName);
  var result = createSubmissionFolder(sanitized, body.submissionId);
  
  return createJsonResponse(result);
}

function handleInitResumableUpload(body) {
  // Validate inputs
  if (!body.folderId || typeof body.folderId !== 'string') {
    return createErrorResponse('Folder ID is required.', 'VALIDATION_ERROR');
  }
  
  var fileValidation = validateFileMetadata(body.fileName, body.fileSize, body.mimeType);
  if (!fileValidation.valid) {
    return createErrorResponse(fileValidation.error, 'VALIDATION_ERROR');
  }
  
  var result = initResumableUpload(body.folderId, body.fileName, body.fileSize, body.mimeType, body.clientOrigin);
  
  return createJsonResponse(result);
}

function handleRelayUploadChunk(body) {
  if (!body.resumableUri || typeof body.resumableUri !== 'string') {
    return createErrorResponse('Resumable URI is required.', 'VALIDATION_ERROR');
  }
  
  if (typeof body.rangeStart !== 'number' || typeof body.rangeEnd !== 'number' || typeof body.totalBytes !== 'number') {
    return createErrorResponse('rangeStart, rangeEnd, and totalBytes must be numbers.', 'VALIDATION_ERROR');
  }
  
  if (!body.chunkBase64 || typeof body.chunkBase64 !== 'string') {
    return createErrorResponse('chunkBase64 is required.', 'VALIDATION_ERROR');
  }
  
  var result = relayUploadChunk(body.resumableUri, body.rangeStart, body.rangeEnd, body.totalBytes, body.chunkBase64);
  
  return createJsonResponse(result);
}

function handleQueryUploadStatus(body) {
  if (!body.resumableUri || typeof body.resumableUri !== 'string') {
    return createErrorResponse('Resumable URI is required.', 'VALIDATION_ERROR');
  }
  
  if (typeof body.totalBytes !== 'number') {
    return createErrorResponse('totalBytes must be a number.', 'VALIDATION_ERROR');
  }
  
  var result = queryUploadStatus(body.resumableUri, body.totalBytes);
  
  return createJsonResponse(result);
}
