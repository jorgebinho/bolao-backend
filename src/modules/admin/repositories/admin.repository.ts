import type { Prisma } from '@PrismaGen/client.js';
import { prisma } from '../../../shared/database/prisma.js';

const scoredMatchUserSelect = {
	id: true,
	name: true,
} satisfies Prisma.UserSelect;

const scoredMatchInclude = {
	guesses: {
		include: {
			user: {
				select: scoredMatchUserSelect,
			},
		},
	},
} satisfies Prisma.MatchInclude;

const adminUserSelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	points: true,
	createdAt: true,
	_count: { select: { guesses: true, groupMemberships: true } },
	championGuess: {
		select: { team: true, points: true, isCorrect: true },
	},
} satisfies Prisma.UserSelect;

const promotedUserSelect = {
	id: true,
	name: true,
	email: true,
	role: true,
} satisfies Prisma.UserSelect;

export type MatchWithGuesses = Prisma.MatchGetPayload<{
	include: { guesses: true };
}>;

export type ScoredMatch = Prisma.MatchGetPayload<{
	include: typeof scoredMatchInclude;
}>;

export type AdminUser = Prisma.UserGetPayload<{
	select: typeof adminUserSelect;
}>;

export type PromotedUser = Prisma.UserGetPayload<{
	select: typeof promotedUserSelect;
}>;

export interface ScoreUpdate {
	guessId: string;
	userId: string;
	points: number;
}

export interface SaveMatchInput {
	homeTeam: string;
	awayTeam: string;
	homeFlag: string | null;
	awayFlag: string | null;
	matchDate: Date;
	stage: string | null;
}

export class AdminRepository {
	createMatch(data: SaveMatchInput) {
		return prisma.match.create({ data });
	}

	findMatchById(id: string) {
		return prisma.match.findUnique({ where: { id } });
	}

	updateMatch(id: string, data: SaveMatchInput) {
		return prisma.match.update({
			where: { id },
			data,
		});
	}

	deleteMatch(id: string) {
		return prisma.match.delete({ where: { id } });
	}

	findMatchWithGuesses(id: string): Promise<MatchWithGuesses | null> {
		return prisma.match.findUnique({
			where: { id },
			include: { guesses: true },
		});
	}

	async scoreMatch(
		matchId: string,
		homeScore: number,
		awayScore: number,
		advancingTeam: string | null,
		updates: ScoreUpdate[],
	): Promise<void> {
		await prisma.$transaction(async (tx) => {
			for (const { guessId, points } of updates) {
				await tx.guess.update({ where: { id: guessId }, data: { points } });
			}

			for (const { userId, points } of updates) {
				if (points > 0) {
					await tx.user.update({
						where: { id: userId },
						data: { points: { increment: points } },
					});
				}
			}

			await tx.match.update({
				where: { id: matchId },
				data: { status: 'FINISHED', homeScore, awayScore, advancingTeam },
			});
		});
	}

	findScoredMatchById(id: string): Promise<ScoredMatch | null> {
		return prisma.match.findUnique({
			where: { id },
			include: scoredMatchInclude,
		});
	}

	async saveChampionResult(champion: string, championBonusPoints: number) {
		return prisma.$transaction(async (tx) => {
			await tx.appConfig.upsert({
				where: { key: 'champion_result' },
				update: { value: champion },
				create: { key: 'champion_result', value: champion },
			});

			const guesses = await tx.championGuess.findMany();
			for (const guess of guesses) {
				const isCorrect = guess.team.toLowerCase() === champion.toLowerCase();
				await tx.championGuess.update({
					where: { id: guess.id },
					data: {
						isCorrect,
						points: isCorrect ? championBonusPoints : 0,
					},
				});
			}

			return { processed: guesses.length };
		});
	}

	findUsers(): Promise<AdminUser[]> {
		return prisma.user.findMany({
			select: adminUserSelect,
			orderBy: [{ points: 'desc' }, { name: 'asc' }],
		});
	}

	findUserById(id: string) {
		return prisma.user.findUnique({ where: { id } });
	}

	deleteUser(id: string) {
		return prisma.user.delete({ where: { id } });
	}

	promoteUser(id: string): Promise<PromotedUser> {
		return prisma.user.update({
			where: { id },
			data: { role: 'ADMIN' },
			select: promotedUserSelect,
		});
	}

	demoteUser(id: string): Promise<PromotedUser> {
		return prisma.user.update({
			where: { id },
			data: { role: 'USER' },
			select: promotedUserSelect,
		});
	}

	updateUserPassword(id: string, hashedPassword: string) {
		return prisma.user.update({
			where: { id },
			data: { password: hashedPassword },
			select: promotedUserSelect,
		});
	}
}
