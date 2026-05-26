// src/routes/matches.js
const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Retorna se um jogo está bloqueado para apostas (15 min antes)
function isMatchLocked(matchDate) {
  const now = new Date();
  const lockTime = new Date(matchDate.getTime() - 15 * 60 * 1000); // 15 min antes
  return now >= lockTime;
}

// GET /matches — Lista todos os jogos
// - Se autenticado: inclui o palpite do próprio usuário
// - Palpites de outros usuários só são visíveis se o jogo estiver LOCKED ou FINISHED
router.get('/', authenticate, async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { matchDate: 'asc' },
      include: {
        guesses: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Processar cada jogo: atualizar status de UPCOMING para LOCKED automaticamente
    const processedMatches = await Promise.all(
      matches.map(async (match) => {
        let currentStatus = match.status;

        // Auto-lock: Se ainda está UPCOMING mas deveria estar LOCKED
        if (match.status === 'UPCOMING' && isMatchLocked(match.matchDate)) {
          currentStatus = 'LOCKED';
          await prisma.match.update({
            where: { id: match.id },
            data: { status: 'LOCKED' },
          });
        }

        // Encontrar o palpite do usuário logado
        const myGuess = match.guesses.find((g) => g.userId === req.user.id) || null;

        // Palpites visíveis: só mostrar os de outros se LOCKED ou FINISHED
        let visibleGuesses = [];
        if (currentStatus === 'LOCKED' || currentStatus === 'FINISHED') {
          visibleGuesses = match.guesses.map((g) => ({
            id: g.id,
            userId: g.userId,
            userName: g.user.name,
            homeGuess: g.homeGuess,
            awayGuess: g.awayGuess,
            points: g.points,
          }));
        } else {
          // Jogo ainda aberto: só retorna o palpite do próprio usuário
          if (myGuess) {
            visibleGuesses = [
              {
                id: myGuess.id,
                userId: myGuess.userId,
                userName: req.user.name,
                homeGuess: myGuess.homeGuess,
                awayGuess: myGuess.awayGuess,
                points: myGuess.points,
              },
            ];
          }
        }

        return {
          id: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeFlag: match.homeFlag,
          awayFlag: match.awayFlag,
          matchDate: match.matchDate,
          stage: match.stage,
          status: currentStatus,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
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
      })
    );

    return res.json({ matches: processedMatches });
  } catch (err) {
    console.error('Erro ao listar jogos:', err);
    return res.status(500).json({ error: 'Erro ao buscar jogos.' });
  }
});

// POST /matches/:id/guess — Enviar ou atualizar palpite
router.post('/:id/guess', authenticate, async (req, res) => {
  const { id: matchId } = req.params;
  const { homeGuess, awayGuess } = req.body;

  if (homeGuess === undefined || awayGuess === undefined) {
    return res.status(400).json({ error: 'Os palpites de placar são obrigatórios.' });
  }

  if (!Number.isInteger(homeGuess) || !Number.isInteger(awayGuess) || homeGuess < 0 || awayGuess < 0) {
    return res.status(400).json({ error: 'Os palpites devem ser números inteiros não negativos.' });
  }

  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });

    if (!match) {
      return res.status(404).json({ error: 'Jogo não encontrado.' });
    }

    if (match.status === 'FINISHED') {
      return res.status(400).json({ error: 'Este jogo já foi finalizado. Palpites não são mais aceitos.' });
    }

    if (isMatchLocked(match.matchDate) || match.status === 'LOCKED') {
      return res.status(400).json({
        error: 'As apostas para este jogo já estão encerradas (menos de 15 minutos para o início).',
      });
    }

    // Upsert: cria ou atualiza o palpite
    const guess = await prisma.guess.upsert({
      where: {
        userId_matchId: { userId: req.user.id, matchId },
      },
      update: { homeGuess, awayGuess },
      create: { userId: req.user.id, matchId, homeGuess, awayGuess },
    });

    return res.json({ guess });
  } catch (err) {
    console.error('Erro ao salvar palpite:', err);
    return res.status(500).json({ error: 'Erro ao salvar palpite.' });
  }
});

module.exports = router;
