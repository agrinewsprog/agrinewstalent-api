import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@agrinews.com';
  const plainPassword = 'admin123';

  // Idempotente: no duplicar si ya existe
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`⚠️  Super admin ya existe (id=${existing.id}, email=${existing.email}). Omitiendo.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`✅  Super admin creado:`);
  console.log(`    id    : ${admin.id}`);
  console.log(`    email : ${admin.email}`);
  console.log(`    role  : ${admin.role}`);
  console.log(`    status: ${admin.status}`);
}

main()
  .catch((e) => {
    console.error('❌  Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
