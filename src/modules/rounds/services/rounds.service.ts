import { RoundsRepository, type HistoryGuess, type StageMatch } from '../repositories/rounds.repository.js';

const UNDEFINED_STAGE_LABEL = 'Sem fase definida';

interface RoundSummary {
	stage: string;
	totalMatches: number;
	finishedMatches: number;
}

interface HistoryGroup {
	stage: string;
	totalPoints: number;
	guesses: Array<{
		id: string;
		homeGuess: number;
		awayGuess: number;
		points: number;
		match: HistoryGuess['match'];
	}>;
}

export class RoundsService {
	constructor(private readonly roundsRepository: RoundsRepository) {}

	listRounds(): Promise<{ rounds: RoundSummary[] }> {
		return this.buildRoundSummaries();
	}

	async getHistory(userId: string): Promise<{ history: HistoryGroup[] }> {
		const guesses = await this.roundsRepository.findHistoryGuesses(userId);
		const grouped = new Map<string, HistoryGroup>();

		for (const guess of guesses) {
			const stage = this.normalizeStage(guess.match.stage);
			if (!grouped.has(stage)) {
				grouped.set(stage, { stage, totalPoints: 0, guesses: [] });
			}

			const entry = grouped.get(stage)!;
			entry.totalPoints += guess.points;
			entry.guesses.push(this.serializeHistoryGuess(guess));
		}

		return { history: Array.from(grouped.values()) };
	}

	async getRoundByStage(
		rawStage: string,
		userId: string,
	): Promise<{
		stage: string;
		matches: Array<{
			id: string;
			homeTeam: string;
			awayTeam: string;
			homeScore: number | null;
			awayScore: number | null;
			matchDate: Date;
			status: StageMatch['status'];
			myGuess: StageMatch['guesses'][number] | null;
		}>;
	}> {
		const stage = decodeURIComponent(rawStage);
		const matches = await this.roundsRepository.findMatchesByStage(stage, userId);

		return {
			stage,
			matches: matches.map((match) => ({
				id: match.id,
				homeTeam: match.homeTeam,
				awayTeam: match.awayTeam,
				homeScore: match.homeScore,
				awayScore: match.awayScore,
				matchDate: match.matchDate,
				status: match.status,
				myGuess: match.guesses[0] || null,
			})),
		};
	}

	private async buildRoundSummaries(): Promise<{ rounds: RoundSummary[] }> {
		const matches = await this.roundsRepository.findRoundSummaryMatches();
		const grouped = new Map<string, RoundSummary>();

		for (const match of matches) {
			const stage = this.normalizeStage(match.stage);
			if (!grouped.has(stage)) {
				grouped.set(stage, {
					stage,
					totalMatches: 0,
					finishedMatches: 0,
				});
			}

			const entry = grouped.get(stage)!;
			entry.totalMatches += 1;
			if (match.status === 'FINISHED') {
				entry.finishedMatches += 1;
			}
		}

		return { rounds: Array.from(grouped.values()) };
	}

	private normalizeStage(stage: string | null): string {
		return stage || UNDEFINED_STAGE_LABEL;
	}

	private serializeHistoryGuess(guess: HistoryGuess) {
		return {
			id: guess.id,
			homeGuess: guess.homeGuess,
			awayGuess: guess.awayGuess,
			points: guess.points,
			match: guess.match,
		};
	}
}
