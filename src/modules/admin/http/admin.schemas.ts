type InputRecord = Record<string, unknown>;

export interface CreateMatchInput {
	homeTeam: string;
	awayTeam: string;
	homeFlag: string | null;
	awayFlag: string | null;
	matchDate: Date;
	stage: string | null;
}

export interface ScoreMatchInput {
	matchId: string;
	homeScore: number;
	awayScore: number;
}

export interface ResetUserPasswordInput {
	password: string;
}

export function asRecord(value: unknown): InputRecord {
	return value && typeof value === 'object' ? (value as InputRecord) : {};
}

export function cleanText(value: unknown): string | null {
	const text = String(value || '').trim();
	return text || null;
}

export function parseCreateMatchInput(body: unknown): CreateMatchInput | null {
	const record = asRecord(body);
	const homeTeam = cleanText(record.homeTeam);
	const awayTeam = cleanText(record.awayTeam);
	const matchDate = record.matchDate ? new Date(record.matchDate as string) : null;

	if (
		!homeTeam ||
		!awayTeam ||
		!matchDate ||
		Number.isNaN(matchDate.getTime())
	) {
		return null;
	}

	return {
		homeTeam,
		awayTeam,
		homeFlag: cleanText(record.homeFlag),
		awayFlag: cleanText(record.awayFlag),
		matchDate,
		stage: cleanText(record.stage),
	};
}

export function parseScoreMatchInput(body: unknown): ScoreMatchInput | null {
	const record = asRecord(body);
	const matchId =
		typeof record.matchId === 'string' ? record.matchId : String(record.matchId || '');
	const homeScore = Number(record.homeScore);
	const awayScore = Number(record.awayScore);

	if (
		!matchId ||
		!Number.isInteger(homeScore) ||
		!Number.isInteger(awayScore) ||
		homeScore < 0 ||
		awayScore < 0
	) {
		return null;
	}

	return { matchId, homeScore, awayScore };
}

export function parseChampionResultInput(
	body: unknown,
): { champion: string } | null {
	const champion = cleanText(asRecord(body).champion);
	return champion ? { champion } : null;
}

export function parseResetUserPasswordInput(
	body: unknown,
): ResetUserPasswordInput | null {
	const password = cleanText(asRecord(body).password);
	return password ? { password } : null;
}
