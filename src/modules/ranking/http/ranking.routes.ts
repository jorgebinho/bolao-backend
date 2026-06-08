import express from 'express';
import { authenticate } from '../../../shared/auth/auth.middleware.js';
import { RankingRepository } from '../repositories/ranking.repository.js';
import { RankingService } from '../services/ranking.service.js';
import { RankingController } from './ranking.controller.js';

const rankingRepository = new RankingRepository();
const rankingService = new RankingService(rankingRepository);
const rankingController = new RankingController(rankingService);

export const rankingRouter = express.Router();

rankingRouter.get('/', authenticate, (req, res) =>
	rankingController.getRanking(req, res),
);
