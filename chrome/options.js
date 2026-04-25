function displayStatus(message, success = true) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.style.color = success ? 'green' : 'red';
    setTimeout(() => statusElement.textContent = '', 3000);
}

document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.sync.get(['requestURL', 'authToken', 'expiryEnabled', 'expiryTime', 'maxViewsEnabled', 'maxViews', 'shortenEnabled'], (items) => {
        if (items.requestURL) document.getElementById('requestURL').value = items.requestURL;
        if (items.authToken) document.getElementById('authToken').value = items.authToken;
        document.getElementById('expiryEnabled').checked = !!items.expiryEnabled;
        if (items.expiryTime) document.getElementById('expiryTime').value = items.expiryTime;
        document.getElementById('maxViewsEnabled').checked = !!items.maxViewsEnabled;
        if (items.maxViews) document.getElementById('maxViews').value = items.maxViews;
        document.getElementById('shortenEnabled').checked = !!items.shortenEnabled;
    });
});

document.getElementById('save').addEventListener('click', function () {
    const requestURL = document.getElementById('requestURL').value;
    const authToken = document.getElementById('authToken').value;
    const expiryEnabled = document.getElementById('expiryEnabled').checked;
    const expiryTime = document.getElementById('expiryTime').value;
    const maxViewsEnabled = document.getElementById('maxViewsEnabled').checked;
    const maxViews = parseInt(document.getElementById('maxViews').value, 10) || 0;
    const shortenEnabled = document.getElementById('shortenEnabled').checked;

    chrome.storage.sync.set({
        requestURL, authToken, expiryEnabled, expiryTime, maxViewsEnabled, maxViews, shortenEnabled
    }, () => {
        chrome.runtime.sendMessage({ action: 'rebuildMenus' }, () => {});
        displayStatus('Settings saved!');
    });
});
