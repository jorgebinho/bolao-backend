require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { calculateMatchPoints } = require('../src/services/scoring');

const prisma = new PrismaClient();

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
        const points = calculateMatchPoints(
          guess.homeGuess,
          guess.awayGuess,
          match.homeScore,
          match.awayScore
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

  console.log(`Pontuacao recalculada para ${finishedMatches.length} jogo(s) finalizado(s).`);
}

main()
  .catch((err) => {
    console.error('Erro ao recalcular pontuação:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
