import bcrypt from 'bcryptjs';
import {
	CHAMPION_BONUS_POINTS,
	calculateMatchPoints,
	isKnockoutStage,
} from '../../../shared/scoring/scoring.js';
import {
	AdminRepository,
	type ScoreUpdate,
	type SaveMatchInput,
} from '../repositories/admin.repository.js';

export class AdminServiceError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
	) {
		super(message);
	}
}

type UpdateMatchBody = Record<string, unknown>;

function cleanText(value: unknown): string | null {
	const text = String(value || '').trim();
	return text || null;
}

export class AdminService {
	constructor(private readonly adminRepository: AdminRepository) {}

	async createMatch(input: SaveMatchInput) {
		const match = await this.adminRepository.createMatch(input);
		return { match };
	}

	async updateMatch(id: string, body: UpdateMatchBody) {
		const match = await this.adminRepository.findMatchById(id);

		if (!match) {
			throw new AdminServiceError(404, 'Jogo não encontrado.');
		}

		if (match.status === 'FINISHED') {
			throw new AdminServiceError(
				400,
				'Não é possível editar um jogo já finalizado.',
			);
		}

		const nextDate = body.matchDate ? new Date(body.matchDate as string) : match.matchDate;
		if (Number.isNaN(nextDate.getTime())) {
			throw new AdminServiceError(400, 'Data do jogo inválida.');
		}

		const homeTeam = cleanText(body.homeTeam) || match.homeTeam;
		const awayTeam = cleanText(body.awayTeam) || match.awayTeam;

		if (homeTeam === awayTeam) {
			throw new AdminServiceError(
				400,
				'Os times do jogo devem ser diferentes.',
			);
		}

		const updated = await this.adminRepository.updateMatch(id, {
			homeTeam,
			awayTeam,
			homeFlag:
				body.homeFlag !== undefined ? cleanText(body.homeFlag) : match.homeFlag,
			awayFlag:
				body.awayFlag !== undefined ? cleanText(body.awayFlag) : match.awayFlag,
			matchDate: nextDate,
			stage: body.stage !== undefined ? cleanText(body.stage) : match.stage,
		});

		return { match: updated };
	}

	async deleteMatch(id: string) {
		const match = await this.adminRepository.findMatchById(id);

		if (!match) {
			throw new AdminServiceError(404, 'Jogo não encontrado.');
		}

		if (match.status !== 'UPCOMING') {
			throw new AdminServiceError(
				400,
				'Só é possível deletar jogos que ainda não foram bloqueados.',
			);
		}

		await this.adminRepository.deleteMatch(id);
		return { message: 'Jogo removido com sucesso.' };
	}

	async scoreMatch(input: {
		matchId: string;
		homeScore: number;
		awayScore: number;
		advancingTeam: string | null;
	}) {
		const match = await this.adminRepository.findMatchWithGuesses(input.matchId);

		if (!match) {
			throw new AdminServiceError(404, 'Jogo não encontrado.');
		}

		if (match.status === 'FINISHED') {
			throw new AdminServiceError(400, 'Este jogo já foi pontuado.');
		}

		const advancingTeam = this.resolveMatchAdvancingTeam(match, input);
		const updates: ScoreUpdate[] = match.guesses.map((guess) => ({
			guessId: guess.id,
			userId: guess.userId,
			points: calculateMatchPoints(
				guess.homeGuess,
				guess.awayGuess,
				input.homeScore,
				input.awayScore,
				{
					stage: match.stage,
					guessAdvancingTeam: guess.advancingTeam,
					matchAdvancingTeam: advancingTeam,
				},
			),
		}));

		await this.adminRepository.scoreMatch(
			input.matchId,
			input.homeScore,
			input.awayScore,
			advancingTeam,
			updates,
		);

		const updatedMatch =
			await this.adminRepository.findScoredMatchById(input.matchId);

		return {
			message: `Jogo pontuado com sucesso. ${updates.length} palpite(s) processado(s).`,
			match: updatedMatch,
			summary: updates,
		};
	}

	private resolveMatchAdvancingTeam(
		match: { stage: string | null; homeTeam: string; awayTeam: string },
		input: {
			homeScore: number;
			awayScore: number;
			advancingTeam: string | null;
		},
	): string | null {
		const isDrawResult = input.homeScore === input.awayScore;
		if (!isKnockoutStage(match.stage)) return null;

		if (!isDrawResult) {
			return input.homeScore > input.awayScore
				? match.homeTeam
				: match.awayTeam;
		}

		const advancingTeam = String(input.advancingTeam || '').trim();
		if (!advancingTeam) {
			throw new AdminServiceError(
				400,
				'Informe quem se classificou neste mata-mata.',
			);
		}

		if (
			advancingTeam !== match.homeTeam &&
			advancingTeam !== match.awayTeam
		) {
			throw new AdminServiceError(
				400,
				'O classificado deve ser um dos times da partida.',
			);
		}

		return advancingTeam;
	}

	async saveChampionResult(champion: string) {
		const result = await this.adminRepository.saveChampionResult(
			champion,
			CHAMPION_BONUS_POINTS,
		);

		return { champion, ...result, message: 'Campeão oficial salvo.' };
	}

	async listUsers() {
		const users = await this.adminRepository.findUsers();
		return { users };
	}

	async deleteUser(actorUserId: string, userId: string) {
		if (userId === actorUserId) {
			throw new AdminServiceError(400, 'Você não pode remover a si mesmo.');
		}

		const user = await this.adminRepository.findUserById(userId);

		if (!user) {
			throw new AdminServiceError(404, 'Usuário não encontrado.');
		}

		await this.adminRepository.deleteUser(userId);

		return {
			message: `Usuário "${user.name}" removido com sucesso.`,
		};
	}

	async promoteUser(userId: string) {
		const user = await this.adminRepository.findUserById(userId);

		if (!user) {
			throw new AdminServiceError(404, 'Usuário não encontrado.');
		}

		if (user.role === 'ADMIN') {
			throw new AdminServiceError(
				400,
				'Este usuário já é administrador.',
			);
		}

		const updated = await this.adminRepository.promoteUser(userId);

		return {
			user: updated,
			message: `${updated.name} agora é ADMIN.`,
		};
	}

	async demoteUser(actorUserId: string, userId: string) {
		if (userId === actorUserId) {
			throw new AdminServiceError(
				400,
				'Você não pode rebaixar a si mesmo.',
			);
		}

		const user = await this.adminRepository.demoteUser(userId);
		return { user };
	}

	async resetUserPassword(userId: string, password: string) {
		if (password.length < 6) {
			throw new AdminServiceError(400, 'A nova senha deve ter pelo menos 6 caracteres.');
		}

		const user = await this.adminRepository.findUserById(userId);

		if (!user) {
			throw new AdminServiceError(404, 'Usuário não encontrado.');
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		const updated = await this.adminRepository.updateUserPassword(
			userId,
			hashedPassword,
		);

		return {
			user: updated,
			message: `Senha de "${updated.name}" redefinida com sucesso.`,
		};
	}
}
