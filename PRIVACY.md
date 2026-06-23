# Privacy Policy for Scriptmonkey

Last updated: June 23, 2026

Scriptmonkey is designed as a local, lightweight user script manager. We respect your privacy and are committed to protecting it. This extension does not collect, store, or transmit any of your personal data.

## 1. No Data Collection or Transmission
Scriptmonkey does **not** collect, store, or transmit any personal data, browsing history, web traffic, or the contents of your user scripts to external servers. All operations run entirely locally on your device. We do not use any third-party analytics, tracking tools, cookies, or telemetry.

## 2. Chrome Extension Permissions & Data Use
To function as a user script manager, Scriptmonkey requires the following permissions:
* **`storage`**: Used to save your user scripts, metadata, and preferences locally on your device via Chrome's local storage API (`chrome.storage.local`). This data is never sent to external servers or synced to the cloud.
* **`tabs`**: Used to read page URLs solely to check if any of your installed user scripts match the current website. No browsing history is saved or transmitted.
* **`userScripts` & `<all_urls>` (Host Permissions)**: Used to register and execute your user-defined scripts on matching websites as configured by you.

## 3. Third-Party Network Requests (Script Updates)
If a user script includes an `@updateURL` or `@downloadURL` tag, Scriptmonkey will query that URL only when you manually check for updates. This request is sent directly to the script host. Scriptmonkey does not attach any identifying telemetry, tracking parameters, or personal data to these requests.

## 4. Changes to This Policy
We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date.

## 5. Contact & Support
If you have any questions or concerns regarding privacy, please open an issue on the [Scriptmonkey GitHub Repository](https://github.com/mathiaswoess/Scriptmonkey/issues).
