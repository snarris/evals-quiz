# Plan: Fix per-participant voting (one vote per participant per round)

## Context
Multiple browser tabs share the same `clientId` via `localStorage`, so all tabs in the same browser are treated as one participant. When tab 2 votes, it overwrites tab 1's vote instead of adding to the tally. The requirement is that each participant (each browser tab/window) gets one independent vote per round.

## Root Cause
`public/js/client.js` lines 3-12 use `localStorage.getItem('evals-quiz-clientId')` to persist a single `clientId` across all tabs. Since `localStorage` is shared per origin, every tab sends the same `clientId`, and the server's `processVote()` treats them as the same voter changing their mind.

## Fix
Switch from `localStorage` to `sessionStorage` in `public/js/client.js`. `sessionStorage` is scoped per tab/window, so each tab gets its own `clientId` and is treated as a separate participant.

### File: `public/js/client.js` (lines 1-12)
Change `localStorage` to `sessionStorage`.

### File: `test/game.test.js`
Add a test verifying that two different clientIds produce independent vote tallies (votes.a + votes.b = 2, totalVoters = 2).

## Behavior After Fix
- Each browser tab = separate participant with unique `clientId`
- Refreshing a tab keeps the same `clientId` (sessionStorage persists within a tab session)
- Each participant can vote once per round, and votes accumulate in the tally
- Vote changing still works (same tab re-voting switches their choice)
- Server-side code (`lib/game.js`, `server.js`) requires no changes
