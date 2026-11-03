# Privacy Policy

Upload to Zipline ("the extension") is a browser extension that uploads media files and shortens URLs through a user-configured Zipline instance.

## What data the extension stores

The extension stores the following values in your browser's `storage.sync`:

- The Zipline upload URL you enter.
- The Zipline authorization token you enter.
- Your preferences and settings (auto-delete duration, max-view limit, URL-shortening on/off, image conversion/compression options, and display language).

These values never leave your browser except as part of the API calls described below. If you're signed into Chrome or Firefox sync, your browser may replicate them across your signed-in devices according to its own sync rules.

The extension also stores recent upload history in your browser's local device storage (`storage.local`):

- Up to 5 most recent upload items (filename, returned Zipline URL, timestamp, and a local thumbnail preview).
- This history remains strictly on your local machine and is never synced across devices or transmitted to any third party.
- You can clear this history at any time by clicking "Clear History" in the popup.

## What network calls the extension makes

When you trigger an upload or URL-shortening action:

- The extension sends the file or URL to the Zipline server you configured, using the authorization token you provided.
- No data is sent to any other server, ever.

The extension does not collect analytics, telemetry, crash reports, or any other usage data. There are no third-party network requests.

## What the extension does NOT do

- It does not access your browsing history.
- It does not read page content (it only captures screenshots or accesses clipboard images when you explicitly trigger those actions via the toolbar popup, context menus, or keyboard shortcuts).
- It does not run on any tab unless you trigger an action (the area screenshot overlay is injected on demand only when requested).
- It does not transmit your authorization token anywhere except to the Zipline server you explicitly configured.

## Source code

The extension is open source under GPL-3.0. You can review the entirety of the code at <https://github.com/jakedev796/upload-to-zipline>.

## Contact

For questions about this policy, open an issue at <https://github.com/jakedev796/upload-to-zipline/issues>.
