# TypeScript modular monolith migration plan

This plan moves the backend from the current JavaScript Express layout to a
TypeScript modular monolith. The migration must keep existing API behavior
stable while moving code into feature modules with clear layers.

## Current baseline

The backend currently uses:

- Node.js and Express for HTTP.
- Prisma with PostgreSQL for persistence.
- JWT and bcrypt for authentication.
- Zod for environment validation.
- Biome and tsdown for formatting, linting, and builds.

The current runtime code is mostly JavaScript:

- `src/server.js` wires middleware, health checks, and route modules.
- `src/routes/*.js` contains HTTP handlers.
- `src/services/*.js` contains shared business logic.
- `src/middleware/auth.js` validates JWTs and attaches `req.user`.
- `src/lib/prisma.ts` contains the Prisma client singleton.
- `src/config/env.ts` validates environment variables.

Known starting issues:

- `tsdown.config.ts` expects `src/server.ts`, but the actual entry is
  `src/server.js`.
- `npx tsc --noEmit` fails because `tsconfig.json` uses `target: "es2025"`.
- `npm run build` fails because `src/server.ts` does not exist.
- Route handlers currently mix validation, database access, business rules,
  and response mapping.

## Goals

- Convert the backend runtime code to TypeScript.
- Organize the codebase as a modular monolith.
- Keep each feature inside its own module.
- Give each module an HTTP layer, service layer, and repository layer.
- Keep the current REST API routes and response shapes stable during migration.
- Make `npm run build` and TypeScript checking reliable migration gates.

## Non-goals

- Do not rewrite the backend in NestJS during this migration.
- Do not introduce CQRS, event sourcing, or a framework-level dependency
  unless a later requirement justifies it.
- Do not change the frontend contract unless the change is planned separately.
- Do not redesign the database schema as part of the first migration slice.

## Target architecture

Use this module shape:

```txt
src/
  server.ts

  shared/
    auth/
    config/
    database/
    http/

  modules/
    auth/
      http/
        auth.controller.ts
        auth.routes.ts
        auth.schemas.ts
      repositories/
        user.repository.ts
      services/
        auth.service.ts

    matches/
      http/
      repositories/
      services/

    groups/
      http/
      repositories/
      services/
```

Layer responsibilities:

- `http`: Express routes, controllers, request validation, and response
  mapping.
- `services`: business rules and use-case orchestration.
- `repositories`: Prisma access and persistence details.
- `shared`: infrastructure used by multiple modules, such as config,
  database, auth middleware, and common HTTP helpers.

Dependency direction:

```txt
http -> services -> repositories -> Prisma
```

Rules:

- A module must not import another module's internal repository or service.
- Shared code must live under `src/shared`.
- Prisma queries must stay in repositories.
- Controllers must not contain business logic beyond request and response
  concerns.
- Zod schemas must live in the module HTTP layer.

## Migration phases

### Phase 1: Stabilize the TypeScript foundation

1. Fix `tsconfig.json` so `npx tsc --noEmit` can run.
2. Convert `src/server.js` to `src/server.ts`.
3. Add missing type packages for Express, CORS, JWT, and bcrypt if needed.
4. Add an Express request type extension for `req.user`.
5. Move shared infrastructure into `src/shared`.
6. Verify `npm run build` succeeds.

Exit criteria:

- `src/server.ts` is the real application entrypoint.
- The app starts with the same routes as before.
- `npm run build` passes.
- TypeScript can type-check the converted entrypoint and shared code.

### Phase 2: Migrate the first feature module

Start with `auth` because it is small and touches the important boundaries:
HTTP validation, password hashing, JWT signing, user persistence, and global
group membership.

Create:

- `src/modules/auth/http/auth.routes.ts`
- `src/modules/auth/http/auth.controller.ts`
- `src/modules/auth/http/auth.schemas.ts`
- `src/modules/auth/services/auth.service.ts`
- `src/modules/auth/repositories/user.repository.ts`

Preserve:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- Existing response shapes and status codes.

Exit criteria:

- Existing auth routes behave the same.
- Auth validation lives in Zod schemas.
- Auth business logic lives in `AuthService`.
- User Prisma calls live in `UserRepository`.
- `npm run build` passes.

### Phase 3: Use the first module as the template

After `auth` is stable, migrate modules in this order:

1. `matches`: games, guesses, teams, and pending alerts.
2. `groups`: group creation, joining, members, and group ranking.
3. `ranking`: global ranking normalization.
4. `users`: profile, password changes, and user statistics.
5. `champion-guess`: champion guess state and submission.
6. `rounds`: stage grouping and history.
7. `admin`: match management, score updates, champion result, and user admin.

For each module:

1. Create the module folder structure.
2. Move request validation to `http/*.schemas.ts`.
3. Move route callbacks to `http/*.controller.ts`.
4. Move business decisions to `services`.
5. Move Prisma calls to `repositories`.
6. Keep the existing route prefix and response shape.
7. Run the build before migrating the next module.

Exit criteria:

- Every current route belongs to a module.
- No route file directly imports Prisma.
- No controller owns business rules.
- No repository handles HTTP concerns.

### Phase 4: Clean up legacy layout

After all modules are migrated:

1. Remove obsolete files from `src/routes`, `src/services`, and
   `src/middleware` after confirming their replacements are active.
2. Keep compatibility exports only if a script or route still needs them.
3. Convert scripts under `scripts/` to TypeScript or isolate them as separate
   JavaScript maintenance scripts.
4. Update `README.md` with the new commands and architecture summary.

Exit criteria:

- Runtime source code is TypeScript.
- Legacy route and service folders are gone or intentionally documented.
- `README.md` matches the new structure.

## First implementation slice

Start with this concrete task:

1. Fix the TypeScript build baseline.
2. Convert `src/server.js` to `src/server.ts`.
3. Move Prisma, env, auth middleware, and common HTTP helpers into
   `src/shared`.
4. Migrate `auth` into the new module structure.
5. Verify the app still exposes `/auth/register`, `/auth/login`, and
   `/auth/me`.

This slice proves the architecture without touching every feature at once.

## Verification checklist

Run these checks at the end of each slice:

- `npm run build`
- `npx tsc --noEmit`
- Manual smoke test for the migrated routes
- Git diff review for unrelated changes

For auth, smoke test:

- Register a user.
- Log in with the same user.
- Call `/auth/me` with the returned token.
- Confirm invalid credentials still return the expected error.

## Definition of done

The migration is complete when:

- All runtime source under `src` is TypeScript.
- Every feature lives under `src/modules/<feature>`.
- Every module has `http`, `services`, and `repositories` layers.
- Controllers validate input and format responses.
- Services own business rules.
- Repositories own Prisma access.
- Shared infrastructure lives under `src/shared`.
- Existing API behavior remains compatible unless a route change is explicitly
  documented.
- Build and type-check commands pass consistently.
