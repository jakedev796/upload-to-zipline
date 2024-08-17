// Ensure the context menu is created when the extension is installed or reloaded
browser.runtime.onInstalled.addListener(() => {
    createContextMenu();
});

function createContextMenu() {
    browser.contextMenus.create({
        id: "uploadToZipline",
        title: "Upload to Zipline",
        contexts: ["image", "video", "audio"]
    });
}

// Ensure context menu is available when the background script starts running
browser.runtime.onStartup.addListener(() => {
    createContextMenu();
});

function showNotification(title, message) {
    browser.notifications.create({
        "type": "basic",
        "iconUrl": browser.runtime.getURL("icon48.png"),
        "title": title,
        "message": message
    });
}

browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "uploadToZipline") {
        const mediaURL = info.srcUrl;

        if (mediaURL) {
            try {
                // Fetch user settings
                const { requestURL, authToken } = await browser.storage.sync.get(['requestURL', 'authToken']);

                if (!requestURL || !authToken) {
                    showNotification("Configuration Required", "Please configure your Zipline settings in the extension options.");
                    browser.runtime.openOptionsPage();
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
                        "Authorization": authToken,
                        "Zws": "true",
                        "Format": "name"  // Ensures the original filename is kept
                    },
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    let baseURL = result.files[0];  // Assuming result.files[0] is the base URL

                    // Ensure the baseURL has the correct protocol and is properly sanitized
                    if (requestURL.startsWith('https')) {
                        baseURL = baseURL.replace(/^http:/, 'https:');  // Replace http with https if needed
                    }

                    // Remove trailing slashes from baseURL
                    baseURL = baseURL.replace(/\/+$/, '');

                    // Construct the final URL
                    const finalURL = `${baseURL}${filename}`.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '');

                    // Copy the URL to the clipboard
                    await navigator.clipboard.writeText(finalURL);

                    showNotification("Upload Successful", "The file was uploaded successfully and the URL has been copied to your clipboard.");
                    console.log("Upload successful! File URL: " + finalURL);
                } else {
                    throw new Error("Upload failed");
                }
            } catch (error) {
                console.error("Upload failed:", error);
                showNotification("Upload Failed", "An error occurred while uploading the file. Please check your settings and try again.");
            }
        }
    }
});