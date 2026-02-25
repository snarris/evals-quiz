# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Github
To push to remote

git remote add origin git@github.com:snarris/evals-quiz.git
git branch -M main
git push -u origin main

## Testing
- Create comprehensive tests as part of any completely new implementation
- Use TDD: write a failing test before implementing new functionality
- Mock external services (httpx, Playwright, Anthropic) — never call real APIs in tests
- Always run the full test suite before committing code

## API Integration
When working with external APIs (Anthropic, OpenAI Whisper, Linear, etc.), always verify the model ID and API parameter constraints before making calls. Check documentation or use a known-valid model string.

## General Principles
After implementing code changes, proactively fix all related data issues (e.g., DB entries, config files) without waiting to be asked. If a bug affected stored data, mention it and offer to fix it. The server is the most important environment. Fix the data issues on both the local environment and the remote server.

## MCP & Integrations
When MCP tools fail to load, do not repeatedly suggest 'restart the session.' Instead, check the mcp.json config paths (both local and global), verify the npm package name is correct, and fall back to direct API calls via curl/Python if the MCP server cannot be fixed.

## Documentation
Each time a plan is accepted, before implementing any code, create a markdown file recording the plan in the plans folder with a name following `PLAN_{changes}_{TIMESTAMP}.md`.

After committing and pushing to main, update documentation to reflect the changes in the readme and claude.md.

## Continuous improvement
After each deploy, review the past session and identify any areas where you encountered errors, had to rework code, or where things went wrong. Investigate the root cause and identify any improvements that could be made to documentation or setup to prevent the problems in the future. Ask the user befoe implementing any changes to claude.md or the project setup.
