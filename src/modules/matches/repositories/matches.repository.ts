import type { Prisma } from '@PrismaGen/client.js';
import { prisma } from '../../../shared/database/prisma.js';

const matchGuessUserSelect = {
	id: true,
	name: true,
} satisfies Prisma.UserSelect;

const matchWithGuessesInclude = {
	guesses: {
		include: {
			user: { select: matchGuessUserSelect },
		},
	},
} satisfies Prisma.MatchInclude;

export type MatchWithGuesses = Prisma.MatchGetPayload<{
	include: typeof matchWithGuessesInclude;
}>;

export class MatchesRepository {
	findAllWithGuesses(): Promise<MatchWithGuesses[]> {
		return prisma.match.findMany({
			orderBy: { matchDate: 'asc' },
			include: matchWithGuessesInclude,
		});
	}

	lockMatches(matchIds: string[]): Promise<Prisma.BatchPayload> {
		return prisma.match.updateMany({
			where: { id: { in: matchIds } },
			data: { status: 'LOCKED' },
		});
	}

	findById(matchId: string) {
		return prisma.match.findUnique({
			where: { id: matchId },
		});
	}

	upsertGuess(input: {
		userId: string;
		matchId: string;
		homeGuess: number;
		awayGuess: number;
	}) {
		const { userId, matchId, homeGuess, awayGuess } = input;

		return prisma.guess.upsert({
			where: { userId_matchId: { userId, matchId } },
			update: { homeGuess, awayGuess },
			create: { userId, matchId, homeGuess, awayGuess },
		});
	}
}
