browser.runtime.onInstalled.addListener(() => {
    createContextMenu();
});

browser.runtime.onStartup.addListener(() => {
    createContextMenu();
});

browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'rebuildMenus') {
        createContextMenu();
    }
});

async function createContextMenu() {
    await browser.contextMenus.removeAll();
    browser.contextMenus.create({
        id: "uploadToZipline",
        title: "Upload to Zipline",
        contexts: ["image", "video", "audio"]
    });
    const { shortenEnabled } = await browser.storage.sync.get(['shortenEnabled']);
    if (shortenEnabled) {
        browser.contextMenus.create({
            id: "shortenURL",
            title: "Shorten URL with Zipline",
            contexts: ["link"]
        });
    }
}

function showNotification(title, message) {
    browser.notifications.create({
        "type": "basic",
        "iconUrl": browser.runtime.getURL("icon48.png"),
        "title": title,
        "message": message
    });
}

async function copyToClipboard(text, tabId) {
    try {
        await browser.scripting.executeScript({
            target: { tabId: tabId },
            func: (textToCopy) => {
                navigator.clipboard.writeText(textToCopy).then(() => {}).catch((error) => {
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

browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "uploadToZipline") {
        const mediaURL = info.srcUrl;
        if (!mediaURL) return;

        try {
            const { requestURL, authToken, expiryEnabled, expiryTime, maxViewsEnabled, maxViews } =
                await browser.storage.sync.get(['requestURL', 'authToken', 'expiryEnabled', 'expiryTime', 'maxViewsEnabled', 'maxViews']);

            if (!requestURL || !authToken) {
                showNotification("Configuration Required", "Please configure your Zipline settings in the extension options.");
                browser.runtime.openOptionsPage();
                return;
            }

            const blob = await fetch(mediaURL).then(response => response.blob());
            let filename = mediaURL.split("/").pop().split("?")[0];
            filename = filename.replace(/[\u200B-\u200D\uFEFF]/g, '');

            const formData = new FormData();
            formData.append('file', blob, filename);

            const headers = {
                "authorization": authToken,
                "x-zipline-format": "random"
            };
            if (expiryEnabled && expiryTime) headers["x-zipline-deletes-at"] = expiryTime;
            if (maxViewsEnabled && maxViews) headers["x-zipline-max-views"] = String(maxViews);

            const response = await fetch(requestURL, { method: "POST", headers, body: formData });

            if (response.ok) {
                const result = await response.json();
                if (!result.files || result.files.length === 0) throw new Error("No files returned in response");

                const firstFile = result.files[0];
                let finalURL;
                if (typeof firstFile === 'string') {
                    finalURL = firstFile;
                } else if (firstFile && typeof firstFile === 'object' && firstFile.url) {
                    finalURL = firstFile.url;
                } else {
                    throw new Error("Invalid file response format");
                }

                if (requestURL.startsWith('https') && finalURL.startsWith('http:')) {
                    finalURL = finalURL.replace(/^http:/, 'https:');
                }

                let clipboardSuccess = false;
                if (tab && tab.id) clipboardSuccess = await copyToClipboard(finalURL, tab.id);

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

    if (info.menuItemId === "shortenURL") {
        const linkURL = info.linkUrl;
        if (!linkURL) return;

        try {
            const { requestURL, authToken } = await browser.storage.sync.get(['requestURL', 'authToken']);

            if (!requestURL || !authToken) {
                showNotification("Configuration Required", "Please configure your Zipline settings in the extension options.");
                browser.runtime.openOptionsPage();
                return;
            }

            const shortenEndpoint = requestURL.replace(/\/api\/upload\/?$/, '') + "/api/user/urls";
            const response = await fetch(shortenEndpoint, {
                method: "POST",
                headers: {
                    "authorization": authToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ destination: linkURL })
            });

            if (response.ok) {
                const result = await response.json();
                const shortURL = result.url;
                if (!shortURL) throw new Error("No URL returned in response");

                let clipboardSuccess = false;
                if (tab && tab.id) clipboardSuccess = await copyToClipboard(shortURL, tab.id);

                if (clipboardSuccess) {
                    showNotification("URL Shortened", "The shortened URL has been copied to your clipboard.");
                } else {
                    showNotification("URL Shortened", "Shortened URL: " + shortURL);
                }
            } else {
                const errorText = await response.text();
                console.error("Shorten failed with status:", response.status, "Response:", errorText);
                throw new Error(`Shorten failed with status ${response.status}`);
            }
        } catch (error) {
            console.error("URL shortening failed:", error);
            showNotification("Shorten Failed", "An error occurred while shortening the URL. Please check your settings and try again.");
        }
    }
});
