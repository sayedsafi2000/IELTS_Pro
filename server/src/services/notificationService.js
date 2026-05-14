async function notify(prisma, { userId, type = 'GENERIC', title, message, link, meta }) {
  if (!userId || !title || !message) {
    throw new Error('notify() requires userId, title, message');
  }
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link: link || null,
      meta: meta || undefined,
    }
  });
}

async function notifyAdmins(prisma, payload) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true }
  });
  return Promise.all(admins.map(a => notify(prisma, { ...payload, userId: a.id })));
}

module.exports = { notify, notifyAdmins };
