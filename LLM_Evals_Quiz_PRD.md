# LLM Evals Quiz App
**Product Requirements Document** · Version 1.1 · Presentation Tool · Quick-Build Scope

---

## Overview

This document describes a lightweight, single-use web application built to support a live presentation on LLM evaluation. Participants join a shared URL and vote in real time on which of two AI-generated (or human-generated) responses they think is better. After each round, the admin reveals the source of each answer and advances to the next question. The app covers seven rounds sourced from a CSV file of pre-loaded questions and answers.

The goal is simple: a slick, interactive quiz that runs smoothly in front of an audience, requires minimal infrastructure, and can be stood up and torn down in minutes. This is explicitly a throwaway project—built for one event, not for long-term maintenance.

---

## Goals & Non-Goals

**Goals**

- Deliver a functional, interactive quiz app for a single live presentation.
- Support real-time participation from remote and in-room attendees via a shared URL.
- Show live vote counts as participants vote, updating on all screens without a page refresh.
- Give the admin full control over pacing: reveal answers, advance rounds, and reset the quiz—all pushing updates to participants in real time.
- Make deployment cheap and simple—ideally free or near-free with no DevOps overhead.
- Match a visual aesthetic inspired by Hex (hex.tech): clean, modern, dark-leaning with strong typography.

**Non-Goals**

- User accounts, persistent data storage, or analytics beyond the live session.
- Multi-presentation support or an admin CMS to manage question sets.
- Mobile-first optimization (desktop browser is fine; a reasonable mobile layout is a bonus).
- Scalability beyond ~100 concurrent participants.

---

## User Roles

There are two roles in the app:

- **Participant** — joins via the primary URL, views questions and response pairs, and submits a vote each round by clicking a card.
- **Admin** — joins via a secondary URL (e.g., `/admin`) and has access to the full participant view plus control buttons to reveal answers, advance rounds, and reset the quiz.

No authentication is required for either role. The admin URL is security-through-obscurity—sufficient for a one-off internal presentation.

---

## Data Model

Questions are loaded from a CSV file (`quiz_data.csv`) included in the project directory. The CSV has the following columns:

| Column | Description |
|---|---|
| `Number` | Round number (1–7) |
| `Question` | The scenario or query presented to participants |
| `Option A Text` | The first response to display |
| `Option A Source` | Source of Option A (a model name or team label, e.g. "Client Success (humans)") |
| `Option B Text` | The second response to display |
| `Option B Source` | Source of Option B |

Sources are hidden from participants until the admin triggers the reveal. The app reads this CSV at startup and holds it in memory for the session.

---

## Game Flow

### Participant Experience

Each participant follows this flow for every round:

1. They see the round number, the question prompt, and two response cards side by side ("Option A" and "Option B"). Clicking a card registers their vote—no separate submit button needed.
2. As votes come in from other participants, a live count updates on both cards in real time (e.g., "7 votes"). Participants don't need to refresh to see this.
3. When the admin reveals the answer, the source of each option appears on both cards and the final vote tally is shown—again, updating instantly without a refresh.
4. When the admin advances to the next round, all participant screens transition to the new question automatically.

### Admin Experience

The admin sees the same participant view, plus a persistent control panel with three actions:

- **Reveal Answers** — shows the source label for each option and the current vote breakdown on all connected screens simultaneously.
- **Next Round** — advances all connected participants to the next question. Disabled until answers have been revealed.
- **Reset Quiz** — resets state to Round 1, clears all votes, and returns all participants to the beginning.

After the final round's answers are revealed, the participant view displays a simple end screen (e.g., "Thanks for playing!").

---

## Functional Requirements

### Participant View

- Display the round number and question text prominently.
- Show two clickable response cards side by side. Clicking a card is the vote interaction—no additional button required.
- Allow a single vote per session per round; votes can be changed up until the sources are revealed.
- Voting closes as soon as the admin reveals the answers. At that point, cards become non-interactive and no further votes are accepted.
- Visually highlight the selected card after voting (e.g., accent color border or background tint).
- Show a live vote count on each card that updates in real time as other participants vote, without requiring a page refresh.
- On reveal: display a source label badge on each card (e.g., "gemini-3-flash-preview" or "Policy (humans)"). This appears instantly on all screens when the admin triggers it.
- On next round: transition to the new question automatically without a page refresh.
- Show a completion screen after the final round.

### Admin View

- All of the above, plus a visible admin control panel.
- **Reveal Answers** button — broadcasts reveal event to all participants simultaneously.
- **Next Round** button — broadcasts round-advance event to all participants simultaneously.
- **Reset Quiz** button — broadcasts reset event, returning all clients to Round 1.
- Live vote count visible to admin at all times (not just post-reveal).

### Real-Time Synchronization

Real-time behavior is central to this app. All state changes must propagate to every connected client instantly—no page refresh required. The recommended approach is WebSockets via Socket.io.

The following events must broadcast in real time to all participants:

- **Vote cast** — when any participant votes, the live vote count for each option updates on all connected clients immediately. This creates a visible, running tally as the audience votes.
- **Answers revealed** — when the admin triggers reveal, source labels and final vote counts appear on all participant screens simultaneously, and the cards become non-interactive. No further votes are accepted after this point.
- **Round advanced** — all participant views transition to the new question without any manual refresh.
- **Quiz reset** — all clients return to Round 1, votes cleared, voting re-enabled.

The server holds the authoritative game state (current round, vote counts, reveal status). When a new participant connects mid-session, the server emits the current state immediately so they see the correct view without having to wait for the next event.

---

## Technical Architecture

### Recommended Stack

Given the throwaway nature of this project, the stack should minimize setup time and maximize simplicity:

- **Backend:** Node.js with Express + Socket.io. Handles CSV loading, game state management, and real-time event broadcasting.
- **Frontend:** Plain HTML/CSS/JavaScript served by the Express backend. The Socket.io client library handles all real-time updates.
- **Data:** CSV file read from disk at startup, held in-memory. No database needed.
- **Routing:** The same Express server serves both `/` (participant view) and `/admin` (admin view).

### Deployment

The simplest path to getting this on the public internet quickly and cheaply:

- **Railway (railway.app)** *(recommended)* — free tier, deploys a Node.js app from a GitHub repo in minutes, provides a public HTTPS URL with WebSocket support included. Push to GitHub → connect repo → deploy.
- **Render (render.com)** — similar free-tier offering; slightly slower cold starts but equally simple.
- **Fly.io** — free tier, global edge, good WebSocket support. Marginally more config than Railway.
- **ngrok** *(fallback)* — if you want to run locally and just expose the port, ngrok gives you a public tunnel instantly with no deployment at all.

---

## Design & Visual Direction

The visual style should draw inspiration from Hex (hex.tech): clean and modern with dark backgrounds, strong typographic hierarchy, and generous whitespace.

- **Color palette:** Dark navy or near-black background (e.g., `#0f0f1a`), with white or off-white text. A single accent color—purple or violet—for interactive elements, selected states, and highlights.
- **Typography:** Clean sans-serif (Inter or similar). Question text should be large and prominent. Response text should be readable at normal size with comfortable line-height for longer answers.
- **Response cards:** Two side-by-side clickable cards with subtle borders. On hover, a subtle lift or border highlight. On selection, a clear visual highlight (accent color border or background tint) confirms the vote. Each card displays the live vote count beneath the response text.
- **Reveal state:** Source labels appear as badges on each card (e.g., "gemini-3-flash-preview" or "Policy (humans)"). Vote counts are already visible and simply freeze once voting closes.
- **Admin panel:** A fixed footer or sidebar with clearly labeled control buttons. Visually distinct from the main view (e.g., a subtle "Admin" badge in the corner).
- **Transitions:** Smooth fade or slide when advancing rounds to keep the energy up during a live presentation.

---

## Out of Scope

- Authentication or password protection for the admin route.
- Persistent storage of results or post-session analytics.
- The ability to edit or upload new question sets via the UI.
- Leaderboards or individual participant tracking.
- Accessibility compliance (nice to have, not required for a one-off internal tool).

---

## References & Resources

- Visual inspiration: [hex.tech](https://hex.tech)
- Deployment: [railway.app](https://railway.app), [render.com](https://render.com), [fly.io](https://fly.io), [ngrok.com](https://ngrok.com)
- Real-time sync: [socket.io](https://socket.io)
- CSV parsing: `csv-parse` (npm) or `papaparse`
- Question data: `quiz_data.csv` — 7 rounds covering CalFresh/SNAP policy scenarios, comparing LLM model responses against human-written answers from internal teams
