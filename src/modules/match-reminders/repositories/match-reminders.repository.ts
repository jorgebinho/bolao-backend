import type { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';

const reminderMatchInclude = {
	guesses: { select: { userId: true } },
	reminders: { select: { userId: true } },
} satisfies Prisma.MatchInclude;

const reminderUserSelect = {
	id: true,
	name: true,
	email: true,
} satisfies Prisma.UserSelect;

export type ReminderMatch = Prisma.MatchGetPayload<{
	include: typeof reminderMatchInclude;
}>;

export type ReminderUser = Prisma.UserGetPayload<{
	select: typeof reminderUserSelect;
}>;

export class MatchRemindersRepository {
	findMatchesInReminderWindow(input: {
		minMatchDate: Date;
		maxMatchDate: Date;
	}): Promise<ReminderMatch[]> {
		return prisma.match.findMany({
			where: {
				status: 'UPCOMING',
				matchDate: {
					gte: input.minMatchDate,
					lte: input.maxMatchDate,
				},
			},
			orderBy: { matchDate: 'asc' },
			include: reminderMatchInclude,
		});
	}

	findUsersWithoutGuessOrReminder(input: {
		guessedUserIds: string[];
		remindedUserIds: string[];
	}): Promise<ReminderUser[]> {
		const ignoredUserIds = [
			...new Set([...input.guessedUserIds, ...input.remindedUserIds]),
		];

		return prisma.user.findMany({
			where: {
				id: ignoredUserIds.length > 0 ? { notIn: ignoredUserIds } : undefined,
			},
			select: reminderUserSelect,
			orderBy: { name: 'asc' },
		});
	}

	recordReminderSent(input: { userId: string; matchId: string }) {
		return prisma.matchReminderEmail.upsert({
			where: {
				userId_matchId: {
					userId: input.userId,
					matchId: input.matchId,
				},
			},
			update: {},
			create: input,
		});
	}
}
