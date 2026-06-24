import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client.ts';
import {
	calculateMatchPoints,
	isKnockoutStage,
} from '../src/shared/scoring/scoring.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
	const finishedMatches = await prisma.match.findMany({
		where: { status: 'FINISHED' },
		include: { guesses: true },
	});

	await prisma.$transaction(async (tx) => {
		await tx.user.updateMany({ data: { points: 0 } });

		for (const match of finishedMatches) {
			if (match.homeScore === null || match.awayScore === null) continue;

			for (const guess of match.guesses) {
				const matchAdvancingTeam =
					match.advancingTeam ||
					resolveWinnerTeam(
						match.stage,
						match.homeTeam,
						match.awayTeam,
						match.homeScore,
						match.awayScore,
					);
				const guessAdvancingTeam =
					guess.advancingTeam ||
					resolveWinnerTeam(
						match.stage,
						match.homeTeam,
						match.awayTeam,
						guess.homeGuess,
						guess.awayGuess,
					);
				const points = calculateMatchPoints(
					guess.homeGuess,
					guess.awayGuess,
					match.homeScore,
					match.awayScore,
					{
						stage: match.stage,
						guessAdvancingTeam,
						matchAdvancingTeam,
					},
				);

				await tx.guess.update({
					where: { id: guess.id },
					data: { points },
				});

				if (points > 0) {
					await tx.user.update({
						where: { id: guess.userId },
						data: { points: { increment: points } },
					});
				}
			}
		}
	});

	console.log(
		`Pontuação recalculada para ${finishedMatches.length} jogo(s) finalizado(s).`,
	);
}

function resolveWinnerTeam(stage, homeTeam, awayTeam, homeScore, awayScore) {
	if (!isKnockoutStage(stage) || homeScore === awayScore) return null;
	return homeScore > awayScore ? homeTeam : awayTeam;
}

main()
	.catch((err) => {
		console.error('Erro ao recalcular pontuação:', err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
