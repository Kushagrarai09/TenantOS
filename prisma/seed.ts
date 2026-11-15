import { PrismaClient, TenantRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const user = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: {
      email: "owner@example.com",
      name: "Demo Owner",
      passwordHash,
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-company" },
    update: {},
    create: {
      name: "Demo Company",
      slug: "demo-company",
    },
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { role: TenantRole.OWNER },
    create: { userId: user.id, tenantId: tenant.id, role: TenantRole.OWNER },
  });

  console.log("Seed complete. Demo account: owner@example.com / ChangeMe123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
