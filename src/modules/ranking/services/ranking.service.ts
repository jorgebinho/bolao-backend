import { normalizeRankingUsers } from '../../../shared/scoring/scoring.js';
import {
	RankingRepository,
	type RankingUser,
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
}
