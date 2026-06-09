import express from 'express';
import { authenticate } from '../../../shared/auth/auth.middleware.js';
import { RoundsRepository } from '../repositories/rounds.repository.js';
import { RoundsService } from '../services/rounds.service.js';
import { RoundsController } from './rounds.controller.js';

const roundsRepository = new RoundsRepository();
const roundsService = new RoundsService(roundsRepository);
const roundsController = new RoundsController(roundsService);

export const roundsRouter = express.Router();

roundsRouter.use(authenticate);

roundsRouter.get('/', (req, res) => roundsController.listRounds(req, res));
roundsRouter.get('/me/history', (req, res) =>
	roundsController.getHistory(req, res),
);
roundsRouter.get('/:stage', (req, res) =>
	roundsController.getRoundByStage(req, res),
);
