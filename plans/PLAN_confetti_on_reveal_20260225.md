# Plan: Confetti on Source Reveal

## Context
Add a confetti animation when quiz sources are revealed to make the moment more celebratory.

## Approach
Use the `canvas-confetti` library via CDN (~4KB). No npm dependencies added.

## Changes

### 1. `public/index.html` and `public/admin.html`
Add confetti script before `client.js`.

### 2. `public/js/client.js`
- Add `fireConfetti()` helper with reduced-motion check
- Call it in the `socket.on('reveal')` handler (not in `showSources()` or `sync-state`)

## Files Modified
- `public/index.html`
- `public/admin.html`
- `public/js/client.js`
