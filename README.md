# LLM Evals Quiz App

Lightweight, throwaway web app for a live LLM evaluation quiz. Participants vote in real time on which response is better across 7 rounds. An admin controls reveal, next round, and reset.

## Requirements
- Node.js 18+ (uses `node --watch`)

## Setup
```bash
npm install
```

## Run Locally
```bash
npm run dev
```

Participant view: `http://localhost:3000`  
Admin view: `http://localhost:3000/admin`

## Admin Secret
Admin controls require a shared secret.

Server uses:
- `ADMIN_SECRET` env var, or
- default: `evals-quiz-admin-2026`

The admin page currently sends the default secret from the client. If you change `ADMIN_SECRET` in production, update the client to match or wire a safer mechanism.

## Data
Quiz data is loaded from `quiz_data.csv` on server startup.

Expected columns:
- `Number`
- `Question`
- `Option A Text`
- `Option A Source`
- `Option B Text`
- `Option B Source`

## Scripts
- `npm run dev` — start with file watching
- `npm start` — start without watching

## Notes
- State is in memory only; refresh or restart resets the quiz.
- Designed for ~100 concurrent users.

## Deploy to Railway
1. Push this repo to GitHub.
2. In Railway, create a new project and connect the GitHub repo.
3. Set environment variables:
   - `ADMIN_SECRET` (required in production)
   - `PORT` (optional; Railway sets this automatically)
4. Deploy. Railway will run `npm install` and `npm start`.
5. Open the provided Railway URL.
