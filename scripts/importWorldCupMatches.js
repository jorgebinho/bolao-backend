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
			homeFlag: null,
			awayFlag: null,
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
			homeFlag: null,
			awayFlag: null,
		};

		if (
			current.homeTeam === data.homeTeam &&
			current.awayTeam === data.awayTeam &&
			current.stage === data.stage
		) {
			continue;
		}

		await prisma.match.update({
			where: { id: current.id },
			data,
		});
		updated += 1;
	}

	console.log(
		`Importação concluída: ${missing.length} criado(s), ${updated} atualizado(s), ${existing.length} já existia(m), ${matches.length} jogo(s) no dataset.`,
	);
}

main()
	.catch((err) => {
		console.error('Erro ao importar jogos da Copa:', err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
