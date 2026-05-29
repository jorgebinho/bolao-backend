import bcrypt from 'bcryptjs';
import { buildRanking } from '../../ranking/index.js';
import {
	UsersRepository,
	type ProfileUser,
	type RecentGuess,
	type UpdatedUser,
} from '../repositories/users.repository.js';

export class UsersServiceError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
	) {
		super(message);
	}
}

interface ProfileResult {
	profile: {
		id: string;
		name: string;
		email: string;
		role: string;
		totalPoints: number;
		matchPoints: number;
		championPoints: number;
		totalGuesses: number;
		exactScores: number;
		partialScores: number;
		errors: number;
		hitRate: number;
		generalPosition: number | null;
		groupPosition: number | null;
		championGuess: ProfileUser['championGuess'];
		recentGuesses: Array<{
			id: string;
			homeGuess: number;
			awayGuess: number;
			points: number;
			updatedAt: Date;
			match: RecentGuess['match'];
		}>;
	};
}

export class UsersService {
	constructor(private readonly usersRepository: UsersRepository) {}

	async getProfile(userId: string, groupId?: string): Promise<ProfileResult> {
		const [user, ranking, recentGuesses] = await Promise.all([
			this.usersRepository.findProfileUserById(userId),
			buildRanking(userId),
			this.usersRepository.findRecentGuesses(userId),
		]);

		if (!user) {
			throw new UsersServiceError(500, 'Erro ao buscar perfil.');
		}

		const rankEntry = ranking.find((entry) => entry.id === userId);
		const groupPosition = await this.getGroupPosition(userId, groupId);

		return {
			profile: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				totalPoints: rankEntry?.totalPoints || user.points,
				matchPoints: user.points,
				championPoints: user.championGuess?.points || 0,
				totalGuesses: user._count.guesses,
				exactScores: user.guesses.filter((guess) => guess.points === 3).length,
				partialScores: user.guesses.filter((guess) => guess.points === 1).length,
				errors: user.guesses.filter((guess) => guess.points === 0).length,
				hitRate: user._count.guesses
					? Math.round(
							(user.guesses.filter((guess) => guess.points > 0).length /
								user._count.guesses) *
								100,
						)
					: 0,
				generalPosition: rankEntry?.position || null,
				groupPosition,
				championGuess: user.championGuess,
				recentGuesses: recentGuesses.map((guess) => ({
					id: guess.id,
					homeGuess: guess.homeGuess,
					awayGuess: guess.awayGuess,
					points: guess.points,
					updatedAt: guess.updatedAt,
					match: guess.match,
				})),
			},
		};
	}

	async updateProfile(userId: string, name: string): Promise<{ user: UpdatedUser }> {
		const user = await this.usersRepository.updateName(userId, name);
		return { user };
	}

	async updatePassword(input: {
		userId: string;
		currentPassword: string;
		newPassword: string;
	}): Promise<{ message: string }> {
		const user = await this.usersRepository.findUserPasswordById(input.userId);

		if (!user || !(await bcrypt.compare(input.currentPassword, user.password))) {
			throw new UsersServiceError(400, 'Senha atual incorreta.');
		}

		await this.usersRepository.updatePassword(
			input.userId,
			await bcrypt.hash(input.newPassword, 10),
		);

		return { message: 'Senha alterada com sucesso.' };
	}

	private async getGroupPosition(
		userId: string,
		groupId?: string,
	): Promise<number | null> {
		if (!groupId) {
			return null;
		}

		const members = await this.usersRepository.findGroupMemberUserIds(groupId);
		const ranking = await buildRanking(
			userId,
			members.map((member) => member.userId),
		);

		return ranking.find((entry) => entry.id === userId)?.position || null;
	}
}
