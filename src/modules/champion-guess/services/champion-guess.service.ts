import { ChampionGuessRepository } from '../repositories/champion-guess.repository.js';

export interface ChampionState {
	deadline: string | undefined;
	isOpen: boolean;
	officialChampion: string | null;
}

export class ChampionGuessServiceError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
	) {
		super(message);
	}
}

export class ChampionGuessService {
	constructor(
		private readonly championGuessRepository: ChampionGuessRepository,
	) {}

	async getChampionState(): Promise<ChampionState> {
		const [configs, firstMatch] = await Promise.all([
			this.championGuessRepository.findChampionConfigs(),
			this.championGuessRepository.findFirstMatch(),
		]);

		const configMap = Object.fromEntries(
			configs.map((config) => [config.key, config.value]),
		);
		const deadline =
			configMap.champion_deadline ||
			process.env.CHAMPION_GUESS_DEADLINE ||
			firstMatch?.matchDate?.toISOString();
		const isOpen =
			typeof deadline === 'string' &&
			new Date() < new Date(deadline) &&
			!configMap.champion_result;

		return {
			deadline,
			isOpen,
			officialChampion: configMap.champion_result || null,
		};
	}

	async getChampionGuess(userId: string) {
		const [state, guess] = await Promise.all([
			this.getChampionState(),
			this.championGuessRepository.findGuessByUserId(userId),
		]);

		return { ...state, guess };
	}

	async saveChampionGuess(userId: string, team: string) {
		const state = await this.getChampionState();

		if (!state.isOpen) {
			throw new ChampionGuessServiceError(
				400,
				'Palpite de campeão já está fechado.',
			);
		}

		const guess = await this.championGuessRepository.upsertGuess(userId, team);

		return { guess, ...state };
	}
}
