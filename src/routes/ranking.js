import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

export const router = express.Router();

// GET /ranking — Ranking geral ordenado por pontos
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        points: true,
        _count: { select: { guesses: true } },
        guesses: {
          select: { points: true },
        },
      },
      orderBy: [
        { points: 'desc' },
        { name: 'asc' }, // Desempate por nome
      ],
    });

    const ranking = users.map((user, index) => ({
      position: index + 1,
      id: user.id,
      name: user.name,
      totalPoints: user.points,
      totalGuesses: user._count.guesses,
      exactScores: user.guesses.filter((g) => g.points === 2).length,
      partialScores: user.guesses.filter((g) => g.points === 1).length,
      isCurrentUser: user.id === req.user.id,
    }));

    return res.json({ ranking });
  } catch (err) {
    console.error('Erro ao buscar ranking:', err);
    return res.status(500).json({ error: 'Erro ao buscar ranking.' });
  }
});
