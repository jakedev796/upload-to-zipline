# Upload to Zipline Browser Extension

This browser extension allows you to easily upload media (images, videos, audio) to your Zipline instance directly from your browser.

Currently, it is only available for Firefox. 

This was made as I had just recently switched from Windows to Arch Linux and realized how reliant I was on using the ShareX browser integration. This is my attempt at replacing it for those running a Zipline instance already.
## Installation

1. Download the extension files.
2. Open your browser's extension page (e.g., `about:addons` in Firefox).
3. Click on "Load Temporary Add-on" or "Load Unpacked Extension" (depending on your browser).
4. Select the manifest.json file from the downloaded extension files.

## Configuration

Before using the extension, you need to configure it with your Zipline server details:

1. Open the WebUI of your Zipline instance.
2. Generate a ShareX config (Your username in the top right > Manage Account > Generate ShareX Config).
3. Open the generated ShareX config file in a text editor.
4. Locate the "RequestURL" and "Headers" (which contains the "Authorization" token) in the config file.
5. In your browser, right-click on the extension icon and select "Options" or "Preferences".
6. Fill in the "Request URL" and "Authorization Token" fields with the values from your ShareX config file.
7. Click "Save".

## Usage

1. Right-click on any media (image, video, or audio) on a webpage.
2. Select "Upload to Zipline" from the context menu.
3. The media will be uploaded to your Zipline instance, and the resulting URL will be copied to your clipboard.
4. You'll see a notification when the upload is complete.

## Troubleshooting

- If you see a notification about configuring your settings, make sure you've completed the Configuration steps above.
- If uploads fail, double-check your Request URL and Authorization Token in the extension options.
- For any other issues, check the browser's developer console for error messages.

## Privacy and Security

This extension only uploads media when you explicitly choose to do so through the context menu. Your Zipline server details are stored locally in your browser and are never sent to any third-party servers.

## Contributing

If you'd like to contribute to this project, please feel free to submit pull requests or open issues on the project's GitHub repository.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.