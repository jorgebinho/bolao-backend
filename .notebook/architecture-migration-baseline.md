# Architecture Migration Baseline
> Current JS/Express shape and TS migration constraints

Entry: `src/server.js`
Current stack: Express + Prisma + PostgreSQL + JWT + bcrypt + Zod

Runtime layout:
- `src/server.js` wires global middleware, health check, and route modules
- HTTP handlers live in `src/routes/*.js`
- Shared logic lives in `src/services/*.js`
- Auth middleware lives in `src/middleware/auth.js`
- Prisma singleton now lives in `src/lib/prisma.ts`
- Env validation lives in `src/config/env.ts`

Main route groups:
- Auth: `src/routes/auth.js`
- Matches and guesses: `src/routes/matches.js`
- Groups: `src/routes/groups.js`
- Ranking: `src/routes/ranking.js`
- Users/profile: `src/routes/users.js`
- Champion guess: `src/routes/championGuess.js`
- Rounds/history: `src/routes/rounds.js`
- Admin: `src/routes/admin.js`

Observed migration constraints:
- `tsdown.config.ts` expects `src/server.ts`; actual entry is `src/server.js`
- `npx tsc --noEmit` fails because `tsconfig.json` uses target `es2025`
- `npm run build` fails because `src/server.ts` does not exist
- Existing route handlers mix validation, DB access, business rules, and response mapping

Suggested first slice:
- Stabilize TS build config and convert `src/server.js` + shared infra first
- Then migrate one thin feature module before moving broad route files

Updated: 2026-05-29
