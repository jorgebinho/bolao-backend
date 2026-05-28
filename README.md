# Bolão Backend

API REST do bolão da Copa do Mundo 2026.

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
- Grupos de bolão
- Perfil do usuário
- Histórico por fase
- Palpite de campeão
- Painel admin para jogos, usuários e pontuação
- Importação dos jogos oficiais da Copa 2026 via CSV

## Instalar

```bash
npm install
```

## Variáveis de ambiente

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

O script é idempotente: pode rodar mais de uma vez sem duplicar os jogos.

## Recalcular pontuação

Use quando alterar regras de pontuação ou precisar recalcular jogos finalizados:

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

## Rodar em produção

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
