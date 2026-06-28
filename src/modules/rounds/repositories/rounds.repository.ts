import type { Prisma } from '@PrismaGen/client.js';
import { prisma } from '../../../shared/database/prisma.js';

const historyGuessInclude = {
	match: {
		select: {
			id: true,
			homeTeam: true,
			awayTeam: true,
			homeScore: true,
			awayScore: true,
			advancingTeam: true,
			matchDate: true,
			stage: true,
			status: true,
		},
	},
} satisfies Prisma.GuessInclude;

const stageMatchesInclude = {
	guesses: true,
} satisfies Prisma.MatchInclude;

export type HistoryGuess = Prisma.GuessGetPayload<{
	include: typeof historyGuessInclude;
}>;

export type StageMatch = Prisma.MatchGetPayload<{
	include: typeof stageMatchesInclude;
}>;

export class RoundsRepository {
	findRoundSummaryMatches() {
		return prisma.match.findMany({
			select: { stage: true, id: true, status: true },
			orderBy: { matchDate: 'asc' },
		});
	}

	findHistoryGuesses(userId: string): Promise<HistoryGuess[]> {
		return prisma.guess.findMany({
			where: { userId },
			orderBy: { match: { matchDate: 'desc' } },
			include: historyGuessInclude,
		});
	}

	findMatchesByStage(stage: string, userId: string): Promise<StageMatch[]> {
		return prisma.match.findMany({
			where: stage === 'Sem fase definida' ? { stage: null } : { stage },
			orderBy: { matchDate: 'asc' },
			include: { guesses: { where: { userId } } },
		});
	}
}
