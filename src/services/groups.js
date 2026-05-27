const GLOBAL_GROUP_CODE = 'GLOBAL';

function makeGroupCode(name) {
  const base = String(name || 'grupo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 18) || 'GRUPO';

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffix}`;
}

async function ensureGlobalGroup(prisma) {
  return prisma.group.upsert({
    where: { code: GLOBAL_GROUP_CODE },
    update: {},
    create: {
      name: 'Bolao Global',
      description: 'Grupo padrao com todos os participantes.',
      code: GLOBAL_GROUP_CODE,
      isGlobal: true,
    },
  });
}

async function ensureGlobalMembership(prisma, userId) {
  const group = await ensureGlobalGroup(prisma);

  await prisma.groupMember.upsert({
    where: { userId_groupId: { userId, groupId: group.id } },
    update: {},
    create: { userId, groupId: group.id, role: 'MEMBER' },
  });

  return group;
}

async function ensureAllUsersInGlobalGroup(prisma) {
  const group = await ensureGlobalGroup(prisma);
  const users = await prisma.user.findMany({ select: { id: true } });

  await Promise.all(
    users.map((user) =>
      prisma.groupMember.upsert({
        where: { userId_groupId: { userId: user.id, groupId: group.id } },
        update: {},
        create: { userId: user.id, groupId: group.id, role: 'MEMBER' },
      })
    )
  );

  return group;
}

async function requireGroupMember(prisma, groupId, userId) {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    include: { group: true },
  });

  return member;
}

function serializeGroupMember(member) {
  return {
    id: member.group.id,
    name: member.group.name,
    description: member.group.description,
    code: member.group.code,
    isGlobal: member.group.isGlobal,
    role: member.role,
    membersCount: member.group._count?.members || 0,
  };
}

module.exports = {
  GLOBAL_GROUP_CODE,
  makeGroupCode,
  ensureGlobalGroup,
  ensureGlobalMembership,
  ensureAllUsersInGlobalGroup,
  requireGroupMember,
  serializeGroupMember,
};
