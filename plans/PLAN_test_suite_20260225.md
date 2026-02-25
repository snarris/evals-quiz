# Test Suite Plan for evals-quiz

**Date**: 2026-02-25

## Summary

Add a practical test suite using Node.js built-in test runner (`node:test` + `node:assert`). Zero new dependencies. Extract testable logic into `lib/game.js` and `lib/format.js`, then test with unit and integration tests.

## Files

- `lib/game.js` — Game state logic extracted from server.js
- `lib/format.js` — Text formatting extracted from client.js
- `test/game.test.js` — ~20 unit tests for game logic
- `test/format.test.js` — ~15 unit tests for formatting
- `test/integration.test.js` — ~12 socket.io integration tests
- `server.js` — Refactored to import from lib/game.js
- `public/js/client.js` — escapeHtml rewritten without DOM dependency
- `package.json` — test script updated
