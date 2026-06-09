import { RankingRepository } from './repositories/ranking.repository.js';
import { RankingService } from './services/ranking.service.js';

const rankingRepository = new RankingRepository();
const rankingService = new RankingService(rankingRepository);

export { RankingService, type RankingEntry } from './services/ranking.service.js';

export function buildRanking(currentUserId: string, userIds?: string[]) {
	return rankingService.buildRanking(currentUserId, userIds);
}
