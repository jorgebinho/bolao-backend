import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../../shared/auth/auth.types.js';
import { RankingService } from '../services/ranking.service.js';

const tieBreakers = [
	'Pontos totais',
	'Mais placares exatos',
	'Mais acertos parciais',
] as const;

export class RankingController {
	constructor(private readonly rankingService: RankingService) {}

	async getRanking(req: Request, res: Response): Promise<Response> {
		try {
			const ranking = await this.rankingService.buildRanking(
				this.getAuthenticatedUser(req).id,
			);
			return res.json({ ranking, tieBreakers });
		} catch (error) {
			console.error('Erro ao buscar ranking:', error);
			return res.status(500).json({ error: 'Erro ao buscar ranking.' });
		}
	}

	private getAuthenticatedUser(req: Request): AuthenticatedUser {
		return req.user as AuthenticatedUser;
	}
}
