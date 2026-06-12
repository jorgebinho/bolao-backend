import type { Prisma } from '@PrismaGen/client.js';
import { prisma } from '../../../shared/database/prisma.js';

const rankingUserSelect = {
	id: true,
	name: true,
	points: true,
	_count: { select: { guesses: true } },
	guesses: { select: { points: true } },
	championGuess: { select: { team: true, points: true, isCorrect: true } },
} satisfies Prisma.UserSelect;

export type RankingUser = Prisma.UserGetPayload<{
	select: typeof rankingUserSelect;
}>;

export class RankingRepository {
	findUsersForRanking(userIds?: string[]): Promise<RankingUser[]> {
		return prisma.user.findMany({
			where: userIds ? { id: { in: userIds } } : undefined,
			select: rankingUserSelect,
		});
	}
}
