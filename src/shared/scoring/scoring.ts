export const CHAMPION_BONUS_POINTS = 5;

export function calculateMatchPoints(
	homeGuess: number,
	awayGuess: number,
	homeScore: number,
	awayScore: number,
): number {
	if (homeGuess === homeScore && awayGuess === awayScore) return 3;

	const guessResult = Math.sign(homeGuess - awayGuess);
	const realResult = Math.sign(homeScore - awayScore);
	return guessResult === realResult ? 1 : 0;
}

interface EvaluatedGuess {
	points: number;
	match: {
		status: 'UPCOMING' | 'LOCKED' | 'FINISHED';
	};
}

interface FinishedGuessSummary {
	finishedGuesses: number;
	exactScores: number;
	partialScores: number;
	errors: number;
	hitRate: number;
}

export function summarizeFinishedGuesses(
	guesses: EvaluatedGuess[],
): FinishedGuessSummary {
	const finishedGuesses = guesses.filter(
		(guess) => guess.match.status === 'FINISHED',
	);
	const exactScores = finishedGuesses.filter(
		(guess) => guess.points === 3,
	).length;
	const partialScores = finishedGuesses.filter(
		(guess) => guess.points === 1,
	).length;
	const errors = finishedGuesses.filter((guess) => guess.points === 0).length;
	const hits = exactScores + partialScores;

	return {
		finishedGuesses: finishedGuesses.length,
		exactScores,
		partialScores,
		errors,
		hitRate: finishedGuesses.length
			? Math.round((hits / finishedGuesses.length) * 100)
			: 0,
	};
}

interface RankingChampionGuess {
	team: string;
	isCorrect: boolean;
	points: number;
}

interface RankingUser {
	id: string;
	name: string;
	points: number;
	guesses?: EvaluatedGuess[];
	championGuess?: RankingChampionGuess | null;
	_count?: {
		guesses?: number;
	};
}

export function normalizeRankingUsers(
	users: RankingUser[],
	currentUserId: string,
) {
	return users
		.map((user) => {
			const guesses = user.guesses || [];
			const guessSummary = summarizeFinishedGuesses(guesses);
			const championPoints = user.championGuess?.points || 0;
			const matchPoints = user.points || 0;
			const totalGuesses = user._count?.guesses ?? guesses.length;
			const totalPoints = matchPoints + championPoints;

			return {
				id: user.id,
				name: user.name,
				matchPoints,
				championPoints,
				totalPoints,
				totalGuesses,
				exactScores: guessSummary.exactScores,
				partialScores: guessSummary.partialScores,
				errors: guessSummary.errors,
				championGuess: user.championGuess
					? {
							team: user.championGuess.team,
							isCorrect: user.championGuess.isCorrect,
							points: user.championGuess.points,
						}
					: null,
				isCurrentUser: user.id === currentUserId,
			};
		})
		.sort((a, b) => {
			if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
			if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
			if (b.partialScores !== a.partialScores)
				return b.partialScores - a.partialScores;
			return 0;
		})
		.map((user, index) => ({ ...user, position: index + 1 }));
}
