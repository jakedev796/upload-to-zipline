# Upload to Zipline Extension

A browser extension that allows you to upload media files (images, videos, audio) directly to Zipline from the browser context menu.

[![Get the add-on](https://img.shields.io/amo/v/upload-to-zipline?label=Firefox%20Add-on&logo=firefox&color=orange)](https://addons.mozilla.org/en-US/firefox/addon/upload-to-zipline/)

## Project Structure

The extension is now organized into two separate directories for Firefox and Chrome compatibility:

- `firefox/` - Firefox extension
- `chrome/` - Chrome extension

## Installation

### Firefox
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Select the `firefox/manifest.json` file
5. The extension should now be installed

### Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `chrome/` folder
5. The extension should now be installed

## Configuration

1. Right-click on the extension icon and select "Options"
2. Enter your Zipline request URL (e.g., `https://your-zipline-instance.com/api/upload`)
3. Enter your authorization token
4. Click "Save"

>Note: All of these can be found in the .sxcu ShareX file.

## Usage

1. Right-click on any image, video, or audio file in your browser
2. Select "Upload to Zipline" from the context menu
3. The file will be uploaded to your Zipline instance
4. The URL will be automatically copied to your clipboard
5. You'll receive a notification confirming the upload

## Features

- Supports images, videos, and audio files
- Automatic clipboard copying of uploaded URLs
- Desktop notifications for upload status
- Cross-browser compatibility (Firefox and Chrome)

## Technical Details

### Manifest V3 Compatibility
Both versions have been updated to use Manifest V3, which is required for modern browser extensions.

### Key Changes Made
- Updated from Manifest V2 to Manifest V3
- Separated host permissions from regular permissions
- Added content scripts for clipboard operations
- Updated API calls to use appropriate browser APIs (chrome.* vs browser.*)
- Improved error handling and user feedback

### Permissions Required
- `storage` - For saving configuration settings
- `contextMenus` - For the right-click context menu
- `activeTab` - For accessing the current tab
- `downloads` - For handling file downloads
- `clipboardWrite` - For copying URLs to clipboard
- `notifications` - For showing upload status notifications
- `*://*/*` - For uploading files from any website

## Development

To modify the extension:

1. Make changes to the appropriate browser-specific files
2. For Firefox: Update files in the `firefox/` directory
3. For Chrome: Update files in the `chrome/` directory
4. Reload the extension in the browser's extension management page

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
