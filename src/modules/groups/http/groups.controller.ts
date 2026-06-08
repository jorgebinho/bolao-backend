import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../../shared/auth/auth.types.js';
import {
	GroupsService,
	GroupsServiceError,
} from '../services/groups.service.js';
import {
	createGroupSchema,
	groupIdParamsSchema,
	joinGroupSchema,
	removeGroupMemberParamsSchema,
} from './groups.schemas.js';

export class GroupsController {
	constructor(private readonly groupsService: GroupsService) {}

	async listGroups(req: Request, res: Response): Promise<Response> {
		try {
			const groups = await this.groupsService.listGroupsForUser(
				this.getAuthenticatedUser(req).id,
			);
			return res.json({ groups });
		} catch (error) {
			return this.handleError(error, res, 'Erro ao listar grupos:', 'Erro ao buscar grupos.');
		}
	}

	async createGroup(req: Request, res: Response): Promise<Response> {
		const parseResult = createGroupSchema.safeParse(req.body);

		if (!parseResult.success || parseResult.data.name.length < 3) {
			return res
				.status(400)
				.json({ error: 'Nome do grupo deve ter pelo menos 3 caracteres.' });
		}

		try {
			const group = await this.groupsService.createGroup({
				userId: this.getAuthenticatedUser(req).id,
				name: parseResult.data.name,
				description: parseResult.data.description || null,
			});

			return res.status(201).json({ group });
		} catch (error) {
			return this.handleError(error, res, 'Erro ao criar grupo:', 'Erro ao criar grupo.');
		}
	}

	async joinGroup(req: Request, res: Response): Promise<Response> {
		const parseResult = joinGroupSchema.safeParse(req.body);

		if (!parseResult.success || !parseResult.data.code) {
			return res.status(400).json({ error: 'Código do grupo é obrigatório.' });
		}

		try {
			const result = await this.groupsService.joinGroup(
				this.getAuthenticatedUser(req).id,
				parseResult.data.code,
			);
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao entrar no grupo:',
				'Erro ao entrar no grupo.',
			);
		}
	}

	async getGroup(req: Request, res: Response): Promise<Response> {
		const paramsResult = groupIdParamsSchema.safeParse(req.params);

		if (!paramsResult.success) {
			return res.status(404).json({ error: 'Grupo não encontrado.' });
		}

		try {
			const group = await this.groupsService.getGroup(
				paramsResult.data.id,
				this.getAuthenticatedUser(req).id,
			);
			return res.json({ group });
		} catch (error) {
			return this.handleError(error, res, 'Erro ao buscar grupo:', 'Erro ao buscar grupo.');
		}
	}

	async getGroupRanking(req: Request, res: Response): Promise<Response> {
		const paramsResult = groupIdParamsSchema.safeParse(req.params);

		if (!paramsResult.success) {
			return res.status(404).json({ error: 'Grupo não encontrado.' });
		}

		try {
			const ranking = await this.groupsService.getGroupRanking(
				paramsResult.data.id,
				this.getAuthenticatedUser(req).id,
			);
			return res.json({ ranking });
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao buscar ranking do grupo:',
				'Erro ao buscar ranking do grupo.',
			);
		}
	}

	async listMembers(req: Request, res: Response): Promise<Response> {
		const paramsResult = groupIdParamsSchema.safeParse(req.params);

		if (!paramsResult.success) {
			return res.status(404).json({ error: 'Grupo não encontrado.' });
		}

		try {
			const result = await this.groupsService.listGroupMembers(
				paramsResult.data.id,
				this.getAuthenticatedUser(req),
			);
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao listar membros:',
				'Erro ao buscar membros.',
			);
		}
	}

	async removeMember(req: Request, res: Response): Promise<Response> {
		const paramsResult = removeGroupMemberParamsSchema.safeParse(req.params);

		if (!paramsResult.success) {
			return res.status(404).json({ error: 'Membro não encontrado.' });
		}

		try {
			const result = await this.groupsService.removeGroupMember({
				groupId: paramsResult.data.id,
				targetUserId: paramsResult.data.userId,
				currentUser: this.getAuthenticatedUser(req),
			});
			return res.json(result);
		} catch (error) {
			return this.handleError(
				error,
				res,
				'Erro ao remover membro:',
				'Erro ao remover membro.',
			);
		}
	}

	private getAuthenticatedUser(req: Request): AuthenticatedUser {
		if (!req.user) {
			throw new GroupsServiceError(401, 'Token de autenticação não fornecido.');
		}

		return req.user;
	}

	private handleError(
		error: unknown,
		res: Response,
		logLabel: string,
		fallbackMessage: string,
	): Response {
		if (error instanceof GroupsServiceError) {
			return res.status(error.statusCode).json({ error: error.message });
		}

		console.error(logLabel, error);
		return res.status(500).json({ error: fallbackMessage });
	}
}
