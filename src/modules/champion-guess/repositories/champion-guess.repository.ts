import type { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';

const championConfigKeys = ['champion_deadline', 'champion_result'] as const;

const firstMatchSelect = {
	matchDate: true,
} satisfies Prisma.MatchSelect;

export type ChampionConfigKey = (typeof championConfigKeys)[number];

export type AppConfigRecord = {
	key: ChampionConfigKey;
	value: string;
};

export type FirstMatch = Prisma.MatchGetPayload<{
	select: typeof firstMatchSelect;
}>;

export class ChampionGuessRepository {
	findChampionConfigs(): Promise<AppConfigRecord[]> {
		return prisma.appConfig.findMany({
			where: { key: { in: [...championConfigKeys] } },
			select: { key: true, value: true },
		}) as Promise<AppConfigRecord[]>;
	}

	findFirstMatch(): Promise<FirstMatch | null> {
		return prisma.match.findFirst({
			orderBy: { matchDate: 'asc' },
			select: firstMatchSelect,
		});
	}

	findGuessByUserId(userId: string) {
		return prisma.championGuess.findUnique({
			where: { userId },
		});
	}

	upsertGuess(userId: string, team: string) {
		return prisma.championGuess.upsert({
			where: { userId },
			update: { team, points: 0, isCorrect: false },
			create: { userId, team },
		});
	}
}
