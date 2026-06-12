# Known issues / follow-ups

Issues identified while fixing the `users` module that were intentionally left out of
scope. Each entry has the root cause and a suggested fix so it can be picked up later.

---

## 1. `hitRate` counts not-yet-played games in the denominator

**File:** `src/modules/users/services/users.service.ts` (profile computation)

**Symptom:** Hit rate is dragged down by matches that haven't been played yet.

```ts
hitRate: user._count.guesses
  ? Math.round(
      (user.guesses.filter((guess) => guess.points > 0).length /
        user._count.guesses) * 100,
    )
  : 0,
```

`_count.guesses` is *all* guesses (including unplayed matches), but the numerator can only
be non-zero on finished matches. This is the same class of issue as the `errors` bug just
fixed.

**Suggested fix:** Compute the rate over finished guesses only. Since the profile select
now fetches `guess.match.status`, derive a finished subset once and reuse it:

```ts
const finishedGuesses = user.guesses.filter((g) => g.match.status === 'FINISHED');
// hitRate = finishedGuesses with points > 0 / finishedGuesses.length
```

Decide the desired product semantics first (hit rate over *decided* matches vs. over *all*
predictions made) before changing — this is a behavior change, not just a bug fix.

---

## 2. Ranking `errors` derives from all guesses (same bug)

**File:** `src/shared/scoring/scoring.ts` — `normalizeRankingUsers`

```ts
errors: Math.max(totalGuesses - exactScores - partialScores, 0),
```

`totalGuesses` is `_count.guesses` (all guesses), so `errors` here also counts not-yet-
played matches — the same defect fixed in the user profile. The ranking repository
(`src/modules/ranking/repositories/ranking.repository.ts`) currently selects only
`guesses: { select: { points: true } }`, so fixing this requires also selecting
`match.status` there (mirroring the `users.repository.ts` change).

**Suggested fix:** Add `match: { select: { status: true } }` to the ranking guess select,
then compute `errors` as finished guesses scored `0` (consistent with the profile fix).
