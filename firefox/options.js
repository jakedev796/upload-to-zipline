function displayStatus(message, success = true) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.style.color = success ? 'green' : 'red';
    setTimeout(() => statusElement.textContent = '', 3000);
}

document.addEventListener('DOMContentLoaded', function () {
    browser.storage.sync.get(['requestURL', 'authToken', 'expiryEnabled', 'expiryTime', 'maxViewsEnabled', 'maxViews', 'shortenEnabled']).then((items) => {
        if (items.requestURL) document.getElementById('requestURL').value = items.requestURL;
        if (items.authToken) document.getElementById('authToken').value = items.authToken;
        document.getElementById('expiryEnabled').checked = !!items.expiryEnabled;
        if (items.expiryTime) document.getElementById('expiryTime').value = items.expiryTime;
        document.getElementById('maxViewsEnabled').checked = !!items.maxViewsEnabled;
        if (items.maxViews) document.getElementById('maxViews').value = items.maxViews;
        document.getElementById('shortenEnabled').checked = !!items.shortenEnabled;
    }).catch((error) => {
        console.error("Error retrieving settings:", error);
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

    browser.storage.sync.set({
        requestURL, authToken, expiryEnabled, expiryTime, maxViewsEnabled, maxViews, shortenEnabled
    }).then(() => {
        browser.runtime.sendMessage({ action: 'rebuildMenus' }).catch(() => {});
        displayStatus('Settings saved!');
    }).catch((error) => {
        console.error("Error saving settings:", error);
        displayStatus('Error saving settings.', false);
    });
});
