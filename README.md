# Bolao Backend

API REST do bolao da Copa do Mundo 2026.

## Stack

- Node.js
- Express
- Prisma
- PostgreSQL/Supabase
- JWT
- bcrypt

## Funcionalidades

- Cadastro e login com JWT
- Jogos e palpites
- Ranking geral e por grupo
- Grupos de bolao
- Perfil do usuario
- Historico por fase
- Palpite de campeao
- Painel admin para jogos, usuarios e pontuacao
- Importacao dos jogos oficiais da Copa 2026 via CSV

## Instalar

```bash
npm install
```

## Variaveis de ambiente

Crie um arquivo `.env` na raiz do backend:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

JWT_SECRET="gere-uma-chave-secreta-grande"
JWT_EXPIRES_IN="7d"

FRONTEND_URL="http://localhost:5173"
PORT=3333
```

## Banco de dados

O projeto usa PostgreSQL. Recomendado usar Supabase.

Depois de configurar `DATABASE_URL` e `DIRECT_URL`, rode:

```bash
npx prisma generate
npx prisma db push
```

## Importar jogos da Copa

Os CSVs ficam em:

```txt
data/worldcup
```

Para importar ou atualizar os jogos:

```bash
node scripts/importWorldCupMatches.js
```

O script e idempotente: pode rodar mais de uma vez sem duplicar os jogos.

## Recalcular pontuacao

Use quando alterar regras de pontuacao ou precisar recalcular jogos finalizados:

```bash
node scripts/recalculateScores.js
```

## Rodar em desenvolvimento

```bash
npm run dev
```

API local:

```txt
http://localhost:3333
```

Health check:

```txt
GET /health
```

## Rodar em producao

```bash
npm run start
```

## Rotas principais

- `/auth`
- `/matches`
- `/ranking`
- `/groups`
- `/users`
- `/rounds`
- `/champion-guess`
- `/admin`
