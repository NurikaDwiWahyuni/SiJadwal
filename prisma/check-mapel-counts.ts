import { prisma } from "../lib/prisma";

async function main() {
  const mapels = await prisma.mapel.findMany({
    select: {
      id: true,
      namaMapel: true,
      kodeMapel: true,
      _count: { select: { bebanMengajar: true, slotTerkunci: true } },
    },
  });
  console.table(
    mapels.map((m) => ({
      id: m.id,
      kode: m.kodeMapel,
      nama: m.namaMapel,
      bebanMengajar: m._count.bebanMengajar,
      slotTerkunci: m._count.slotTerkunci,
    }))
  );
}

main().catch(console.error).finally(() => process.exit(0));
