# Implementation Notes

## What this extension does

The extension injects a Nuvio button on supported movie / TV pages. Clicking the button launches Nuvio with the official deep link format:

`nuvio://meta?type=<movie|series>&id=<imdb-id>`

This format was verified from Nuvio's public upstream codebase.

## Why the extension is app-first

As of July 1, 2026, Nuvio exposes a stable app deep link for title metadata, but I did not find a stable public web URL format for opening a specific title detail page on `nuvio.tv`.

Because of that:

- primary action: open the Nuvio app deep link
- optional fallback: open an internal assistant page inside the extension, which can copy the title / IMDb ID and open `https://nuvio.tv/`

## Supported page strategies

The runtime is split into:

- `core.js`: shared metadata parsing and deep-link helpers
- `site-modules.js`: one module per supported site, with host matching and placement logic
- `content.js`: generic runtime that loads settings, resolves the active site module, and injects the button

### Search results

- Google Search: inject on IMDb result titles and, when available, inside the knowledge-panel watch section
- DuckDuckGo: inject next to IMDb result titles

### Detail pages

- IMDb: ID from URL, including localized paths such as `/it/title/...`; button targeted to watch / streaming areas when found
- Trakt: ID from external IMDb link; supports both `trakt.tv` and `app.trakt.tv`
- Letterboxd: ID from the IMDb link in the page footer/details; button targeted to the `Where to Watch` area when found
- JustWatch: ID extracted from server-rendered page HTML; supports localized `/film/` routes and targets the `Guarda ora` / watch section
- Wikipedia: ID from external IMDb link; button prefers the infobox instead of only the article heading

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
- placement logic for Google, IMDb, Letterboxd, JustWatch, Trakt, and Wikipedia
- options-page bulk site toggles

## Current limitations

- No stable public Nuvio web detail URL was found, so "web mode" cannot open a specific title directly.
- Google support is currently scoped to `google.com` pages matched by the manifest, not every country TLD.
- Safari packaging cannot be fully verified in this Linux environment.
