import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../../shared/auth/auth.types.js';
import { AdminService, AdminServiceError } from '../services/admin.service.js';
import {
	asRecord,
	cleanText,
	parseChampionResultInput,
	parseCreateMatchInput,
	parseScoreMatchInput,
} from './admin.schemas.js';

export class AdminController {
	constructor(private readonly adminService: AdminService) {}

	async createMatch(req: Request, res: Response): Promise<Response> {
		const input = parseCreateMatchInput(req.body);

		if (!input) {
			return res
				.status(400)
				.json({ error: 'Times e data do jogo são obrigatórios.' });
		}

		if (input.homeTeam === input.awayTeam) {
			return res
				.status(400)
				.json({ error: 'Os times do jogo devem ser diferentes.' });
		}

		try {
			const result = await this.adminService.createMatch(input);
			return res.status(201).json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao criar jogo:',
				'Erro ao criar jogo.',
			);
		}
	}

	async updateMatch(req: Request, res: Response): Promise<Response> {
		const body = asRecord(req.body);
		const homeTeam = cleanText(body.homeTeam);
		const awayTeam = cleanText(body.awayTeam);

		if (homeTeam && awayTeam && homeTeam === awayTeam) {
			return res
				.status(400)
				.json({ error: 'Os times do jogo devem ser diferentes.' });
		}

		try {
			const result = await this.adminService.updateMatch(
				this.getRouteParam(req, 'id'),
				body,
			);
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao editar jogo:',
				'Erro ao editar jogo.',
			);
		}
	}

	async deleteMatch(req: Request, res: Response): Promise<Response> {
		try {
			const result = await this.adminService.deleteMatch(
				this.getRouteParam(req, 'id'),
			);
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao deletar jogo:',
				'Erro ao deletar jogo.',
			);
		}
	}

	async scoreMatch(req: Request, res: Response): Promise<Response> {
		const input = parseScoreMatchInput(req.body);

		if (!input) {
			return res.status(400).json({
				error: 'matchId, homeScore e awayScore válidos são obrigatórios.',
			});
		}

		try {
			const result = await this.adminService.scoreMatch(input);
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao pontuar jogo:',
				'Erro ao processar pontuação.',
			);
		}
	}

	async saveChampionResult(req: Request, res: Response): Promise<Response> {
		const input = parseChampionResultInput(req.body);

		if (!input) {
			return res.status(400).json({ error: 'Campeão oficial é obrigatório.' });
		}

		try {
			const result = await this.adminService.saveChampionResult(input.champion);
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao salvar campeão:',
				'Erro ao salvar campeão oficial.',
			);
		}
	}

	async listUsers(_req: Request, res: Response): Promise<Response> {
		try {
			const result = await this.adminService.listUsers();
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao listar usuários:',
				'Erro ao buscar usuários.',
			);
		}
	}

	async deleteUser(req: Request, res: Response): Promise<Response> {
		try {
			const result = await this.adminService.deleteUser(
				this.getAuthenticatedUser(req).id,
				this.getRouteParam(req, 'id'),
			);
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao remover usuário:',
				'Erro ao remover usuário.',
			);
		}
	}

	async promoteUser(req: Request, res: Response): Promise<Response> {
		try {
			const result = await this.adminService.promoteUser(
				this.getRouteParam(req, 'id'),
			);
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao promover usuário:',
				'Erro ao promover usuário.',
			);
		}
	}

	async demoteUser(req: Request, res: Response): Promise<Response> {
		try {
			const result = await this.adminService.demoteUser(
				this.getAuthenticatedUser(req).id,
				this.getRouteParam(req, 'id'),
			);
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao rebaixar usuário:',
				'Erro ao rebaixar usuário.',
			);
		}
	}

	private getAuthenticatedUser(req: Request): AuthenticatedUser {
		if (!req.user) {
			throw new AdminServiceError(401, 'Token de autenticação não fornecido.');
		}

		return req.user;
	}

	private getRouteParam(req: Request, name: string): string {
		const value = req.params[name];
		return Array.isArray(value) ? value[0] : value;
	}

	private handleError(
		error: unknown,
		res: Response,
		logLabel: string,
		fallbackMessage: string,
	): Response {
		if (error instanceof AdminServiceError) {
			return res.status(error.statusCode).json({ error: error.message });
		}

		console.error(logLabel, error);
		return res.status(500).json({ error: fallbackMessage });
	}
}
