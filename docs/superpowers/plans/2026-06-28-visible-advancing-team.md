# Visible Advancing Team Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the effective advancing team for legacy knockout guesses that only stored a non-draw score.

**Architecture:** Keep the compatibility rule inside `MatchesService`, where match context and guesses are already combined for the API response. A focused private serializer helper will prefer persisted data, derive a team only from an unambiguous knockout score, and return `null` for legacy draws.

**Tech Stack:** TypeScript, Node.js test runner, tsx, Prisma types.

---

## File Structure

- Create `tests/matches.service.test.ts`: service-level regression coverage with an in-memory repository stub.
- Modify `src/modules/matches/services/matches.service.ts`: normalize `advancingTeam` consistently for `myGuess` and public `guesses`.
- Modify `package.json`: include every `tests/*.test.ts` file in the standard test command.

### Task 1: Reproduce legacy guess serialization

**Files:**
- Create: `tests/matches.service.test.ts`

- [ ] **Step 1: Write the failing service tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import type { AuthenticatedUser } from '../src/shared/auth/auth.types.js';
import type {
	MatchesRepository,
	MatchWithGuesses,
} from '../src/modules/matches/repositories/matches.repository.js';
import { MatchesService } from '../src/modules/matches/services/matches.service.js';

const currentUser: AuthenticatedUser = {
	id: 'user-1',
	name: 'Sidnei Junior',
	email: 'sidnei@example.com',
	role: 'USER',
	points: 0,
};

function makeMatch(status: 'UPCOMING' | 'LOCKED'): MatchWithGuesses {
	const now = new Date();
	return {
		id: 'match-1',
		homeTeam: 'África do Sul',
		awayTeam: 'Canadá',
		homeFlag: null,
		awayFlag: null,
		matchDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
		stage: 'Fase de 32',
		status,
		homeScore: null,
		awayScore: null,
		advancingTeam: null,
		createdAt: now,
		updatedAt: now,
		guesses: [
			{
				id: 'guess-1',
				userId: 'user-1',
				matchId: 'match-1',
				homeGuess: 1,
				awayGuess: 2,
				advancingTeam: null,
				points: 0,
				createdAt: now,
				updatedAt: now,
				user: { id: 'user-1', name: 'Sidnei Junior' },
			},
			{
				id: 'guess-2',
				userId: 'user-2',
				matchId: 'match-1',
				homeGuess: 0,
				awayGuess: 2,
				advancingTeam: 'África do Sul',
				points: 0,
				createdAt: now,
				updatedAt: now,
				user: { id: 'user-2', name: 'Pedro' },
			},
			{
				id: 'guess-3',
				userId: 'user-3',
				matchId: 'match-1',
				homeGuess: 1,
				awayGuess: 1,
				advancingTeam: null,
				points: 0,
				createdAt: now,
				updatedAt: now,
				user: { id: 'user-3', name: 'Bruno' },
			},
		],
	};
}

function makeService(match: MatchWithGuesses): MatchesService {
	const repository = {
		findAllWithGuesses: async () => [match],
		lockMatches: async () => ({ count: 0 }),
	} as unknown as MatchesRepository;

	return new MatchesService(repository);
}

test('derives unambiguous legacy advancing teams in locked knockout guesses', async () => {
	const [match] = await makeService(makeMatch('LOCKED')).listMatchesForUser(
		currentUser,
	);

	assert.equal(match.myGuess?.advancingTeam, 'Canadá');
	assert.equal(match.guesses[0].advancingTeam, 'Canadá');
	assert.equal(match.guesses[1].advancingTeam, 'África do Sul');
	assert.equal(match.guesses[2].advancingTeam, null);
});

test('keeps other participants hidden before the match locks', async () => {
	const [match] = await makeService(makeMatch('UPCOMING')).listMatchesForUser(
		currentUser,
	);

	assert.equal(match.guesses.length, 1);
	assert.equal(match.guesses[0].userId, currentUser.id);
	assert.equal(match.guesses[0].advancingTeam, 'Canadá');
});
```

- [ ] **Step 2: Run the regression test and verify RED**

Run:

```bash
npx tsx --test tests/matches.service.test.ts
```

Expected: FAIL because the legacy `1 x 2` guess serializes `advancingTeam` as `null` instead of `Canadá`.

- [ ] **Step 3: Commit the red test**

```bash
git add tests/matches.service.test.ts
git commit -m "test: reproduce missing legacy advancing team"
```

### Task 2: Normalize the advancing team in API responses

**Files:**
- Modify: `src/modules/matches/services/matches.service.ts`

- [ ] **Step 1: Add the minimal serialization helper**

Add this private method next to `resolveGuessAdvancingTeam`:

```ts
private serializeGuessAdvancingTeam(
	match: { stage: string | null; homeTeam: string; awayTeam: string },
	guess: {
		homeGuess: number;
		awayGuess: number;
		advancingTeam: string | null;
	},
): string | null {
	const persistedTeam = String(guess.advancingTeam || '').trim();
	if (persistedTeam) return persistedTeam;
	if (!isKnockoutStage(match.stage)) return null;
	if (guess.homeGuess === guess.awayGuess) return null;

	return guess.homeGuess > guess.awayGuess
		? match.homeTeam
		: match.awayTeam;
}
```

- [ ] **Step 2: Use the helper in all three response locations**

Replace each response assignment currently written as:

```ts
advancingTeam: guess.advancingTeam,
```

with:

```ts
advancingTeam: this.serializeGuessAdvancingTeam(match, guess),
```

For both `myGuess` response assignments, use:

```ts
advancingTeam: this.serializeGuessAdvancingTeam(match, myGuess),
```

- [ ] **Step 3: Run the focused test and verify GREEN**

Run:

```bash
npx tsx --test tests/matches.service.test.ts
```

Expected: 2 tests pass, 0 fail.

- [ ] **Step 4: Commit the implementation**

```bash
git add src/modules/matches/services/matches.service.ts
git commit -m "fix: expose advancing team for legacy guesses"
```

### Task 3: Include the regression in standard verification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Expand the test script**

Change:

```json
"test": "tsx --test tests/scoring.test.ts"
```

to:

```json
"test": "tsx --test tests/*.test.ts"
```

- [ ] **Step 2: Run all tests**

Run:

```bash
npm test
```

Expected: 7 tests pass, 0 fail.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: Prisma generation and `tsdown` complete successfully.

- [ ] **Step 4: Check formatting without applying unrelated rewrites**

Run:

```bash
npx biome check tests/matches.service.test.ts src/modules/matches/services/matches.service.ts package.json
```

Expected: no errors.

- [ ] **Step 5: Commit the test-runner update**

```bash
git add package.json
git commit -m "test: run all backend test files"
```
