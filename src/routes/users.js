const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { buildRanking } = require('./ranking');

export const router = express.Router();

router.use(authenticate);

async function getGroupPosition(userId, groupId) {
  if (!groupId) return null;
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });
  const ranking = await buildRanking(userId, members.map((member) => member.userId));
  return ranking.find((entry) => entry.id === userId)?.position || null;
}

router.get('/me/profile', async (req, res) => {
  try {
    const [user, ranking, recentGuesses] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          points: true,
          championGuess: { select: { team: true, points: true, isCorrect: true } },
          _count: { select: { guesses: true, groupMemberships: true } },
          guesses: { select: { points: true } },
        },
      }),
      buildRanking(req.user.id),
      prisma.guess.findMany({
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        include: {
          match: {
            select: {
              id: true,
              homeTeam: true,
              awayTeam: true,
              homeScore: true,
              awayScore: true,
              matchDate: true,
              stage: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const rankEntry = ranking.find((entry) => entry.id === req.user.id);
    const groupPosition = await getGroupPosition(req.user.id, req.query.groupId);

    return res.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        totalPoints: rankEntry?.totalPoints || user.points,
        matchPoints: user.points,
        championPoints: user.championGuess?.points || 0,
        totalGuesses: user._count.guesses,
        exactScores: user.guesses.filter((guess) => guess.points === 3).length,
        partialScores: user.guesses.filter((guess) => guess.points === 1).length,
        errors: user.guesses.filter((guess) => guess.points === 0).length,
        hitRate: user._count.guesses
          ? Math.round(((user.guesses.filter((guess) => guess.points > 0).length / user._count.guesses) * 100))
          : 0,
        generalPosition: rankEntry?.position || null,
        groupPosition,
        championGuess: user.championGuess,
        recentGuesses: recentGuesses.map((guess) => ({
          id: guess.id,
          homeGuess: guess.homeGuess,
          awayGuess: guess.awayGuess,
          points: guess.points,
          updatedAt: guess.updatedAt,
          match: guess.match,
        })),
      },
    });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

router.patch('/me', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres.' });

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
      select: { id: true, name: true, email: true, role: true, points: true },
    });
    return res.json({ user });
  } catch (err) {
    console.error('Erro ao atualizar usuario:', err);
    return res.status(500).json({ error: 'Erro ao atualizar usuario.' });
  }
});

router.patch('/me/password', async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (!currentPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Senha atual e nova senha com 6+ caracteres sao obrigatorias.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });

    return res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    return res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});
