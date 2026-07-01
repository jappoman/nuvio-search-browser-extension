# Nuvio Browser Extension

Cross-browser WebExtension that adds an "Open in Nuvio" button on popular movie and TV pages, using Nuvio's official `nuvio://meta?type=...&id=...` deep link format.

## Project layout

- repository root: extension source
- `site-modules.js`: per-site integration registry and placement rules
- `tests/`: unit tests

## Supported sites

- Google Search results and knowledge panels / watch sections
- DuckDuckGo
- IMDb title pages, including localized URLs such as `/it/title/...`
- Trakt and `app.trakt.tv`
- Letterboxd film pages
- JustWatch movie / film / TV pages
- Wikipedia pages with IMDb links

## Browser targets

- Firefox
- Chrome / Chromium browsers
- Safari via Apple's WebExtension converter on macOS

## Local development

```bash
npm install
npm test
npm run check
npm run package
```

`npm run package` creates `dist/open-in-nuvio.zip` for Firefox / Chrome manual distribution.

### Load in Firefox

Do not install the local zip from `about:addons` on stable Firefox: it will fail with "has not been verified" because the package is unsigned.

Use one of these development flows instead:

1. Temporary load from source:
   Open `about:debugging#/runtime/this-firefox`
   Choose `Load Temporary Add-on`
   Select `manifest.json`
2. Run from the terminal:

```bash
npm install
npm run firefox:dev
```

For a normal install on stable Firefox, the extension must be signed by Mozilla first.

After changing the code, use `Reload` in `about:debugging#/runtime/this-firefox` to refresh the temporary add-on.

### Load in Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Choose `Load unpacked`
4. Select this repository root folder

### Safari packaging

Safari support for WebExtensions still requires Apple's converter and signing flow on macOS:

```bash
xcrun safari-web-extension-converter .
```

See [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) for the implementation notes and current limitations.

## Settings

The options page lets you:

- enable or disable the assistant fallback tab
- toggle each supported site individually
- enable or disable all site integrations in one click
