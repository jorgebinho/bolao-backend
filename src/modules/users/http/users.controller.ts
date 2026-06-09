import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../../shared/auth/auth.types.js';
import {
	UsersService,
	UsersServiceError,
} from '../services/users.service.js';
import {
	profileQuerySchema,
	updatePasswordSchema,
	updateProfileSchema,
} from './users.schemas.js';

export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	async getProfile(req: Request, res: Response): Promise<Response> {
		const queryResult = profileQuerySchema.safeParse(req.query);

		try {
			const result = await this.usersService.getProfile(
				this.getAuthenticatedUser(req).id,
				queryResult.success ? queryResult.data.groupId : undefined,
			);

			return res.json(result);
		} catch (error) {
			return this.handleError(error, res, 'Erro ao buscar perfil:', 'Erro ao buscar perfil.');
		}
	}

	async updateProfile(req: Request, res: Response): Promise<Response> {
		const parseResult = updateProfileSchema.safeParse(req.body);

		if (!parseResult.success || parseResult.data.name.length < 2) {
			return res
				.status(400)
				.json({ error: 'Nome deve ter pelo menos 2 caracteres.' });
		}

		try {
			const result = await this.usersService.updateProfile(
				this.getAuthenticatedUser(req).id,
				parseResult.data.name,
			);

			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao atualizar usuário:',
				'Erro ao atualizar usuário.',
			);
		}
	}

	async updatePassword(req: Request, res: Response): Promise<Response> {
		const parseResult = updatePasswordSchema.safeParse(req.body);

		if (
			!parseResult.success ||
			!parseResult.data.currentPassword ||
			parseResult.data.newPassword.length < 6
		) {
			return res.status(400).json({
				error: 'Senha atual e nova senha com 6+ caracteres são obrigatórias.',
			});
		}

		try {
			const result = await this.usersService.updatePassword({
				userId: this.getAuthenticatedUser(req).id,
				currentPassword: parseResult.data.currentPassword,
				newPassword: parseResult.data.newPassword,
			});

			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao alterar senha:',
				'Erro ao alterar senha.',
			);
		}
	}

	private getAuthenticatedUser(req: Request): AuthenticatedUser {
		if (!req.user) {
			throw new UsersServiceError(401, 'Token de autenticação não fornecido.');
		}

		return req.user;
	}

	private handleError(
		error: unknown,
		res: Response,
		logLabel: string,
		fallbackMessage: string,
	): Response {
		if (error instanceof UsersServiceError) {
			return res.status(error.statusCode).json({ error: error.message });
		}

		console.error(logLabel, error);
		return res.status(500).json({ error: fallbackMessage });
	}
}
