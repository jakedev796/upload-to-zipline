// Content script to handle clipboard operations
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "copyToClipboard") {
        console.log("Content script received clipboard copy request:", message.text);
        
        navigator.clipboard.writeText(message.text)
            .then(() => {
                console.log("Successfully copied to clipboard:", message.text);
                sendResponse({ success: true });
            })
            .catch((error) => {
                console.error("Failed to copy to clipboard:", error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep the message channel open for async response
    }
}); 