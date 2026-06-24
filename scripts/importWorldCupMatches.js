import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const __dirname = import.meta.dirname;

const WORLDCUP_DATA_DIR = path.resolve(__dirname, '..', 'data', 'worldcup');
const ARCHIVE_DIR = process.env.WORLDCUP_DATASET_DIR || WORLDCUP_DATA_DIR;
const TEAMS_PT_BR_FILE =
	process.env.WORLDCUP_TEAMS_PT_BR_PATH ||
	path.join(WORLDCUP_DATA_DIR, 'teams_pt_br_updated.csv');

const STAGE_LABELS = {
	'Group Stage': 'Fase de Grupos',
	'Round of 32': 'Fase de 32',
	'Round of 16': 'Oitavas de Final',
	Quarterfinals: 'Quartas de Final',
	Semifinals: 'Semifinal',
	'Third Place Playoff': 'Disputa 3 Lugar',
	Final: 'Final',
};

const FIFA_TO_ISO_COUNTRY_CODE = {
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
	SCO: 'GB-SCT',
	SEN: 'SN',
	SUI: 'CH',
	SWE: 'SE',
	TUN: 'TN',
	TUR: 'TR',
	URU: 'UY',
	USA: 'US',
	UZB: 'UZ',
};

function readCsv(fileNameOrPath) {
	const filePath = path.isAbsolute(fileNameOrPath)
		? fileNameOrPath
		: path.join(ARCHIVE_DIR, fileNameOrPath);
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

function parseKickoff(value) {
	const normalized = value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
	const date = new Date(normalized);

	if (Number.isNaN(date.getTime())) {
		throw new Error(`Data inválida no dataset: ${value}`);
	}

	return date;
}

function groupLabel(label) {
	const match = String(label || '').match(/^Group\s+([A-Z])$/i);
	return match ? `Grupo ${match[1].toUpperCase()}` : label;
}

function stageLabel(stageName, matchLabel) {
	const base = STAGE_LABELS[stageName] || stageName || 'Copa do Mundo';
	const label = groupLabel(matchLabel);

	if (base === 'Fase de Grupos') return `${base} - ${label}`;
	return base;
}

function teamNameFromMatch(
	row,
	teamsById,
	side,
	options = { translatePlaceholder: true },
) {
	const id = row[`${side}_team_id`];
	if (id && teamsById.has(id)) return teamsById.get(id).team_name;

	const parts = String(row.match_label || '').split(/\s+vs\s+/i);
	const fallback = side === 'home' ? parts[0] : parts[1];
	return (
		(options.translatePlaceholder
			? translatePlaceholder(fallback)
			: fallback) || 'A definir'
	);
}

function teamFlagFromMatch(row, teamsById, side) {
	const id = row[`${side}_team_id`];
	const fifaCode = id ? teamsById.get(id)?.fifa_code : null;
	const countryCode = fifaCode ? FIFA_TO_ISO_COUNTRY_CODE[fifaCode] : null;

	return countryCode ? `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png` : null;
}

function normalizeTeamName(teamName) {
	return String(teamName || '')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

function buildTeamFlagsByName(teams) {
	const flags = new Map();

	for (const team of teams) {
		const countryCode = FIFA_TO_ISO_COUNTRY_CODE[team.fifa_code];
		if (!countryCode) continue;

		flags.set(
			normalizeTeamName(team.team_name),
			`https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`,
		);
	}

	return flags;
}

function matchKey(match) {
	return `${match.matchDate.toISOString()}|${match.homeTeam}|${match.awayTeam}`;
}

function legacyMatchKeyFromRow(row, legacyTeamsById) {
	const legacyMatch = {
		homeTeam: teamNameFromMatch(row, legacyTeamsById, 'home', {
			translatePlaceholder: false,
		}),
		awayTeam: teamNameFromMatch(row, legacyTeamsById, 'away', {
			translatePlaceholder: false,
		}),
		matchDate: parseKickoff(row.kickoff_at),
	};
	return matchKey(legacyMatch);
}

function translatePlaceholder(value) {
	const text = String(value || '').trim();
	const winner = text.match(/^W(\d+)$/i);
	if (winner) return `Vencedor Jogo ${winner[1]}`;

	const runnerUp = text.match(/^RU(\d+)$/i);
	if (runnerUp) return `Perdedor Jogo ${runnerUp[1]}`;

	return text
		.replace(/^Winner\s+(.+)$/i, 'Vencedor $1')
		.replace(/^Runner-up\s+(.+)$/i, 'Segundo colocado $1');
}

async function main() {
	const legacyTeams = readCsv('teams.csv');
	const teams = readCsv(TEAMS_PT_BR_FILE);
	const stages = readCsv('tournament_stages.csv');
	const matches = readCsv('matches.csv');

	const legacyTeamsById = new Map(legacyTeams.map((team) => [team.id, team]));
	const teamsById = new Map(teams.map((team) => [team.id, team]));
	const stagesById = new Map(stages.map((stage) => [stage.id, stage]));

	const payload = [];

	for (const row of matches) {
		const stage = stagesById.get(row.stage_id);
		payload.push({
			homeTeam: teamNameFromMatch(row, teamsById, 'home'),
			awayTeam: teamNameFromMatch(row, teamsById, 'away'),
			homeFlag: teamFlagFromMatch(row, teamsById, 'home'),
			awayFlag: teamFlagFromMatch(row, teamsById, 'away'),
			matchDate: parseKickoff(row.kickoff_at),
			stage: stageLabel(stage?.stage_name, row.match_label),
			status: 'UPCOMING',
			legacyKey: legacyMatchKeyFromRow(row, legacyTeamsById),
		});
	}

	const existing = await prisma.match.findMany({
		where: {
			OR: payload.flatMap((match) => [
				{
					matchDate: match.matchDate,
					homeTeam: match.homeTeam,
					awayTeam: match.awayTeam,
				},
				{
					matchDate: match.matchDate,
					homeTeam: match.legacyKey.split('|')[1],
					awayTeam: match.legacyKey.split('|')[2],
				},
			]),
		},
		select: {
			id: true,
			homeTeam: true,
			awayTeam: true,
			homeFlag: true,
			awayFlag: true,
			matchDate: true,
			stage: true,
		},
	});

	const existingKeys = new Set(existing.map(matchKey));
	const existingByKey = new Map(
		existing.map((match) => [matchKey(match), match]),
	);
	const existingByLegacyKey = new Map(
		existing.map((match) => [matchKey(match), match]),
	);
	const missing = payload.filter(
		(match) =>
			!existingKeys.has(matchKey(match)) &&
			!existingByLegacyKey.has(match.legacyKey),
	);
	const updates = payload
		.map((match) => ({
			match,
			existing:
				existingByKey.get(matchKey(match)) ||
				existingByLegacyKey.get(match.legacyKey),
		}))
		.filter(({ existing }) => existing);

	if (missing.length) {
		await prisma.match.createMany({
			data: missing.map(({ legacyKey, ...match }) => match),
		});
	}

	let updated = 0;
	for (const { match, existing: current } of updates) {
		const data = {
			homeTeam: match.homeTeam,
			awayTeam: match.awayTeam,
			stage: match.stage,
			homeFlag: match.homeFlag,
			awayFlag: match.awayFlag,
		};

		if (
			current.homeTeam === data.homeTeam &&
			current.awayTeam === data.awayTeam &&
			current.stage === data.stage &&
			current.homeFlag === data.homeFlag &&
			current.awayFlag === data.awayFlag
		) {
			continue;
		}

		await prisma.match.update({
			where: { id: current.id },
			data,
		});
		updated += 1;
	}

	const teamFlagsByName = buildTeamFlagsByName(teams);
	const allMatches = await prisma.match.findMany({
		select: {
			id: true,
			homeTeam: true,
			awayTeam: true,
			homeFlag: true,
			awayFlag: true,
		},
	});
	let flagsBackfilled = 0;

	for (const match of allMatches) {
		const homeFlag =
			match.homeFlag || teamFlagsByName.get(normalizeTeamName(match.homeTeam));
		const awayFlag =
			match.awayFlag || teamFlagsByName.get(normalizeTeamName(match.awayTeam));

		if (homeFlag === match.homeFlag && awayFlag === match.awayFlag) {
			continue;
		}

		await prisma.match.update({
			where: { id: match.id },
			data: { homeFlag, awayFlag },
		});
		flagsBackfilled += 1;
	}

	console.log(
		`Importação concluída: ${missing.length} criado(s), ${updated} atualizado(s), ${existing.length} já existia(m), ${matches.length} jogo(s) no dataset.`,
	);
	console.log(`Flags recarregadas: ${flagsBackfilled}.`);
}

main()
	.catch((err) => {
		console.error('Erro ao importar jogos da Copa:', err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
