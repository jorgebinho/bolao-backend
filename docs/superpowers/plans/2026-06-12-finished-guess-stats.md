# Finished Guess Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a taxa de acerto do perfil e a contagem de erros do ranking para considerar somente palpites de partidas finalizadas.

**Architecture:** Uma funcao pura compartilhada em `src/shared/scoring/scoring.ts` calculara as estatisticas dos palpites finalizados. O perfil e o ranking consumirao o mesmo resultado, enquanto os repositorios passarao a selecionar o status da partida.

**Tech Stack:** TypeScript, Node.js test runner, `tsx`, Prisma 7, Biome.

---

## Estrutura de arquivos

- Criar `tests/scoring.test.ts`: testes unitarios da regra compartilhada e da integracao com a normalizacao do ranking.
- Modificar `src/shared/scoring/scoring.ts`: adicionar o tipo de palpite avaliado e a funcao `summarizeFinishedGuesses`; reutiliza-la no ranking.
- Modificar `src/modules/users/services/users.service.ts`: usar o resumo compartilhado no perfil.
- Modificar `src/modules/ranking/repositories/ranking.repository.ts`: selecionar `match.status` para cada palpite.
- Verificar `src/modules/users/repositories/users.repository.ts`: confirmar que `match.status` ja esta selecionado pelo PR #12, sem alteracao adicional se permanecer correto.
- Modificar `package.json`: adicionar o comando de testes focado na infraestrutura nativa do Node.

### Task 1: Criar testes da regra de palpites finalizados

**Files:**
- Create: `tests/scoring.test.ts`
- Modify: `package.json`
- Test: `tests/scoring.test.ts`

- [ ] **Step 1: Adicionar o comando de teste**

Adicionar em `package.json`:

```json
"test": "tsx --test tests/scoring.test.ts"
```

- [ ] **Step 2: Escrever testes que descrevem a regra desejada**

Criar `tests/scoring.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeRankingUsers,
  summarizeFinishedGuesses,
} from '../src/shared/scoring/scoring.js';

test('returns zero statistics when there are no finished guesses', () => {
  const summary = summarizeFinishedGuesses([
    { points: 0, match: { status: 'UPCOMING' } },
    { points: 0, match: { status: 'LOCKED' } },
  ]);

  assert.deepEqual(summary, {
    finishedGuesses: 0,
    exactScores: 0,
    partialScores: 0,
    errors: 0,
    hitRate: 0,
  });
});

test('counts exact, partial and errors only for finished guesses', () => {
  const summary = summarizeFinishedGuesses([
    { points: 3, match: { status: 'FINISHED' } },
    { points: 1, match: { status: 'FINISHED' } },
    { points: 0, match: { status: 'FINISHED' } },
    { points: 0, match: { status: 'UPCOMING' } },
  ]);

  assert.deepEqual(summary, {
    finishedGuesses: 3,
    exactScores: 1,
    partialScores: 1,
    errors: 1,
    hitRate: 67,
  });
});

test('ranking ignores unfinished guesses when counting errors', () => {
  const [user] = normalizeRankingUsers(
    [
      {
        id: 'user-1',
        name: 'Usuario',
        points: 4,
        _count: { guesses: 4 },
        guesses: [
          { points: 3, match: { status: 'FINISHED' } },
          { points: 1, match: { status: 'FINISHED' } },
          { points: 0, match: { status: 'FINISHED' } },
          { points: 0, match: { status: 'UPCOMING' } },
        ],
      },
    ],
    'user-1',
  );

  assert.equal(user.totalGuesses, 4);
  assert.equal(user.exactScores, 1);
  assert.equal(user.partialScores, 1);
  assert.equal(user.errors, 1);
});
```

- [ ] **Step 3: Rodar os testes e confirmar RED**

Run: `npm test`

Expected: FAIL informando que `summarizeFinishedGuesses` nao e exportada e/ou que o ranking ainda conta o palpite futuro como erro.

- [ ] **Step 4: Commitar apenas os testes em estado RED**

```bash
git add package.json tests/scoring.test.ts
git commit -m "test: cover finished guess statistics"
```

### Task 2: Implementar o resumo compartilhado e corrigir o ranking

**Files:**
- Modify: `src/shared/scoring/scoring.ts`
- Modify: `src/modules/ranking/repositories/ranking.repository.ts`
- Test: `tests/scoring.test.ts`

- [ ] **Step 1: Adicionar a funcao pura minima**

Em `src/shared/scoring/scoring.ts`, definir:

```ts
interface EvaluatedGuess {
  points: number;
  match: {
    status: 'UPCOMING' | 'LOCKED' | 'FINISHED';
  };
}

export function summarizeFinishedGuesses(guesses: EvaluatedGuess[]) {
  const finishedGuesses = guesses.filter(
    (guess) => guess.match.status === 'FINISHED',
  );
  const exactScores = finishedGuesses.filter(
    (guess) => guess.points === 3,
  ).length;
  const partialScores = finishedGuesses.filter(
    (guess) => guess.points === 1,
  ).length;
  const errors = finishedGuesses.filter((guess) => guess.points === 0).length;
  const hits = exactScores + partialScores;

  return {
    finishedGuesses: finishedGuesses.length,
    exactScores,
    partialScores,
    errors,
    hitRate: finishedGuesses.length
      ? Math.round((hits / finishedGuesses.length) * 100)
      : 0,
  };
}
```

- [ ] **Step 2: Reutilizar a funcao em `normalizeRankingUsers`**

Alterar `RankingGuess` para conter `match.status`, chamar:

```ts
const guessSummary = summarizeFinishedGuesses(guesses);
```

Manter `totalGuesses` baseado em `_count.guesses`, mas preencher:

```ts
exactScores: guessSummary.exactScores,
partialScores: guessSummary.partialScores,
errors: guessSummary.errors,
```

- [ ] **Step 3: Selecionar o status da partida no ranking**

Em `src/modules/ranking/repositories/ranking.repository.ts`, substituir:

```ts
guesses: { select: { points: true } },
```

por:

```ts
guesses: {
  select: { points: true, match: { select: { status: true } } },
},
```

- [ ] **Step 4: Rodar os testes e confirmar GREEN do ranking**

Run: `npm test`

Expected: todos os 3 testes passam.

- [ ] **Step 5: Commitar a regra compartilhada e o ranking**

```bash
git add src/shared/scoring/scoring.ts src/modules/ranking/repositories/ranking.repository.ts
git commit -m "fix: count ranking errors from finished matches"
```

### Task 3: Aplicar a regra compartilhada ao perfil

**Files:**
- Modify: `src/modules/users/services/users.service.ts`
- Verify: `src/modules/users/repositories/users.repository.ts`
- Test: `tests/scoring.test.ts`

- [ ] **Step 1: Confirmar o contrato do repositorio de usuarios**

Verificar que `profileUserSelect.guesses` possui:

```ts
{ select: { points: true, match: { select: { status: true } } } }
```

Nao editar o arquivo se o contrato ja estiver correto.

- [ ] **Step 2: Usar a funcao compartilhada no perfil**

Importar em `src/modules/users/services/users.service.ts`:

```ts
import { summarizeFinishedGuesses } from '../../../shared/scoring/scoring.js';
```

Antes do retorno do perfil, calcular:

```ts
const guessSummary = summarizeFinishedGuesses(user.guesses);
```

Preencher os indicadores com:

```ts
exactScores: guessSummary.exactScores,
partialScores: guessSummary.partialScores,
errors: guessSummary.errors,
hitRate: guessSummary.hitRate,
```

Manter `totalGuesses: user._count.guesses` sem alteracao.

- [ ] **Step 3: Rodar os testes**

Run: `npm test`

Expected: todos os testes passam.

- [ ] **Step 4: Rodar a verificacao de tipos/build**

Run: `npm run build`

Expected: build concluido com exit code `0`.

- [ ] **Step 5: Commitar a integracao do perfil**

```bash
git add src/modules/users/services/users.service.ts
git commit -m "fix: calculate profile hit rate from finished matches"
```

### Task 4: Verificacao final e preparacao para PR

**Files:**
- Verify: todos os arquivos alterados

- [ ] **Step 1: Rodar a suite completa criada para a mudanca**

Run: `npm test`

Expected: `3` testes aprovados, `0` falhas.

- [ ] **Step 2: Rodar o build de producao**

Run: `npm run build`

Expected: exit code `0`.

- [ ] **Step 3: Rodar verificacoes de diff**

```bash
git diff main...HEAD --check
git status --short
git log --oneline main..HEAD
```

Expected: nenhum erro de whitespace, worktree limpo e commits locais listados.

- [ ] **Step 4: Revisar escopo**

Confirmar que nao houve alteracao em regras de pontos, desempate, banco, frontend,
envio de e-mail ou outras funcionalidades fora das issues #13 e #14.
