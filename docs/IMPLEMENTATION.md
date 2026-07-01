# Implementation Notes

## What this extension does

The extension injects a Nuvio button next to movie / TV titles on supported sites. Clicking the button launches Nuvio with the official deep link format:

`nuvio://meta?type=<movie|series>&id=<imdb-id>`

This format was verified from Nuvio's public upstream codebase.

## Why the extension is app-first

As of July 1, 2026, Nuvio exposes a stable app deep link for title metadata, but I did not find a stable public web URL format for opening a specific title detail page on `nuvio.tv`.

Because of that:

- primary action: open the Nuvio app deep link
- optional fallback: open an internal assistant page inside the extension, which can copy the title / IMDb ID and open `https://nuvio.tv/`

## Supported page strategies

### Search results

- Google Search: inject next to IMDb result titles
- DuckDuckGo: inject next to IMDb result titles

### Detail pages

- IMDb: ID from URL
- Trakt: ID from external IMDb link
- Letterboxd: ID from the IMDb link in the page footer/details
- JustWatch: ID extracted from server-rendered page HTML
- Wikipedia: ID from external IMDb link

## Browser support

### Firefox

Runs as a Manifest V3 WebExtension.

### Chrome

Runs as a Manifest V3 WebExtension.

### Safari

The codebase is WebExtension-compatible, but Safari still requires:

1. `xcrun safari-web-extension-converter`
2. Xcode project signing
3. local build/archive on macOS

This repo includes the compatible extension source, but not the generated Xcode wrapper project.

## Testing

Unit tests cover:

- IMDb ID parsing
- Nuvio deep link building
- media type inference
- metadata extraction from representative page snippets

## Current limitations

- No stable public Nuvio web detail URL was found, so "web mode" cannot open a specific title directly.
- Google support is currently scoped to `google.com` pages matched by the manifest, not every country TLD.
- Safari packaging cannot be fully verified in this Linux environment.
