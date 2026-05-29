import express from 'express';
import { authenticate } from '../../../shared/auth/auth.middleware.js';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from '../services/matches.service.js';
import { MatchesRepository } from '../repositories/matches.repository.js';

const matchesRepository = new MatchesRepository();
const matchesService = new MatchesService(matchesRepository);
const matchesController = new MatchesController(matchesService);

export const matchesRouter = express.Router();

matchesRouter.get('/', authenticate, (req, res) =>
	matchesController.listMatches(req, res),
);
matchesRouter.get('/pending-alerts', authenticate, (req, res) =>
	matchesController.listPendingAlerts(req, res),
);
matchesRouter.get('/teams', authenticate, (req, res) =>
	matchesController.listTeams(req, res),
);
matchesRouter.post('/:id/guess', authenticate, (req, res) =>
	matchesController.saveGuess(req, res),
);
