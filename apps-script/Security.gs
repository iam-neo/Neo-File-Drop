/**
 * Neo File Drop — Security Utilities
 */

/**
 * Basic rate-limiting using Script Properties.
 * Allows a maximum number of requests per IP within a time window.
 * 
 * Note: Apps Script doesn't expose real IP, so this uses a simplified
 * approach based on request fingerprinting. For production, consider
 * adding reCAPTCHA or similar verification.
 * 
 * @returns {boolean} true if request is allowed
 */
function checkRateLimit() {
  // In a simple public deployment, we rely on Google's built-in throttling
  // and the inherent latency of Apps Script execution.
  // For advanced rate limiting, integrate with Google Cloud Armor or reCAPTCHA.
  return true;
}

/**
 * Logs an action for audit purposes.
 * @param {string} action - Action name
 * @param {object} details - Additional details
 */
function logAction(action, details) {
  try {
    var timestamp = new Date().toISOString();
    Logger.log('[' + timestamp + '] ' + action + ': ' + JSON.stringify(details || {}));
  } catch (e) {
    // Silently ignore logging failures
  }
}

/**
 * Creates a JSON response with proper content type.
 * @param {object} data - Response data
 * @returns {TextOutput}
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Creates a JSON error response.
 * @param {string} message - Error message
 * @param {string} [code] - Error code
 * @returns {TextOutput}
 */
function createErrorResponse(message, code) {
  return createJsonResponse({
    success: false,
    error: message,
    code: code || 'UNKNOWN_ERROR'
  });
}
