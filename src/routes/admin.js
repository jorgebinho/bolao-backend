// src/routes/admin.js
const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Aplica autenticação + verificação de ADMIN em todas as rotas deste router
router.use(authenticate, requireAdmin);

// ─────────────────────────────────────────────
// JOGOS (MATCHES)
// ─────────────────────────────────────────────

// POST /admin/matches — Criar novo jogo
router.post('/matches', async (req, res) => {
  const { homeTeam, awayTeam, homeFlag, awayFlag, matchDate, stage } = req.body;

  if (!homeTeam || !awayTeam || !matchDate) {
    return res.status(400).json({ error: 'Times e data do jogo são obrigatórios.' });
  }

  try {
    const match = await prisma.match.create({
      data: {
        homeTeam,
        awayTeam,
        homeFlag: homeFlag || null,
        awayFlag: awayFlag || null,
        matchDate: new Date(matchDate),
        stage: stage || null,
      },
    });

    return res.status(201).json({ match });
  } catch (err) {
    console.error('Erro ao criar jogo:', err);
    return res.status(500).json({ error: 'Erro ao criar jogo.' });
  }
});

// PUT /admin/matches/:id — Editar jogo existente (apenas UPCOMING/LOCKED)
router.put('/matches/:id', async (req, res) => {
  const { id } = req.params;
  const { homeTeam, awayTeam, homeFlag, awayFlag, matchDate, stage } = req.body;

  try {
    const match = await prisma.match.findUnique({ where: { id } });

    if (!match) {
      return res.status(404).json({ error: 'Jogo não encontrado.' });
    }

    if (match.status === 'FINISHED') {
      return res.status(400).json({ error: 'Não é possível editar um jogo já finalizado.' });
    }

    const updated = await prisma.match.update({
      where: { id },
      data: {
        homeTeam: homeTeam ?? match.homeTeam,
        awayTeam: awayTeam ?? match.awayTeam,
        homeFlag: homeFlag !== undefined ? homeFlag : match.homeFlag,
        awayFlag: awayFlag !== undefined ? awayFlag : match.awayFlag,
        matchDate: matchDate ? new Date(matchDate) : match.matchDate,
        stage: stage !== undefined ? stage : match.stage,
      },
    });

    return res.json({ match: updated });
  } catch (err) {
    console.error('Erro ao editar jogo:', err);
    return res.status(500).json({ error: 'Erro ao editar jogo.' });
  }
});

// DELETE /admin/matches/:id — Remover jogo (só se UPCOMING)
router.delete('/matches/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const match = await prisma.match.findUnique({ where: { id } });

    if (!match) {
      return res.status(404).json({ error: 'Jogo não encontrado.' });
    }

    if (match.status !== 'UPCOMING') {
      return res.status(400).json({ error: 'Só é possível deletar jogos que ainda não foram bloqueados.' });
    }

    await prisma.match.delete({ where: { id } });
    return res.json({ message: 'Jogo removido com sucesso.' });
  } catch (err) {
    console.error('Erro ao deletar jogo:', err);
    return res.status(500).json({ error: 'Erro ao deletar jogo.' });
  }
});

// ─────────────────────────────────────────────
// PONTUAÇÃO (SCORE MATCH)
// ─────────────────────────────────────────────

/**
 * Calcula pontos para um palpite com base no resultado real.
 * 2 pts = acerto do placar exato
 * 1 pt  = acertou o vencedor (ou o empate), mas errou o placar
 * 0 pt  = errou tudo
 */
function calculatePoints(homeGuess, awayGuess, homeScore, awayScore) {
  // Acerto exato do placar
  if (homeGuess === homeScore && awayGuess === awayScore) {
    return 2;
  }

  const guessResult = Math.sign(homeGuess - awayGuess); // -1, 0, ou 1
  const realResult = Math.sign(homeScore - awayScore);  // -1, 0, ou 1

  // Acertou o vencedor ou o empate
  if (guessResult === realResult) {
    return 1;
  }

  return 0;
}

// POST /admin/score-match — Inserir resultado e calcular pontuações
router.post('/score-match', async (req, res) => {
  const { matchId, homeScore, awayScore } = req.body;

  if (!matchId || homeScore === undefined || awayScore === undefined) {
    return res.status(400).json({ error: 'matchId, homeScore e awayScore são obrigatórios.' });
  }

  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
    return res.status(400).json({ error: 'Placar deve ser número inteiro não negativo.' });
  }

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { guesses: true },
    });

    if (!match) {
      return res.status(404).json({ error: 'Jogo não encontrado.' });
    }

    if (match.status === 'FINISHED') {
      return res.status(400).json({ error: 'Este jogo já foi pontuado.' });
    }

    // Calcular pontos para cada palpite dentro de uma transação atômica
    const updates = match.guesses.map((guess) => {
      const points = calculatePoints(guess.homeGuess, guess.awayGuess, homeScore, awayScore);
      return { guessId: guess.id, userId: guess.userId, points };
    });

    // Executar tudo em uma transação: atualiza guesses + pontos dos usuários + status do jogo
    await prisma.$transaction(async (tx) => {
      // 1. Atualizar pontos de cada palpite
      for (const { guessId, points } of updates) {
        await tx.guess.update({
          where: { id: guessId },
          data: { points },
        });
      }

      // 2. Somar pontos no total de cada usuário
      for (const { userId, points } of updates) {
        if (points > 0) {
          await tx.user.update({
            where: { id: userId },
            data: { points: { increment: points } },
          });
        }
      }

      // 3. Marcar o jogo como FINISHED e salvar o resultado real
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: 'FINISHED',
          homeScore,
          awayScore,
        },
      });
    });

    // Buscar jogo atualizado para retornar
    const updatedMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        guesses: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    return res.json({
      message: `Jogo pontuado com sucesso! ${updates.length} palpite(s) processado(s).`,
      match: updatedMatch,
      summary: updates,
    });
  } catch (err) {
    console.error('Erro ao pontuar jogo:', err);
    return res.status(500).json({ error: 'Erro ao processar pontuação.' });
  }
});

// ─────────────────────────────────────────────
// USUÁRIOS (ADMIN)
// ─────────────────────────────────────────────

// GET /admin/users — Listar todos os usuários
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        points: true,
        createdAt: true,
        _count: { select: { guesses: true } },
      },
      orderBy: { points: 'desc' },
    });

    return res.json({ users });
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    return res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

// DELETE /admin/users/:id — Remover usuário do bolão
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode remover a si mesmo.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ message: `Usuário "${user.name}" removido com sucesso.` });
  } catch (err) {
    console.error('Erro ao remover usuário:', err);
    return res.status(500).json({ error: 'Erro ao remover usuário.' });
  }
});

// PATCH /admin/users/:id/promote — Promover usuário para ADMIN
router.patch('/users/:id/promote', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({ error: 'Este usuário já é administrador.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true },
    });

    return res.json({ user: updated, message: `${updated.name} agora é ADMIN.` });
  } catch (err) {
    console.error('Erro ao promover usuário:', err);
    return res.status(500).json({ error: 'Erro ao promover usuário.' });
  }
});

// PATCH /admin/users/:id/demote — Rebaixar ADMIN para USER
router.patch('/users/:id/demote', async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode rebaixar a si mesmo.' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { role: 'USER' },
      select: { id: true, name: true, email: true, role: true },
    });

    return res.json({ user: updated });
  } catch (err) {
    console.error('Erro ao rebaixar usuário:', err);
    return res.status(500).json({ error: 'Erro ao rebaixar usuário.' });
  }
});

module.exports = router;
