# Development Guide

## Local Setup
1. Install Node.js 22+
2. Run `npm install`
3. Setup local SQLite for dev: `npx prisma db push`
4. Run Lavalink locally (requires Java 17+)
5. `npm run dev` to start in development mode

## Project Structure
- `src/bot/` - Discord client setup, events, command handler
- `src/commands/` - Command modules grouped by category
- `src/services/` - Core business logic
- `src/database/` - Prisma schema and client setup
- `src/types/` - TypeScript interfaces
- `src/utils/` - Helper functions
