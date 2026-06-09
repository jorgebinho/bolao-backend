import type { AuthenticatedUser } from '../../../shared/auth/auth.types.js';
import { buildRanking } from '../../ranking/index.js';
import {
	GroupsRepository,
	type GroupMemberWithUser,
	type GroupMembership,
	type GroupMembershipWithCount,
	type GroupWithCount,
} from '../repositories/groups.repository.js';

export const GLOBAL_GROUP_CODE = 'GLOBAL';

export interface SerializedGroup {
	id: string;
	name: string;
	description: string | null;
	code: string;
	isGlobal: boolean;
	role: string;
	membersCount: number;
}

export interface GroupMemberSummary {
	id: string;
	name: string;
	email: string;
	appRole: string;
	groupRole: string;
	points: number;
	totalGuesses: number;
	joinedAt: Date;
}

export class GroupsServiceError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
	) {
		super(message);
	}
}

export function makeGroupCode(name: string): string {
	const base =
		String(name || 'grupo')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toUpperCase()
			.replace(/[^A-Z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 18) || 'GRUPO';

	const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
	return `${base}-${suffix}`;
}

export function serializeGroupMember(
	member: GroupMembershipWithCount,
): SerializedGroup {
	return {
		id: member.group.id,
		name: member.group.name,
		description: member.group.description,
		code: member.group.code,
		isGlobal: member.group.isGlobal,
		role: member.role,
		membersCount: member.group._count?.members || 0,
	};
}

export class GroupsService {
	constructor(private readonly groupsRepository: GroupsRepository) {}

	async ensureGlobalGroup() {
		const existingGroup = await this.groupsRepository.findGlobalGroup();
		if (existingGroup) {
			return existingGroup;
		}

		return this.groupsRepository.createGlobalGroup();
	}

	async ensureGlobalMembership(userId: string) {
		const group = await this.ensureGlobalGroup();
		await this.groupsRepository.upsertMembership({
			userId,
			groupId: group.id,
		});
		return group;
	}

	async ensureAllUsersInGlobalGroup() {
		const group = await this.ensureGlobalGroup();
		const users = await this.groupsRepository.findAllUserIds();

		await Promise.all(
			users.map((user) =>
				this.groupsRepository.upsertMembership({
					userId: user.id,
					groupId: group.id,
				}),
			),
		);

		return group;
	}

	async requireGroupMember(groupId: string, userId: string) {
		return this.groupsRepository.findMembership(groupId, userId);
	}

	async listGroupsForUser(userId: string): Promise<SerializedGroup[]> {
		await this.ensureGlobalMembership(userId);
		const memberships = await this.groupsRepository.findMembershipsForUser(userId);
		return memberships.map(serializeGroupMember);
	}

	async createGroup(input: {
		userId: string;
		name: string;
		description: string | null;
	}): Promise<SerializedGroup> {
		let code = makeGroupCode(input.name);

		for (let tries = 0; tries < 5; tries += 1) {
			const exists = await this.groupsRepository.groupCodeExists(code);
			if (!exists) {
				break;
			}

			code = makeGroupCode(input.name);
		}

		const group = await this.groupsRepository.createGroupWithOwner({
			name: input.name,
			description: input.description,
			code,
			ownerId: input.userId,
		});

		return this.serializeCreatedGroup(group);
	}

	async joinGroup(userId: string, code: string) {
		if (code === GLOBAL_GROUP_CODE) {
			await this.ensureAllUsersInGlobalGroup();
		}

		const group = await this.groupsRepository.findGroupByCode(code);
		if (!group) {
			throw new GroupsServiceError(404, 'Grupo não encontrado.');
		}

		const member = await this.groupsRepository.upsertMembership({
			userId,
			groupId: group.id,
		});

		return {
			group: serializeGroupMember(member),
			message: 'Você entrou no grupo.',
		};
	}

	async getGroup(groupId: string, userId: string): Promise<SerializedGroup> {
		const membership = await this.requireGroupMember(groupId, userId);

		if (!membership) {
			throw new GroupsServiceError(403, 'Você não participa deste grupo.');
		}

		const group = await this.groupsRepository.findGroupByIdWithCount(groupId);

		if (!group) {
			throw new GroupsServiceError(404, 'Grupo não encontrado.');
		}

		return {
			id: group.id,
			name: group.name,
			description: group.description,
			code: group.code,
			isGlobal: group.isGlobal,
			role: membership.role,
			membersCount: group._count.members,
		};
	}

	async getGroupRanking(groupId: string, currentUserId: string) {
		const membership = await this.requireGroupMember(groupId, currentUserId);

		if (!membership) {
			throw new GroupsServiceError(403, 'Você não participa deste grupo.');
		}

		const members = await this.groupsRepository.findMemberUserIds(groupId);
		return buildRanking(
			currentUserId,
			members.map((member) => member.userId),
		);
	}

	async listGroupMembers(
		groupId: string,
		currentUser: AuthenticatedUser,
	): Promise<{ canManage: boolean; members: GroupMemberSummary[] }> {
		const membership = await this.requireGroupMember(groupId, currentUser.id);

		if (!membership) {
			throw new GroupsServiceError(403, 'Você não participa deste grupo.');
		}

		const members = await this.groupsRepository.findGroupMembers(groupId);

		return {
			canManage:
				membership.role === 'OWNER' || currentUser.role === 'ADMIN',
			members: members.map((member) => this.serializeMemberSummary(member)),
		};
	}

	async removeGroupMember(input: {
		groupId: string;
		currentUser: AuthenticatedUser;
		targetUserId: string;
	}) {
		const membership = await this.requireGroupMember(
			input.groupId,
			input.currentUser.id,
		);

		if (
			!membership ||
			(membership.role !== 'OWNER' && input.currentUser.role !== 'ADMIN')
		) {
			throw new GroupsServiceError(403, 'Você não pode gerenciar este grupo.');
		}

		const target = await this.groupsRepository.findTargetMember(
			input.groupId,
			input.targetUserId,
		);

		if (!target) {
			throw new GroupsServiceError(404, 'Membro não encontrado.');
		}

		if (target.group.isGlobal) {
			throw new GroupsServiceError(
				400,
				'Não é possível remover do grupo global.',
			);
		}

		if (target.role === 'OWNER') {
			throw new GroupsServiceError(
				400,
				'Não é possível remover o dono do grupo.',
			);
		}

		await this.groupsRepository.deleteMembershipById(target.id);
		return { message: 'Membro removido do grupo.' };
	}

	private serializeCreatedGroup(group: GroupWithCount): SerializedGroup {
		return {
			id: group.id,
			name: group.name,
			description: group.description,
			code: group.code,
			isGlobal: group.isGlobal,
			role: 'OWNER',
			membersCount: group._count.members,
		};
	}

	private serializeMemberSummary(member: GroupMemberWithUser): GroupMemberSummary {
		return {
			id: member.user.id,
			name: member.user.name,
			email: member.user.email,
			appRole: member.user.role,
			groupRole: member.role,
			points: member.user.points,
			totalGuesses: member.user._count.guesses,
			joinedAt: member.createdAt,
		};
	}
}
