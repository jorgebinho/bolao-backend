import express from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { normalizeRankingUsers } from '../services/scoring'

const router = express.Router()

async function buildRanking(currentUserId, userIds = null) {
  const users = await prisma.user.findMany({
    where: userIds ? { id: { in: userIds } } : undefined,
    select: {
      id: true,
      name: true,
      points: true,
      _count: { select: { guesses: true } },
      guesses: { select: { points: true } },
      championGuess: { select: { team: true, points: true, isCorrect: true } },
    },
  })

  return normalizeRankingUsers(users, currentUserId)
}

router.get('/', authenticate, async (req, res) => {
  try {
    const ranking = await buildRanking(req.user.id)
    return res.json({
      ranking,
      tieBreakers: [
        'Pontos totais',
        'Mais placares exatos',
        'Mais acertos parciais',
      ],
    })
  } catch (err) {
    console.error('Erro ao buscar ranking:', err)
    return res.status(500).json({ error: 'Erro ao buscar ranking.' })
  }
})

module.exports = { router, buildRanking }
