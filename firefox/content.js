// Content script to handle clipboard operations
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "copyToClipboard") {
        console.log("Content script received clipboard copy request:", message.text);
        
        try {
            await navigator.clipboard.writeText(message.text);
            console.log("Successfully copied to clipboard:", message.text);
            sendResponse({ success: true });
        } catch (error) {
            console.error("Failed to copy to clipboard:", error);
            sendResponse({ success: false, error: error.message });
        }
    }
}); 