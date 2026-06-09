import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../../shared/auth/auth.types.js';
import { RoundsService } from '../services/rounds.service.js';
import { stageParamsSchema } from './rounds.schemas.js';

export class RoundsController {
	constructor(private readonly roundsService: RoundsService) {}

	async listRounds(_req: Request, res: Response): Promise<Response> {
		try {
			const result = await this.roundsService.listRounds();
			return res.json(result);
		} catch (error) {
			console.error('Erro ao listar rodadas:', error);
			return res.status(500).json({ error: 'Erro ao buscar rodadas.' });
		}
	}

	async getHistory(req: Request, res: Response): Promise<Response> {
		try {
			const result = await this.roundsService.getHistory(
				this.getAuthenticatedUser(req).id,
			);
			return res.json(result);
		} catch (error) {
			console.error('Erro ao buscar histórico:', error);
			return res.status(500).json({ error: 'Erro ao buscar histórico.' });
		}
	}

	async getRoundByStage(req: Request, res: Response): Promise<Response> {
		const paramsResult = stageParamsSchema.safeParse(req.params);

		if (!paramsResult.success) {
			return res.status(500).json({ error: 'Erro ao buscar rodada.' });
		}

		try {
			const result = await this.roundsService.getRoundByStage(
				paramsResult.data.stage,
				this.getAuthenticatedUser(req).id,
			);
			return res.json(result);
		} catch (error) {
			console.error('Erro ao buscar rodada:', error);
			return res.status(500).json({ error: 'Erro ao buscar rodada.' });
		}
	}

	private getAuthenticatedUser(req: Request): AuthenticatedUser {
		return req.user as AuthenticatedUser;
	}
}
