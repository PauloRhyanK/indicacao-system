import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2]?.trim().toLowerCase();

try {
  const adminRjRole = await prisma.role.findUnique({ where: { name: "Administrador RJ" } });
  if (!adminRjRole) {
    console.error("Papel Administrador RJ não encontrado. Rode o seed.");
    process.exit(1);
  }

  const adminKeys = ["rj.view", "rj.manage", "rj.settings"];
  await prisma.rolePermission.deleteMany({ where: { roleId: adminRjRole.id } });
  await prisma.rolePermission.createMany({
    data: adminKeys.map((permissionKey) => ({ roleId: adminRjRole.id, permissionKey })),
    skipDuplicates: true,
  });

  const user = email
    ? await prisma.user.findFirst({
        where: { email, deletedAt: null, accessScope: "CONFIDENCIAL" },
      })
    : await prisma.user.findFirst({
        where: { deletedAt: null, accessScope: "CONFIDENCIAL" },
        orderBy: { createdAt: "asc" },
      });

  if (!user) {
    console.error("Usuário confidencial não encontrado.");
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId: user.id } });
    await tx.userRole.create({
      data: { userId: user.id, roleId: adminRjRole.id },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { confidencialApprovedAt: new Date() },
    });
  });

  console.log(`OK: ${user.email} → Administrador RJ (aprovado, permissões sincronizadas)`);
  console.log("Faça logout e login novamente no confidencial para atualizar o menu.");
} finally {
  await prisma.$disconnect();
}
