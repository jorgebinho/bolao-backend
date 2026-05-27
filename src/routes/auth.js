const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { ensureGlobalMembership } = require('../services/groups');

const router = express.Router();

function signToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha sao obrigatorios.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Este email ja esta cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, role: true, points: true },
    });

    await ensureGlobalMembership(prisma, user.id);

    return res.status(201).json({ user, token: signToken(user.id) });
  } catch (err) {
    console.error('Erro no registro:', err);
    return res.status(500).json({ error: 'Erro interno ao criar usuario.' });
  }
});

router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha sao obrigatorios.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Email ou senha incorretos.' });
    }

    await ensureGlobalMembership(prisma, user.id);

    const { password: _, ...userWithoutPassword } = user;
    return res.json({ user: userWithoutPassword, token: signToken(user.id) });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
