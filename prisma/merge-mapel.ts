import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// duplikat: [hapus, pertahankan]
const PAIRS: [string, string][] = [
  ["BIN", "BIND"],
  ["BIG", "BING"],
];

async function mergeMapel(removeKode: string, keepKode: string) {
  const removeMapel = await prisma.mapel.findUnique({ where: { kodeMapel: removeKode } });
  const keepMapel = await prisma.mapel.findUnique({ where: { kodeMapel: keepKode } });

  if (!removeMapel || !keepMapel) {
    console.log(`SKIP: ${removeKode} atau ${keepKode} tidak ditemukan`);
    return;
  }

  console.log(`\n=== Merge ${removeKode} (${removeMapel.id}) -> ${keepKode} (${keepMapel.id}) ===`);

  // 1. Pindahkan SlotTerkunci
  const slotUpdate = await prisma.slotTerkunci.updateMany({
    where: { mapelId: removeMapel.id },
    data: { mapelId: keepMapel.id },
  });
  console.log(`  SlotTerkunci dipindahkan: ${slotUpdate.count}`);

  // 2. Tangani BebanMengajar satu per satu (karena ada unique constraint guruId+kelasId+mapelId+periodeAkademikId)
  const bebanList = await prisma.bebanMengajar.findMany({ where: { mapelId: removeMapel.id } });
  let moved = 0;
  let mergedIntoExisting = 0;

  for (const beban of bebanList) {
    const existing = await prisma.bebanMengajar.findUnique({
      where: {
        guruId_kelasId_mapelId_periodeAkademikId: {
          guruId: beban.guruId,
          kelasId: beban.kelasId,
          mapelId: keepMapel.id,
          periodeAkademikId: beban.periodeAkademikId,
        },
      },
    });

    if (existing) {
      // Sudah ada BebanMengajar yang sama persis di mapel tujuan.
      // Pindahkan referensi Jadwal dari beban lama ke beban yang sudah ada, lalu hapus beban lama.
      await prisma.jadwal.updateMany({
        where: { bebanMengajarId: beban.id },
        data: { bebanMengajarId: existing.id },
      });
      await prisma.bebanMengajar.delete({ where: { id: beban.id } });
      mergedIntoExisting++;
    } else {
      // Tidak ada konflik, cukup ubah mapelId-nya.
      await prisma.bebanMengajar.update({
        where: { id: beban.id },
        data: { mapelId: keepMapel.id },
      });
      moved++;
    }
  }
  console.log(`  BebanMengajar dipindahkan langsung: ${moved}`);
  console.log(`  BebanMengajar digabung ke baris existing (duplikat dihapus): ${mergedIntoExisting}`);

  // 3. Pastikan tidak ada sisa referensi ke mapel lama
  const [bebanLeft, slotLeft] = await Promise.all([
    prisma.bebanMengajar.count({ where: { mapelId: removeMapel.id } }),
    prisma.slotTerkunci.count({ where: { mapelId: removeMapel.id } }),
  ]);
  console.log(`  Sisa referensi -> beban: ${bebanLeft}, slot: ${slotLeft}`);

  if (bebanLeft > 0 || slotLeft > 0) {
    console.log(`  GAGAL hapus ${removeKode}, masih ada referensi tersisa.`);
    return;
  }

  await prisma.mapel.delete({ where: { id: removeMapel.id } });
  console.log(`  Mapel ${removeKode} berhasil dihapus.`);
}

async function main() {
  for (const [removeKode, keepKode] of PAIRS) {
    await mergeMapel(removeKode, keepKode);
  }

  console.log("\n=== Hasil akhir ===");
  const all = await prisma.mapel.findMany({
    select: { kodeMapel: true, namaMapel: true },
    orderBy: { kodeMapel: "asc" },
  });
  console.table(all);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
