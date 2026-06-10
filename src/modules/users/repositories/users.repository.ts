import type { Prisma } from '@PrismaGen/client.js';
import { prisma } from '../../../shared/database/prisma.js';

const profileUserSelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	points: true,
	championGuess: {
		select: { team: true, points: true, isCorrect: true },
	},
	_count: { select: { guesses: true, groupMemberships: true } },
	guesses: { select: { points: true } },
} satisfies Prisma.UserSelect;

const updatedUserSelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	points: true,
} satisfies Prisma.UserSelect;

const recentGuessInclude = {
	match: {
		select: {
			id: true,
			homeTeam: true,
			awayTeam: true,
			homeScore: true,
			awayScore: true,
			matchDate: true,
			stage: true,
			status: true,
		},
	},
} satisfies Prisma.GuessInclude;

export type ProfileUser = Prisma.UserGetPayload<{
	select: typeof profileUserSelect;
}>;

export type UpdatedUser = Prisma.UserGetPayload<{
	select: typeof updatedUserSelect;
}>;

export type UserWithPassword = Prisma.UserGetPayload<{
	select: {
		id: true;
		password: true;
	};
}>;

export type RecentGuess = Prisma.GuessGetPayload<{
	include: typeof recentGuessInclude;
}>;

export class UsersRepository {
	findProfileUserById(userId: string): Promise<ProfileUser | null> {
		return prisma.user.findUnique({
			where: { id: userId },
			select: profileUserSelect,
		});
	}

	findRecentGuesses(userId: string): Promise<RecentGuess[]> {
		return prisma.guess.findMany({
			where: { userId },
			orderBy: { updatedAt: 'desc' },
			take: 8,
			include: recentGuessInclude,
		});
	}

	findGroupMemberUserIds(groupId: string) {
		return prisma.groupMember.findMany({
			where: { groupId },
			select: { userId: true },
		});
	}

	updateName(userId: string, name: string): Promise<UpdatedUser> {
		return prisma.user.update({
			where: { id: userId },
			data: { name },
			select: updatedUserSelect,
		});
	}

	findUserPasswordById(userId: string): Promise<UserWithPassword | null> {
		return prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, password: true },
		});
	}

	updatePassword(userId: string, password: string) {
		return prisma.user.update({
			where: { id: userId },
			data: { password },
		});
	}
}
