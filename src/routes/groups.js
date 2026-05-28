const express = require('express')
const prisma = require('../lib/prisma')
const { authenticate } = require('../middleware/auth')
const {
  makeGroupCode,
  ensureAllUsersInGlobalGroup,
  ensureGlobalMembership,
  requireGroupMember,
  serializeGroupMember,
} = require('../services/groups')
const { buildRanking } = require('./ranking')

export const router = express.Router()

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    await ensureGlobalMembership(prisma, req.user.id)

    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.user.id },
      include: { group: { include: { _count: { select: { members: true } } } } },
      orderBy: [{ group: { isGlobal: 'desc' } }, { createdAt: 'asc' }],
    })

    return res.json({ groups: memberships.map(serializeGroupMember) })
  } catch (err) {
    console.error('Erro ao listar grupos:', err)
    return res.status(500).json({ error: 'Erro ao buscar grupos.' })
  }
})

router.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim()
  const description = String(req.body.description || '').trim() || null

  if (name.length < 3) {
    return res.status(400).json({ error: 'Nome do grupo deve ter pelo menos 3 caracteres.' })
  }

  try {
    let code = makeGroupCode(name)
    for (let tries = 0; tries < 5; tries += 1) {
      const exists = await prisma.group.findUnique({ where: { code } })
      if (!exists) break
      code = makeGroupCode(name)
    }

    const group = await prisma.group.create({
      data: {
        name,
        description,
        code,
        ownerId: req.user.id,
        members: { create: { userId: req.user.id, role: 'OWNER' } },
      },
      include: { _count: { select: { members: true } } },
    })

    return res.status(201).json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        code: group.code,
        isGlobal: group.isGlobal,
        role: 'OWNER',
        membersCount: group._count.members,
      },
    })
  } catch (err) {
    console.error('Erro ao criar grupo:', err)
    return res.status(500).json({ error: 'Erro ao criar grupo.' })
  }
})

router.post('/join', async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase()
  if (!code) return res.status(400).json({ error: 'Codigo do grupo e obrigatorio.' })

  try {
    if (code === 'GLOBAL') await ensureAllUsersInGlobalGroup(prisma)

    const group = await prisma.group.findUnique({ where: { code } })
    if (!group) return res.status(404).json({ error: 'Grupo nao encontrado.' })

    const member = await prisma.groupMember.upsert({
      where: { userId_groupId: { userId: req.user.id, groupId: group.id } },
      update: {},
      create: { userId: req.user.id, groupId: group.id, role: 'MEMBER' },
      include: { group: { include: { _count: { select: { members: true } } } } },
    })

    return res.json({ group: serializeGroupMember(member), message: 'Voce entrou no grupo.' })
  } catch (err) {
    console.error('Erro ao entrar no grupo:', err)
    return res.status(500).json({ error: 'Erro ao entrar no grupo.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const membership = await requireGroupMember(prisma, req.params.id, req.user.id)
    if (!membership) return res.status(403).json({ error: 'Voce nao participa deste grupo.' })

    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { members: true } } },
    })

    return res.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        code: group.code,
        isGlobal: group.isGlobal,
        role: membership.role,
        membersCount: group._count.members,
      },
    })
  } catch (err) {
    console.error('Erro ao buscar grupo:', err)
    return res.status(500).json({ error: 'Erro ao buscar grupo.' })
  }
})

router.get('/:id/ranking', async (req, res) => {
  try {
    const membership = await requireGroupMember(prisma, req.params.id, req.user.id)
    if (!membership) return res.status(403).json({ error: 'Voce nao participa deste grupo.' })

    const members = await prisma.groupMember.findMany({
      where: { groupId: req.params.id },
      select: { userId: true },
    })

    const ranking = await buildRanking(req.user.id, members.map((member) => member.userId))
    return res.json({ ranking })
  } catch (err) {
    console.error('Erro ao buscar ranking do grupo:', err)
    return res.status(500).json({ error: 'Erro ao buscar ranking do grupo.' })
  }
})

router.get('/:id/members', async (req, res) => {
  try {
    const membership = await requireGroupMember(prisma, req.params.id, req.user.id)
    if (!membership) return res.status(403).json({ error: 'Voce nao participa deste grupo.' })

    const members = await prisma.groupMember.findMany({
      where: { groupId: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            points: true,
            _count: { select: { guesses: true } },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })

    return res.json({
      canManage: membership.role === 'OWNER' || req.user.role === 'ADMIN',
      members: members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        appRole: member.user.role,
        groupRole: member.role,
        points: member.user.points,
        totalGuesses: member.user._count.guesses,
        joinedAt: member.createdAt,
      })),
    })
  } catch (err) {
    console.error('Erro ao listar membros:', err)
    return res.status(500).json({ error: 'Erro ao buscar membros.' })
  }
})

router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const membership = await requireGroupMember(prisma, req.params.id, req.user.id)
    if (!membership || (membership.role !== 'OWNER' && req.user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Voce nao pode gerenciar este grupo.' })
    }

    const target = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: req.params.userId, groupId: req.params.id } },
      include: { group: true },
    })

    if (!target) return res.status(404).json({ error: 'Membro nao encontrado.' })
    if (target.group.isGlobal) return res.status(400).json({ error: 'Nao e possivel remover do grupo global.' })
    if (target.role === 'OWNER') return res.status(400).json({ error: 'Nao e possivel remover o dono do grupo.' })

    await prisma.groupMember.delete({ where: { id: target.id } })
    return res.json({ message: 'Membro removido do grupo.' })
  } catch (err) {
    console.error('Erro ao remover membro:', err)
    return res.status(500).json({ error: 'Erro ao remover membro.' })
  }
})
