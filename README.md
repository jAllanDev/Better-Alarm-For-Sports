# Support Host Alert

Browser extension for a customer support page that watches for the hosts Cruise and Wes, then plays a repeating alarm until you acknowledge the alert.

## What it does

- Detects Cruise or Wes in page text, with a bias toward the `data-no-activator` host bubbles shown in the screenshot.
- Keeps repeating an alarm until you click Acknowledge.
- Lets you disable detection entirely from the popup.

## Load it in Chrome or Edge

1. Open the browser extensions page.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select the `host-alert-extension` folder.

## Notes

- This is a Chromium MV3 extension.
- If the support site uses different DOM markers later, the detection logic can be tightened to that page structure.