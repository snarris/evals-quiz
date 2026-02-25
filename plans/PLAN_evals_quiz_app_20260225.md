# LLM Evals Quiz App — Implementation Plan

**Date:** 2026-02-25

## Summary
Greenfield web app for live presentation on LLM evaluation. Participants vote in real time on AI vs human responses across 7 rounds. Admin controls flow. ~100 concurrent users.

## Tech Stack
- Express + Socket.io + PapaParse
- No build step, flat structure

## Steps
1. Scaffold project (npm init, deps, rename CSV)
2. Server: CSV loading + Express routes
3. Server: Game state + Socket.io events with clientId identity
4. Frontend: Participant HTML + dark theme CSS
5. Frontend: Client JS (voting, rendering, socket events)
6. Frontend: Admin HTML + JS (control panel)
7. Polish and edge cases
8. Deploy to Railway
