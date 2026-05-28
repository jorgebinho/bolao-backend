const express = require('express')
const prisma = require('../lib/prisma')
const { authenticate } = require('../middleware/auth')

export const router = express.Router()

async function getChampionState() {
  const [configs, firstMatch] = await Promise.all([
    prisma.appConfig.findMany({
      where: { key: { in: ['champion_deadline', 'champion_result'] } },
    }),
    prisma.match.findFirst({
      orderBy: { matchDate: 'asc' },
      select: { matchDate: true },
    }),
  ])
  const map = Object.fromEntries(configs.map((config) => [config.key, config.value]))
  const deadline =
    map.champion_deadline ||
    process.env.CHAMPION_GUESS_DEADLINE ||
    firstMatch?.matchDate?.toISOString()

  return {
    deadline,
    isOpen: Boolean(deadline) && new Date() < new Date(deadline) && !map.champion_result,
    officialChampion: map.champion_result || null,
  }
}

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const [state, guess] = await Promise.all([
      getChampionState(),
      prisma.championGuess.findUnique({ where: { userId: req.user.id } }),
    ])

    return res.json({ ...state, guess })
  } catch (err) {
    console.error('Erro ao buscar palpite campeao:', err)
    return res.status(500).json({ error: 'Erro ao buscar palpite campeao.' })
  }
})

async function saveGuess(req, res) {
  const team = String(req.body.team || '').trim()
  if (!team) return res.status(400).json({ error: 'Selecao campea e obrigatoria.' })

  try {
    const state = await getChampionState()
    if (!state.isOpen) {
      return res.status(400).json({ error: 'Palpite de campeao ja esta fechado.' })
    }

    const guess = await prisma.championGuess.upsert({
      where: { userId: req.user.id },
      update: { team, points: 0, isCorrect: false },
      create: { userId: req.user.id, team },
    })

    return res.json({ guess, ...state })
  } catch (err) {
    console.error('Erro ao salvar palpite campeao:', err)
    return res.status(500).json({ error: 'Erro ao salvar palpite campeao.' })
  }
}

router.post('/', saveGuess)
router.put('/', saveGuess);

