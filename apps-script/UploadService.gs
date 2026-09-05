/**
 * Neo File Drop — Upload Service
 * 
 * Handles resumable upload session initialization and chunk relay.
 * Uses Google Drive API v3 via UrlFetchApp with OAuth2 token.
 */

/**
 * Initializes a resumable upload session using Google Drive API v3.
 * Returns the resumable session URI which the browser can PUT chunks to directly.
 * 
 * @param {string} folderId - Google Drive folder ID to upload into
 * @param {string} fileName - Name of the file being uploaded
 * @param {number} fileSize - Total size of the file in bytes
 * @param {string} mimeType - MIME type of the file
 * @returns {{success: boolean, resumableUri?: string, error?: string}}
 */
function initResumableUpload(folderId, fileName, fileSize, mimeType) {
  try {
    var token = ScriptApp.getOAuthToken();
    
    // File metadata for Google Drive API v3
    var metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: mimeType
    };
    
    // Initiate resumable upload session
    // POST to /upload/drive/v3/files?uploadType=resumable
    var initUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
    
    var response = UrlFetchApp.fetch(initUrl, {
      method: 'post',
      contentType: 'application/json; charset=UTF-8',
      headers: {
        'Authorization': 'Bearer ' + token,
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(fileSize)
      },
      payload: JSON.stringify(metadata),
      muteHttpExceptions: true
    });
    
    var statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      var headers = response.getAllHeaders();
      var locationHeader = headers['Location'] || headers['location'];
      
      if (!locationHeader) {
        return {
          success: false,
          error: 'Google Drive did not return a resumable session URI. Response headers: ' + JSON.stringify(Object.keys(headers))
        };
      }
      
      logAction('initResumableUpload', {
        fileName: fileName,
        fileSize: fileSize,
        folderId: folderId
      });
      
      return {
        success: true,
        resumableUri: locationHeader,
        directModeAvailable: true
      };
    } else {
      var errorBody = response.getContentText();
      logAction('initResumableUpload_error', {
        statusCode: statusCode,
        body: errorBody.substring(0, 500)
      });
      return {
        success: false,
        error: 'Google Drive API returned HTTP ' + statusCode + ': ' + errorBody.substring(0, 200)
      };
    }
  } catch (e) {
    logAction('initResumableUpload_exception', { error: e.message });
    return {
      success: false,
      error: 'Failed to initialize upload session: ' + e.message
    };
  }
}

/**
 * Relays a single chunk (e.g. 5 MiB) from the browser to Google Drive
 * when direct browser-to-Drive PUT is blocked by CORS/firewall.
 * 
 * The chunk arrives as base64 from the frontend (since it's a single 5 MB slice,
 * not the entire file). Apps Script decodes and PUTs it to the resumable URI.
 * 
 * @param {string} resumableUri - The resumable upload session URI
 * @param {number} rangeStart - Start byte offset
 * @param {number} rangeEnd - End byte offset (inclusive)
 * @param {number} totalBytes - Total file size
 * @param {string} chunkBase64 - Base64-encoded chunk data
 * @returns {{success: boolean, uploadedBytes?: number, isComplete?: boolean, driveFileId?: string, driveFileUrl?: string, error?: string}}
 */
function relayUploadChunk(resumableUri, rangeStart, rangeEnd, totalBytes, chunkBase64) {
  try {
    // Decode the base64 chunk
    var chunkBlob = Utilities.newBlob(Utilities.base64Decode(chunkBase64));
    var contentRange = 'bytes ' + rangeStart + '-' + rangeEnd + '/' + totalBytes;
    
    var response = UrlFetchApp.fetch(resumableUri, {
      method: 'put',
      headers: {
        'Content-Range': contentRange
      },
      payload: chunkBlob.getBytes(),
      muteHttpExceptions: true
    });
    
    var statusCode = response.getResponseCode();
    
    if (statusCode === 308) {
      // Chunk accepted, upload incomplete
      var rangeHeader = response.getAllHeaders()['Range'] || response.getAllHeaders()['range'] || '';
      var uploadedBytes = rangeEnd + 1;
      
      if (rangeHeader) {
        var match = rangeHeader.match(/bytes=0-(\d+)/);
        if (match && match[1]) {
          uploadedBytes = parseInt(match[1], 10) + 1;
        }
      }
      
      return {
        success: true,
        uploadedBytes: uploadedBytes,
        isComplete: false,
        rangeHeader: rangeHeader
      };
    } else if (statusCode === 200 || statusCode === 201) {
      // Upload complete!
      var responseJson = {};
      try {
        responseJson = JSON.parse(response.getContentText());
      } catch (e) {}
      
      var driveFileId = responseJson.id || '';
      
      logAction('relayUploadChunk_complete', {
        driveFileId: driveFileId,
        totalBytes: totalBytes
      });
      
      return {
        success: true,
        uploadedBytes: totalBytes,
        isComplete: true,
        driveFileId: driveFileId,
        driveFileUrl: driveFileId ? 'https://drive.google.com/file/d/' + driveFileId + '/view' : ''
      };
    } else {
      var errorText = response.getContentText();
      return {
        success: false,
        error: 'Drive API returned HTTP ' + statusCode + ' during chunk relay: ' + errorText.substring(0, 200)
      };
    }
  } catch (e) {
    logAction('relayUploadChunk_exception', { error: e.message });
    return {
      success: false,
      error: 'Chunk relay failed: ' + e.message
    };
  }
}

/**
 * Queries Google Drive for the current upload progress of an interrupted resumable session.
 * Sends PUT with Content-Range: bytes * / TOTAL
 * 
 * @param {string} resumableUri - The resumable upload session URI
 * @param {number} totalBytes - Total file size
 * @returns {{success: boolean, uploadedBytes?: number, isComplete?: boolean, error?: string}}
 */
function queryUploadStatus(resumableUri, totalBytes) {
  try {
    var response = UrlFetchApp.fetch(resumableUri, {
      method: 'put',
      headers: {
        'Content-Range': 'bytes */' + totalBytes
      },
      payload: '',
      muteHttpExceptions: true
    });
    
    var statusCode = response.getResponseCode();
    
    if (statusCode === 308) {
      var rangeHeader = response.getAllHeaders()['Range'] || response.getAllHeaders()['range'] || '';
      var uploadedBytes = 0;
      
      if (rangeHeader) {
        var match = rangeHeader.match(/bytes=0-(\d+)/);
        if (match && match[1]) {
          uploadedBytes = parseInt(match[1], 10) + 1;
        }
      }
      
      return {
        success: true,
        uploadedBytes: uploadedBytes,
        isComplete: false,
        rangeHeader: rangeHeader
      };
    } else if (statusCode === 200 || statusCode === 201) {
      return {
        success: true,
        uploadedBytes: totalBytes,
        isComplete: true
      };
    } else {
      return {
        success: false,
        error: 'Status query returned HTTP ' + statusCode
      };
    }
  } catch (e) {
    return {
      success: false,
      error: 'Status query failed: ' + e.message
    };
  }
}
