// ── FILE: server/prisma/seed-admin.js ──
// Minimal, idempotent admin seeder. Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
// from env. Safe to run on every deploy: creates the user if missing, otherwise
// updates name/role and (optionally) resets the password when ADMIN_RESET_PASSWORD=true.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@ieltsplatform.com').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const name = process.env.ADMIN_NAME || 'Admin';
  const resetPassword = String(process.env.ADMIN_RESET_PASSWORD || 'false').toLowerCase() === 'true';

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { name, email, passwordHash, role: 'ADMIN', isActive: true }
    });
    console.log(`[seed-admin] Created admin: ${email}`);
    return;
  }

  const data = { name, role: 'ADMIN', isActive: true };
  if (resetPassword) {
    data.passwordHash = await bcrypt.hash(password, 12);
    console.log(`[seed-admin] Resetting password for: ${email}`);
  }
  await prisma.user.update({ where: { email }, data });
  console.log(`[seed-admin] Admin already exists, ensured role/active: ${email}`);
}

main()
  .catch(e => { console.error('[seed-admin] failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
