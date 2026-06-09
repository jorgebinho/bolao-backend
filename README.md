# Bolão Backend

API REST do bolão da Copa do Mundo 2026.

## Stack

- Node.js
- Express
- Prisma
- PostgreSQL/Supabase
- JWT
- bcrypt
- TypeScript

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

JWT_SECRET="gere-uma-chave-secreta-grande"
JWT_EXPIRES_IN="7d"

FRONTEND_URL="http://localhost:5173"
PORT=3333
```

## Banco de dados

O projeto usa PostgreSQL. O Supabase pode ser utilizado mas também é possível usar a imagem Docker do PostgreSQL padrão, para isso:

1. Execute `docker login dhi.io` e logue com sua conta da Docker
2. Execute `docker compose up -d`

Depois de configurar `DATABASE_URL`, rode:

```bash
npm run db:generate
npm run db:migrate
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

## Enviar lembretes por e-mail

O backend inicia um scheduler interno quando `MATCH_REMINDERS_ENABLED=true`, mas
tambem existe um comando avulso para ambientes que podem dormir ou para cron
externo:

```bash
npm run reminders:send
```

Esse comando roda uma vez, procura jogos abertos que comecam em ate 2 horas e
envia e-mail apenas para usuarios que ainda nao palpitaram. Depois registra o
envio em `match_reminder_emails`, evitando duplicidade para o mesmo usuario e
jogo.

Exemplo para simular outra data/hora:

```bash
npm run reminders:send -- --now=2026-06-11T17:15:00.000Z
```

Em producao, agende esse comando em um cron externo a cada 5 ou 10 minutos.

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
