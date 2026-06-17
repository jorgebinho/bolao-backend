import { normalizeRankingUsers } from '../../../shared/scoring/scoring.js';
import type {
	RankingRecentGuess,
	RankingRepository,
	RankingUser,
} from '../repositories/ranking.repository.js';

export type RankingEntry = ReturnType<typeof normalizeRankingUsers>[number];

export class RankingService {
	constructor(private readonly rankingRepository: RankingRepository) {}

	async buildRanking(
		currentUserId: string,
		userIds?: string[],
	): Promise<RankingEntry[]> {
		const users = await this.rankingRepository.findUsersForRanking(userIds);
		return normalizeRankingUsers(users as RankingUser[], currentUserId);
	}

	async getRecentGuesses(userId: string): Promise<{
		guesses: Array<{
			id: string;
			homeGuess: number;
			awayGuess: number;
			points: number;
			updatedAt: Date;
			match: RankingRecentGuess['match'];
		}>;
	}> {
		const guesses =
			await this.rankingRepository.findRecentGuessesByUserId(userId);

		return {
			guesses: guesses.map((guess) => ({
				id: guess.id,
				homeGuess: guess.homeGuess,
				awayGuess: guess.awayGuess,
				points: guess.points,
				updatedAt: guess.updatedAt,
				match: guess.match,
			})),
		};
	}
}
