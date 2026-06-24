import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../../shared/auth/auth.types.js';
import {
	MatchesService,
	MatchesServiceError,
} from '../services/matches.service.js';
import { guessBodySchema, guessParamsSchema } from './matches.schemas.js';

export class MatchesController {
	constructor(private readonly matchesService: MatchesService) {}

	async listMatches(req: Request, res: Response): Promise<Response> {
		try {
			const matches = await this.matchesService.listMatchesForUser(
				this.getAuthenticatedUser(req),
			);
			return res.json({ matches });
		} catch (error) {
			return this.handleError(error, res, 'Erro ao listar jogos:', 'Erro ao buscar jogos.');
		}
	}

	async listPendingAlerts(req: Request, res: Response): Promise<Response> {
		try {
			const alerts = await this.matchesService.listPendingAlertsForUser(
				this.getAuthenticatedUser(req),
			);
			return res.json({ alerts });
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao buscar alertas:',
				'Erro ao buscar alertas de jogos.',
			);
		}
	}

	listTeams(_req: Request, res: Response): Response {
		try {
			return res.json({ teams: this.matchesService.listTeams() });
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao listar seleções:',
				'Erro ao buscar seleções.',
			);
		}
	}

	async saveGuess(req: Request, res: Response): Promise<Response> {
		const paramsResult = guessParamsSchema.safeParse(req.params);
		const bodyResult = guessBodySchema.safeParse(req.body);

		if (!paramsResult.success || !bodyResult.success) {
			return res.status(400).json({
				error: 'Os palpites devem ser números inteiros não negativos.',
			});
		}

		try {
			const guess = await this.matchesService.saveGuess({
				userId: this.getAuthenticatedUser(req).id,
				matchId: paramsResult.data.id,
				homeGuess: bodyResult.data.homeGuess,
				awayGuess: bodyResult.data.awayGuess,
				advancingTeam: bodyResult.data.advancingTeam,
			});

			return res.json({ guess });
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao salvar palpite:',
				'Erro ao salvar palpite.',
			);
		}
	}

	private getAuthenticatedUser(req: Request): AuthenticatedUser {
		if (!req.user) {
			throw new MatchesServiceError(401, 'Token de autenticação não fornecido.');
		}

		return req.user;
	}

	private handleError(
		error: unknown,
		res: Response,
		logLabel: string,
		fallbackMessage: string,
	): Response {
		if (error instanceof MatchesServiceError) {
			return res.status(error.statusCode).json({ error: error.message });
		}

		console.error(logLabel, error);
		return res.status(500).json({ error: fallbackMessage });
	}
}
