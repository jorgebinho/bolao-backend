import express from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { isMatchLocked, serializeMatch } from '../services/matches.js'
import { getWorldCupTeams } from '../services/worldCupTeams.js'

export const router = express.Router()

async function fetchMatchesForUser(user) {
  const matches = await prisma.match.findMany({
    orderBy: { matchDate: 'asc' },
    include: {
      guesses: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  })

  const lockUpdates = matches
    .filter((match) => match.status === 'UPCOMING' && isMatchLocked(match.matchDate))
    .map((match) =>
      prisma.match.update({ where: { id: match.id }, data: { status: 'LOCKED' } })
    )

  if (lockUpdates.length) await prisma.$transaction(lockUpdates)

  return matches.map((match) => serializeMatch(match, user))
}

router.get('/', authenticate, async (req, res) => {
  try {
    const matches = await fetchMatchesForUser(req.user)
    return res.json({ matches })
  } catch (err) {
    console.error('Erro ao listar jogos:', err)
    return res.status(500).json({ error: 'Erro ao buscar jogos.' })
  }
})

router.get('/pending-alerts', authenticate, async (req, res) => {
  try {
    const matches = await fetchMatchesForUser(req.user)
    return res.json({
      alerts: matches.filter((match) => match.isUrgent && !match.myGuess),
    })
  } catch (err) {
    console.error('Erro ao buscar alertas:', err)
    return res.status(500).json({ error: 'Erro ao buscar alertas de jogos.' })
  }
})

router.get('/teams', authenticate, async (req, res) => {
  try {
    return res.json({ teams: getWorldCupTeams() })
  } catch (err) {
    console.error('Erro ao listar seleções:', err)
    return res.status(500).json({ error: 'Erro ao buscar seleções.' })
  }
})

router.post('/:id/guess', authenticate, async (req, res) => {
  const { id: matchId } = req.params
  const homeGuess = Number(req.body.homeGuess)
  const awayGuess = Number(req.body.awayGuess)

  if (!Number.isInteger(homeGuess) || !Number.isInteger(awayGuess) || homeGuess < 0 || awayGuess < 0) {
    return res.status(400).json({ error: 'Os palpites devem ser números inteiros não negativos.' })
  }

  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } })

    if (!match) {
      return res.status(404).json({ error: 'Jogo não encontrado.' })
    }

    if (match.status === 'FINISHED') {
      return res.status(400).json({ error: 'Este jogo já foi finalizado.' })
    }

    if (isMatchLocked(match.matchDate) || match.status === 'LOCKED') {
      return res.status(400).json({
        error: 'As apostas para este jogo já estão encerradas.',
      })
    }

    const guess = await prisma.guess.upsert({
      where: { userId_matchId: { userId: req.user.id, matchId } },
      update: { homeGuess, awayGuess },
      create: { userId: req.user.id, matchId, homeGuess, awayGuess },
    })

    return res.json({ guess })
  } catch (err) {
    console.error('Erro ao salvar palpite:', err)
    return res.status(500).json({ error: 'Erro ao salvar palpite.' })
  }
});

