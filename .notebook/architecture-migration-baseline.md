# Architecture Migration Baseline
> Current JS/Express shape and TS migration constraints

Entry: `src/server.ts`
Current stack: Express + Prisma + PostgreSQL + JWT + bcrypt + Zod

Runtime layout:
- `src/server.ts` is now the build entrypoint and wires global middleware, health
  check, and route modules
- HTTP handlers live under `src/modules/*/http`
- Module logic lives under `src/modules/*/{services,repositories}`
- Shared infrastructure lives under `src/shared/*`
- Shared pure helpers now also live under `src/shared/*`, including
  `src/shared/scoring/scoring.ts`
- Auth module now lives under `src/modules/auth/*`
- Matches module now lives under `src/modules/matches/*`
- Groups module now lives under `src/modules/groups/*`
- Ranking logic now has a public module entry at `src/modules/ranking/index.ts`
- Ranking HTTP module surface now lives under `src/modules/ranking/http/*`
- Users module now lives under `src/modules/users/*`
- Champion-guess module now lives under `src/modules/champion-guess/*`
- Rounds module now lives under `src/modules/rounds/*`
- Admin module now lives under `src/modules/admin/*`

Main route groups:
- Auth: `src/modules/auth/http/auth.routes.ts`
- Matches and guesses: `src/modules/matches/http/matches.routes.ts`
- Groups: `src/modules/groups/http/groups.routes.ts`
- Ranking: `src/modules/ranking/http/ranking.routes.ts`
- Users/profile: `src/modules/users/http/users.routes.ts`
- Champion guess: `src/modules/champion-guess/http/champion-guess.routes.ts`
- Rounds/history: `src/modules/rounds/http/rounds.routes.ts`
- Admin: `src/modules/admin/http/admin.routes.ts`

Observed migration constraints:
- `tsconfig.json` now uses `target: "es2024"` with a pure TS source tree
- Existing route concerns are now split by module into HTTP, service, and
  repository layers

Suggested first slice:
- Stabilize TS build config and convert `src/server.js` + shared infra first
- Auth is now the template module:
  - routes: `src/modules/auth/http/auth.routes.ts`
  - controller: `src/modules/auth/http/auth.controller.ts`
  - service: `src/modules/auth/services/auth.service.ts`
  - repository: `src/modules/auth/repositories/user.repository.ts`
- Matches follows the same split:
  - routes: `src/modules/matches/http/matches.routes.ts`
  - controller: `src/modules/matches/http/matches.controller.ts`
  - service: `src/modules/matches/services/matches.service.ts`
  - repository: `src/modules/matches/repositories/matches.repository.ts`
- Groups follows the same split:
  - routes: `src/modules/groups/http/groups.routes.ts`
  - controller: `src/modules/groups/http/groups.controller.ts`
  - service: `src/modules/groups/services/groups.service.ts`
  - repository: `src/modules/groups/repositories/groups.repository.ts`
- Users follows the same split:
  - routes: `src/modules/users/http/users.routes.ts`
  - controller: `src/modules/users/http/users.controller.ts`
  - service: `src/modules/users/services/users.service.ts`
  - repository: `src/modules/users/repositories/users.repository.ts`
- Champion-guess follows the same split:
  - routes: `src/modules/champion-guess/http/champion-guess.routes.ts`
  - controller: `src/modules/champion-guess/http/champion-guess.controller.ts`
  - service: `src/modules/champion-guess/services/champion-guess.service.ts`
  - repository: `src/modules/champion-guess/repositories/champion-guess.repository.ts`
- Rounds follows the same split:
  - routes: `src/modules/rounds/http/rounds.routes.ts`
  - controller: `src/modules/rounds/http/rounds.controller.ts`
  - service: `src/modules/rounds/services/rounds.service.ts`
  - repository: `src/modules/rounds/repositories/rounds.repository.ts`
- Admin follows the same split:
  - routes: `src/modules/admin/http/admin.routes.ts`
  - controller: `src/modules/admin/http/admin.controller.ts`
  - service: `src/modules/admin/services/admin.service.ts`
  - repository: `src/modules/admin/repositories/admin.repository.ts`
- Ranking now also has:
  - routes: `src/modules/ranking/http/ranking.routes.ts`
  - controller: `src/modules/ranking/http/ranking.controller.ts`
- Match visibility, lock timing, pending-alert filtering, and world-cup team CSV
  loading are currently module service concerns, while Prisma access is isolated
  in the repository
- Global-group helpers are now exposed as the public `groups` module API via
  `src/modules/groups/index.ts`; auth uses that public entry instead of reaching
  into legacy service files
- Ranking calculation is now exposed as the public `ranking` module API via
  `src/modules/ranking/index.ts`; `groups` and `users` use that entry instead
  of importing behavior from another route file
- Ranking HTTP response mapping, including tie-breaker labels, now lives in
  `src/modules/ranking/http/ranking.controller.ts`
- User profile aggregation now lives in `src/modules/users/services/users.service.ts`
  and reuses the ranking module for both general position and optional group
  position
- Champion guess deadline/open-state logic now lives in
  `src/modules/champion-guess/services/champion-guess.service.ts`, while
  `app_config`, first-match lookup, and guess persistence are isolated in the
  repository
- Round summaries, per-user history grouping, and stage normalization now live
  in `src/modules/rounds/services/rounds.service.ts`, while match/guess reads
  are isolated in the repository
- Admin match CRUD, score settlement, champion-result settlement, and admin user
  management now live in `src/modules/admin/services/admin.service.ts`, while
  Prisma access is isolated in `src/modules/admin/repositories/admin.repository.ts`
- Shared scoring helpers now live in `src/shared/scoring/scoring.ts`; both
  ranking and admin import that TS module directly
- `npx tsc --noEmit` required running `prisma generate` because the checked-in
  Prisma client types were stale relative to `prisma/schema.prisma`
- `prisma.config.ts` was removed because Prisma `5.22.0` in this repo does not
  ship `prisma/config`, and the file was blocking TypeScript while not being
  used by the CLI
- All route groups now have TS module surfaces wired by `src/server.ts`
- Legacy route/service compatibility files and the old `src/server.js` entry
  have been removed
- `allowJs` and the legacy path aliases have been removed from `tsconfig.json`

Updated: 2026-05-29
