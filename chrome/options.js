function displayStatus(message, success = true) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.style.color = success ? 'green' : 'red';
    setTimeout(() => statusElement.textContent = '', 3000); // Clear message after 3 seconds
}

document.addEventListener('DOMContentLoaded', function () {
    console.log("Options page loaded");

    // Load settings from storage
    chrome.storage.sync.get(['requestURL', 'authToken'], (items) => {
        console.log("Settings retrieved:", items);
        if (items.requestURL) {
            document.getElementById('requestURL').value = items.requestURL;
        }
        if (items.authToken) {
            document.getElementById('authToken').value = items.authToken;
        }
    });
});

document.getElementById('save').addEventListener('click', function () {
    const requestURL = document.getElementById('requestURL').value;
    const authToken = document.getElementById('authToken').value;

    console.log("Saving settings:", { requestURL, authToken });

    chrome.storage.sync.set({
        requestURL: requestURL,
        authToken: authToken
    }, () => {
        document.getElementById('status').textContent = 'Settings saved!';
        setTimeout(() => {
            document.getElementById('status').textContent = '';
        }, 3000);
    });
});
