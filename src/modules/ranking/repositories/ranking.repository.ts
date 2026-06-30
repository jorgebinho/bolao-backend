import type { Prisma } from '@PrismaGen/client.js';
import { prisma } from '../../../shared/database/prisma.js';

const rankingUserSelect = {
	id: true,
	name: true,
	points: true,
	_count: { select: { guesses: true } },
	guesses: {
		select: { points: true, match: { select: { status: true } } },
	},
	championGuess: { select: { team: true, points: true, isCorrect: true } },
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

export type RankingUser = Prisma.UserGetPayload<{
	select: typeof rankingUserSelect;
}>;

export type RankingRecentGuess = Prisma.GuessGetPayload<{
	include: typeof recentGuessInclude;
}>;

export class RankingRepository {
	findUsersForRanking(userIds?: string[]): Promise<RankingUser[]> {
		return prisma.user.findMany({
			where: userIds ? { id: { in: userIds } } : undefined,
			select: rankingUserSelect,
		});
	}

	findRecentGuessesByUserId(userId: string): Promise<RankingRecentGuess[]> {
		return prisma.guess.findMany({
			where: { userId },
			orderBy: { updatedAt: 'desc' },
			take: 3,
			include: recentGuessInclude,
		});
	}
}
