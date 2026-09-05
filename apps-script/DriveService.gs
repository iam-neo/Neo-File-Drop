/**
 * Neo File Drop — Google Drive Service
 * 
 * Handles folder creation and file management in Google Drive.
 */

/**
 * Creates a submission folder inside the configured parent folder.
 * Folder naming convention: "[FolderName] - [YYYY-MM-DD] - [SUBMISSION_ID]"
 * 
 * @param {string} folderName - User-provided folder name (already sanitized)
 * @param {string} submissionId - 6-char unique submission ID
 * @returns {{success: boolean, folderId?: string, folderName?: string, folderUrl?: string, error?: string}}
 */
function createSubmissionFolder(folderName, submissionId) {
  try {
    var parentFolder;
    
    if (CONFIG.PARENT_FOLDER_ID && CONFIG.PARENT_FOLDER_ID !== 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE') {
      parentFolder = DriveApp.getFolderById(CONFIG.PARENT_FOLDER_ID);
    } else {
      // Fallback: use root Drive folder
      parentFolder = DriveApp.getRootFolder();
    }
    
    // Build the full folder name: "ProjectName - 2026-09-05 - ABC123"
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var fullFolderName = folderName + ' - ' + today + ' - ' + submissionId;
    
    // Create the folder
    var newFolder = parentFolder.createFolder(fullFolderName);
    
    // Make the folder viewable by anyone with the link (optional, for sharing)
    // newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var folderId = newFolder.getId();
    var folderUrl = newFolder.getUrl();
    
    logAction('createFolder', {
      folderName: fullFolderName,
      folderId: folderId,
      submissionId: submissionId
    });
    
    return {
      success: true,
      folderId: folderId,
      folderName: fullFolderName,
      folderUrl: folderUrl
    };
  } catch (e) {
    logAction('createFolder_error', { error: e.message, folderName: folderName });
    return {
      success: false,
      error: 'Failed to create folder: ' + e.message
    };
  }
}
