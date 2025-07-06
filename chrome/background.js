// Ensure the context menu is created when the extension is installed or reloaded
chrome.runtime.onInstalled.addListener(() => {
    createContextMenu();
});

function createContextMenu() {
    chrome.contextMenus.create({
        id: "uploadToZipline",
        title: "Upload to Zipline",
        contexts: ["image", "video", "audio"]
    });
}

// Ensure context menu is available when the background script starts running
chrome.runtime.onStartup.addListener(() => {
    createContextMenu();
});

function showNotification(title, message) {
    chrome.notifications.create({
        "type": "basic",
        "iconUrl": chrome.runtime.getURL("icon48.png"),
        "title": title,
        "message": message
    });
}

// Function to copy text to clipboard by injecting into the active tab
async function copyToClipboard(text, tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (textToCopy) => {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Successfully copied to clipboard
                }).catch((error) => {
                    console.error("Failed to copy to clipboard:", error);
                });
            },
            args: [text]
        });
        return true;
    } catch (error) {
        console.error("Failed to execute clipboard script:", error);
        return false;
    }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "uploadToZipline") {
        const mediaURL = info.srcUrl;

        if (mediaURL) {
            try {
                // Fetch user settings
                const { requestURL, authToken } = await chrome.storage.sync.get(['requestURL', 'authToken']);

                if (!requestURL || !authToken) {
                    showNotification("Configuration Required", "Please configure your Zipline settings in the extension options.");
                    chrome.runtime.openOptionsPage();
                    return;
                }

                // Fetch the media directly
                const blob = await fetch(mediaURL).then(response => response.blob());
                let filename = mediaURL.split("/").pop().split("?")[0];  // Get the filename without query params

                // Remove invisible characters from the filename
                filename = filename.replace(/[\u200B-\u200D\uFEFF]/g, '');  // Remove zero-width and other invisible characters

                const formData = new FormData();
                formData.append('file', blob, filename);

                // Upload the media to Zipline
                const response = await fetch(requestURL, {
                    method: "POST",
                    headers: {
                        "authorization": authToken,
                        "x-zipline-format": "random"
                    },
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    // Check if we have files in the response
                    if (!result.files || result.files.length === 0) {
                        throw new Error("No files returned in response");
                    }
                    
                    // Handle both response formats:
                    // 1. Array of strings: ["http://domain.com/u/filename.ext"]
                    // 2. Array of objects: [{"id": "...", "url": "http://domain.com/u/filename.ext"}]
                    let finalURL;
                    const firstFile = result.files[0];
                    
                    if (typeof firstFile === 'string') {
                        // Format 1: Direct URL string
                        finalURL = firstFile;
                    } else if (firstFile && typeof firstFile === 'object' && firstFile.url) {
                        // Format 2: Object with url property
                        finalURL = firstFile.url;
                    } else {
                        throw new Error("Invalid file response format");
                    }
                    
                    // Ensure the URL has the correct protocol (only if needed)
                    if (requestURL.startsWith('https') && finalURL.startsWith('http:')) {
                        finalURL = finalURL.replace(/^http:/, 'https:');
                    }

                    // Copy the URL to the clipboard using the active tab
                    let clipboardSuccess = false;
                    if (tab && tab.id) {
                        clipboardSuccess = await copyToClipboard(finalURL, tab.id);
                    }

                    if (clipboardSuccess) {
                        showNotification("Upload Successful", "The file was uploaded successfully and the URL has been copied to your clipboard.");
                    } else {
                        showNotification("Upload Successful", "The file was uploaded successfully. URL: " + finalURL);
                    }
                } else {
                    const errorText = await response.text();
                    console.error("Upload failed with status:", response.status, "Response:", errorText);
                    throw new Error(`Upload failed with status ${response.status}`);
                }
            } catch (error) {
                console.error("Upload failed:", error);
                showNotification("Upload Failed", "An error occurred while uploading the file. Please check your settings and try again.");
            }
        }
    }
});