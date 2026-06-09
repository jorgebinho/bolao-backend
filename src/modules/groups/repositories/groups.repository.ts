import type { GroupRole, Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';

const groupMemberCountInclude = {
	group: { include: { _count: { select: { members: true } } } },
} satisfies Prisma.GroupMemberInclude;

const groupCountInclude = {
	_count: { select: { members: true } },
} satisfies Prisma.GroupInclude;

const memberUserSelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	points: true,
	_count: { select: { guesses: true } },
} satisfies Prisma.UserSelect;

const groupMemberWithUserInclude = {
	user: { select: memberUserSelect },
} satisfies Prisma.GroupMemberInclude;

const groupOnlyInclude = {
	group: true,
} satisfies Prisma.GroupMemberInclude;

export type GroupMembershipWithCount = Prisma.GroupMemberGetPayload<{
	include: typeof groupMemberCountInclude;
}>;

export type GroupWithCount = Prisma.GroupGetPayload<{
	include: typeof groupCountInclude;
}>;

export type GroupMembership = Prisma.GroupMemberGetPayload<{
	include: typeof groupOnlyInclude;
}>;

export type GroupMemberWithUser = Prisma.GroupMemberGetPayload<{
	include: typeof groupMemberWithUserInclude;
}>;

export class GroupsRepository {
	findGlobalGroup() {
		return prisma.group.findUnique({ where: { code: 'GLOBAL' } });
	}

	createGlobalGroup() {
		return prisma.group.create({
			data: {
				name: 'Bolão Global',
				description: 'Grupo padrão com todos os participantes.',
				code: 'GLOBAL',
				isGlobal: true,
			},
		});
	}

	upsertMembership(input: {
		userId: string;
		groupId: string;
		role?: GroupRole;
	}) {
		const { userId, groupId, role = 'MEMBER' } = input;

		return prisma.groupMember.upsert({
			where: { userId_groupId: { userId, groupId } },
			update: {},
			create: { userId, groupId, role },
			include: groupMemberCountInclude,
		});
	}

	findAllUserIds() {
		return prisma.user.findMany({ select: { id: true } });
	}

	findMembershipsForUser(userId: string): Promise<GroupMembershipWithCount[]> {
		return prisma.groupMember.findMany({
			where: { userId },
			include: groupMemberCountInclude,
			orderBy: [{ group: { isGlobal: 'desc' } }, { createdAt: 'asc' }],
		});
	}

	findGroupByCode(code: string) {
		return prisma.group.findUnique({ where: { code } });
	}

	groupCodeExists(code: string) {
		return prisma.group.findUnique({ where: { code } });
	}

	createGroupWithOwner(input: {
		name: string;
		description: string | null;
		code: string;
		ownerId: string;
	}): Promise<GroupWithCount> {
		const { name, description, code, ownerId } = input;

		return prisma.group.create({
			data: {
				name,
				description,
				code,
				ownerId,
				members: { create: { userId: ownerId, role: 'OWNER' } },
			},
			include: groupCountInclude,
		});
	}

	findMembership(groupId: string, userId: string): Promise<GroupMembership | null> {
		return prisma.groupMember.findUnique({
			where: { userId_groupId: { userId, groupId } },
			include: groupOnlyInclude,
		});
	}

	findGroupByIdWithCount(groupId: string): Promise<GroupWithCount | null> {
		return prisma.group.findUnique({
			where: { id: groupId },
			include: groupCountInclude,
		});
	}

	findMemberUserIds(groupId: string) {
		return prisma.groupMember.findMany({
			where: { groupId },
			select: { userId: true },
		});
	}

	findGroupMembers(groupId: string): Promise<GroupMemberWithUser[]> {
		return prisma.groupMember.findMany({
			where: { groupId },
			include: groupMemberWithUserInclude,
			orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
		});
	}

	findTargetMember(groupId: string, userId: string): Promise<GroupMembership | null> {
		return prisma.groupMember.findUnique({
			where: { userId_groupId: { userId, groupId } },
			include: groupOnlyInclude,
		});
	}

	deleteMembershipById(id: string) {
		return prisma.groupMember.delete({ where: { id } });
	}
}
