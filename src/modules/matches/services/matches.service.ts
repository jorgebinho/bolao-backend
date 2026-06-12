import type { MatchStatus } from '@PrismaGen/client.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuthenticatedUser } from '../../../shared/auth/auth.types.js';
import type {
	MatchesRepository,
	MatchWithGuesses,
} from '../repositories/matches.repository.js';

const moduleDirname = path.dirname(fileURLToPath(import.meta.url));
const worldCupDataDir = path.resolve(
	moduleDirname,
	'../../../../data/worldcup',
);
const teamsPtBrPath =
	process.env.WORLDCUP_TEAMS_PT_BR_PATH ||
	path.join(worldCupDataDir, 'teams_pt_br_updated.csv');

const FIFA_TO_ISO_COUNTRY_CODE: Record<string, string> = {
	ALG: 'DZ',
	ARG: 'AR',
	AUS: 'AU',
	AUT: 'AT',
	BEL: 'BE',
	BIH: 'BA',
	BRA: 'BR',
	CAN: 'CA',
	CIV: 'CI',
	COD: 'CD',
	COL: 'CO',
	CPV: 'CV',
	CRO: 'HR',
	CUR: 'CW',
	CZE: 'CZ',
	ECU: 'EC',
	EGY: 'EG',
	ENG: 'GB',
	ESP: 'ES',
	FRA: 'FR',
	GER: 'DE',
	GHA: 'GH',
	HAI: 'HT',
	IRN: 'IR',
	IRQ: 'IQ',
	JOR: 'JO',
	JPN: 'JP',
	KOR: 'KR',
	KSA: 'SA',
	MAR: 'MA',
	MEX: 'MX',
	NED: 'NL',
	NOR: 'NO',
	NZL: 'NZ',
	PAN: 'PA',
	PAR: 'PY',
	POR: 'PT',
	QAT: 'QA',
	RSA: 'ZA',
	SCO: 'GB',
	SEN: 'SN',
	SUI: 'CH',
	SWE: 'SE',
	TUN: 'TN',
	TUR: 'TR',
	URU: 'UY',
	USA: 'US',
	UZB: 'UZ',
};

interface SerializedGuess {
	id: string;
	userId: string;
	userName: string;
	homeGuess: number;
	awayGuess: number;
	points: number;
}

interface SerializedMyGuess {
	id: string;
	homeGuess: number;
	awayGuess: number;
	points: number;
}

export interface SerializedMatch {
	id: string;
	homeTeam: string;
	awayTeam: string;
	homeFlag: string | null;
	awayFlag: string | null;
	matchDate: Date;
	stage: string | null;
	status: MatchStatus;
	homeScore: number | null;
	awayScore: number | null;
	lockTime: Date;
	isUrgent: boolean;
	minutesToLock: number;
	myGuess: SerializedMyGuess | null;
	guesses: SerializedGuess[];
	isLocked: boolean;
}

export interface WorldCupTeam {
	id: number;
	name: string;
	fifaCode: string;
	group: string;
}

export class MatchesServiceError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
	) {
		super(message);
	}
}

export class MatchesService {
	private teamFlagsByName: Map<string, string> | null = null;

	constructor(private readonly matchesRepository: MatchesRepository) {}

	async listMatchesForUser(
		user: AuthenticatedUser,
	): Promise<SerializedMatch[]> {
		const matches = await this.matchesRepository.findAllWithGuesses();
		const matchesToLock = matches
			.filter(
				(match) =>
					match.status === 'UPCOMING' && this.isMatchLocked(match.matchDate),
			)
			.map((match) => match.id);

		if (matchesToLock.length > 0) {
			await this.matchesRepository.lockMatches(matchesToLock);
		}

		return matches.map((match) => this.serializeMatch(match, user));
	}

	async listPendingAlertsForUser(
		user: AuthenticatedUser,
	): Promise<SerializedMatch[]> {
		const matches = await this.listMatchesForUser(user);
		return matches.filter((match) => match.isUrgent && !match.myGuess);
	}

	listTeams(): WorldCupTeam[] {
		return this.readCsv(teamsPtBrPath)
			.filter((team) => team.is_placeholder !== 'True')
			.map((team) => ({
				id: Number(team.id),
				name: team.team_name,
				fifaCode: team.fifa_code,
				group: team.group_letter,
			}))
			.sort(
				(a, b) =>
					a.group.localeCompare(b.group) || a.name.localeCompare(b.name),
			);
	}

	async saveGuess(input: {
		userId: string;
		matchId: string;
		homeGuess: number;
		awayGuess: number;
	}) {
		const match = await this.matchesRepository.findById(input.matchId);

		if (!match) {
			throw new MatchesServiceError(404, 'Jogo não encontrado.');
		}

		if (match.status === 'FINISHED') {
			throw new MatchesServiceError(400, 'Este jogo já foi finalizado.');
		}

		if (this.isMatchLocked(match.matchDate) || match.status === 'LOCKED') {
			throw new MatchesServiceError(
				400,
				'As apostas para este jogo já estão encerradas.',
			);
		}

		return this.matchesRepository.upsertGuess(input);
	}

	private getMatchLockTime(matchDate: Date): Date {
		return new Date(new Date(matchDate).getTime() - 15 * 60 * 1000);
	}

	private isMatchLocked(matchDate: Date): boolean {
		return new Date() >= this.getMatchLockTime(matchDate);
	}

	private isPendingUrgent(match: MatchWithGuesses, userId: string): boolean {
		if (match.status !== 'UPCOMING') return false;
		if (match.guesses.some((guess) => guess.userId === userId)) return false;

		const now = new Date();
		const lockTime = this.getMatchLockTime(match.matchDate);
		const alertStart = new Date(lockTime.getTime() - 60 * 60 * 1000);

		return now >= alertStart && now < lockTime;
	}

	private serializeMatch(
		match: MatchWithGuesses,
		currentUser: AuthenticatedUser,
	): SerializedMatch {
		const currentStatus =
			match.status === 'UPCOMING' && this.isMatchLocked(match.matchDate)
				? 'LOCKED'
				: match.status;
		const myGuess =
			match.guesses.find((guess) => guess.userId === currentUser.id) || null;
		const canShowAllGuesses =
			currentStatus === 'LOCKED' || currentStatus === 'FINISHED';
		const visibleGuesses = canShowAllGuesses
			? match.guesses.map((guess) => ({
					id: guess.id,
					userId: guess.userId,
					userName: guess.user?.name || 'Participante',
					homeGuess: guess.homeGuess,
					awayGuess: guess.awayGuess,
					points: guess.points,
				}))
			: myGuess
				? [
						{
							id: myGuess.id,
							userId: myGuess.userId,
							userName: currentUser.name,
							homeGuess: myGuess.homeGuess,
							awayGuess: myGuess.awayGuess,
							points: myGuess.points,
						},
					]
				: [];

		const lockTime = this.getMatchLockTime(match.matchDate);
		const urgent = this.isPendingUrgent(
			{ ...match, status: currentStatus },
			currentUser.id,
		);

		return {
			id: match.id,
			homeTeam: match.homeTeam,
			awayTeam: match.awayTeam,
			homeFlag:
				this.normalizeFlagValue(match.homeFlag) ||
				this.findTeamFlag(match.homeTeam),
			awayFlag:
				this.normalizeFlagValue(match.awayFlag) ||
				this.findTeamFlag(match.awayTeam),
			matchDate: match.matchDate,
			stage: match.stage,
			status: currentStatus,
			homeScore: match.homeScore,
			awayScore: match.awayScore,
			lockTime,
			isUrgent: urgent,
			minutesToLock: Math.max(
				Math.ceil((lockTime.getTime() - Date.now()) / 60000),
				0,
			),
			myGuess: myGuess
				? {
						id: myGuess.id,
						homeGuess: myGuess.homeGuess,
						awayGuess: myGuess.awayGuess,
						points: myGuess.points,
					}
				: null,
			guesses: visibleGuesses,
			isLocked: currentStatus !== 'UPCOMING',
		};
	}

	private readCsv(filePath: string): Record<string, string>[] {
		const content = fs.readFileSync(filePath, 'utf8').trim();
		const [headerLine, ...lines] = content.split(/\r?\n/);
		const headers = headerLine.split(',');

		return lines.filter(Boolean).map((line) => {
			const values = line.split(',');
			return Object.fromEntries(
				headers.map((header, index) => [header, values[index] ?? '']),
			);
		});
	}

	private findTeamFlag(teamName: string): string | null {
		if (!this.teamFlagsByName) {
			this.teamFlagsByName = this.buildTeamFlagsByName();
		}

		return this.teamFlagsByName.get(this.normalizeTeamName(teamName)) || null;
	}

	private normalizeFlagValue(flag: string | null): string | null {
		const value = flag?.trim();
		if (!value) return null;

		if (/^[a-z]{2}$/i.test(value)) {
			return this.countryCodeToFlagUrl(value);
		}

		const isoCountryCode = FIFA_TO_ISO_COUNTRY_CODE[value.toUpperCase()];
		if (isoCountryCode) {
			return this.countryCodeToFlagUrl(isoCountryCode);
		}

		return value;
	}

	private buildTeamFlagsByName(): Map<string, string> {
		const flags = new Map<string, string>();

		for (const team of this.listTeams()) {
			const isoCountryCode = FIFA_TO_ISO_COUNTRY_CODE[team.fifaCode];
			if (!isoCountryCode) continue;

			flags.set(
				this.normalizeTeamName(team.name),
				this.countryCodeToFlagUrl(isoCountryCode),
			);
		}

		return flags;
	}

	private normalizeTeamName(teamName: string): string {
		return teamName
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
	}

	private countryCodeToFlagUrl(countryCode: string): string {
		return `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`;
	}
}
