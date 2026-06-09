import express from 'express';
import { authenticate } from '../../../shared/auth/auth.middleware.js';
import { ChampionGuessRepository } from '../repositories/champion-guess.repository.js';
import { ChampionGuessService } from '../services/champion-guess.service.js';
import { ChampionGuessController } from './champion-guess.controller.js';

const championGuessRepository = new ChampionGuessRepository();
const championGuessService = new ChampionGuessService(championGuessRepository);
const championGuessController = new ChampionGuessController(championGuessService);

export const championGuessRouter = express.Router();

championGuessRouter.use(authenticate);

championGuessRouter.get('/', (req, res) =>
	championGuessController.getChampionGuess(req, res),
);
championGuessRouter.post('/', (req, res) =>
	championGuessController.saveChampionGuess(req, res),
);
championGuessRouter.put('/', (req, res) =>
	championGuessController.saveChampionGuess(req, res),
);
