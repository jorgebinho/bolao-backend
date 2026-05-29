import cors from 'cors';
import express from 'express';
import { adminRouter } from './modules/admin/http/admin.routes.js';
import { env } from './shared/config/env.js';
import { authRouter } from './modules/auth/http/auth.routes.js';
import { groupsRouter } from './modules/groups/http/groups.routes.js';
import { createCorsOptions } from './shared/http/cors.js';
import {
	internalErrorHandler,
	notFoundHandler,
} from './shared/http/errors.js';
import { championGuessRouter } from './modules/champion-guess/http/champion-guess.routes.js';
import { matchesRouter } from './modules/matches/http/matches.routes.js';
import { rankingRouter } from './modules/ranking/http/ranking.routes.js';
import { roundsRouter } from './modules/rounds/http/rounds.routes.js';
import { usersRouter } from './modules/users/http/users.routes.js';

const app = express();
const corsOptions = createCorsOptions();

app.set('trust proxy', true);

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
	res.json({
		status: 'ok',
		service: 'bolao-backend',
		timestamp: new Date().toISOString(),
	});
});

app.use('/auth', authRouter);
app.use('/matches', matchesRouter);
app.use('/admin', adminRouter);
app.use('/ranking', rankingRouter);
app.use('/groups', groupsRouter);
app.use('/users', usersRouter);
app.use('/champion-guess', championGuessRouter);
app.use('/rounds', roundsRouter);

app.use(notFoundHandler);
app.use(internalErrorHandler);

app.listen(env.PORT, '0.0.0.0', () => {
	console.log(`\nBolão Backend rodando na porta ${env.PORT}`);
	console.log(`   Health: http://localhost:${env.PORT}/health`);
	console.log(`   Ambiente: ${env.NODE_ENV}\n`);
});
