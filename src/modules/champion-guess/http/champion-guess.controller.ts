import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../../shared/auth/auth.types.js';
import {
	ChampionGuessService,
	ChampionGuessServiceError,
} from '../services/champion-guess.service.js';
import { saveChampionGuessSchema } from './champion-guess.schemas.js';

export class ChampionGuessController {
	constructor(private readonly championGuessService: ChampionGuessService) {}

	async getChampionGuess(req: Request, res: Response): Promise<Response> {
		try {
			const result = await this.championGuessService.getChampionGuess(
				this.getAuthenticatedUser(req).id,
			);
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao buscar palpite campeão:',
				'Erro ao buscar palpite campeão.',
			);
		}
	}

	async saveChampionGuess(req: Request, res: Response): Promise<Response> {
		const parseResult = saveChampionGuessSchema.safeParse(req.body);

		if (!parseResult.success || !parseResult.data.team) {
			return res.status(400).json({ error: 'Seleção campeã é obrigatória.' });
		}

		try {
			const result = await this.championGuessService.saveChampionGuess(
				this.getAuthenticatedUser(req).id,
				parseResult.data.team,
			);
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao salvar palpite campeão:',
				'Erro ao salvar palpite campeão.',
			);
		}
	}

	private getAuthenticatedUser(req: Request): AuthenticatedUser {
		if (!req.user) {
			throw new ChampionGuessServiceError(
				401,
				'Token de autenticação não fornecido.',
			);
		}

		return req.user;
	}

	private handleError(
		error: unknown,
		res: Response,
		logLabel: string,
		fallbackMessage: string,
	): Response {
		if (error instanceof ChampionGuessServiceError) {
			return res.status(error.statusCode).json({ error: error.message });
		}

		console.error(logLabel, error);
		return res.status(500).json({ error: fallbackMessage });
	}
}
