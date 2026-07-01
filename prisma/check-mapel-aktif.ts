import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const mapel = await prisma.mapel.findMany({
    select: { kodeMapel: true, namaMapel: true, aktif: true },
    orderBy: { kodeMapel: "asc" },
  });
  console.table(mapel);
  const aktifCount = mapel.filter(m => m.aktif).length;
  console.log(`Mapel aktif: ${aktifCount} / ${mapel.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
