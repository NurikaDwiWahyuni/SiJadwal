import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  console.log("Periode aktif:", periode);
  if (!periode) return;

  const bebanCount = await prisma.bebanMengajar.count({ where: { periodeAkademikId: periode.id } });
  console.log("Jumlah BebanMengajar di periode aktif:", bebanCount);

  const slotWaktuCount = await prisma.slotWaktu.count({ where: { jenisSlot: "PELAJARAN" } });
  console.log("Jumlah SlotWaktu jenis PELAJARAN:", slotWaktuCount);

  const kelasList = await prisma.kelas.findMany({ select: { id: true, namaKelas: true } });
  console.log("Jumlah Kelas:", kelasList.length);

  const configs = await prisma.kelasMapelConfig.findMany();
  console.log("\nKelasMapelConfig (mode != ALL):");
  for (const c of configs) {
    console.log(`  kelasId=${c.kelasId} mode=${c.mode} mapelIds=${JSON.stringify(c.mapelIds)}`);
  }

  // Cek apakah ada mapelIds yang merujuk ke mapel yang sudah tidak ada
  const allMapelIds = new Set((await prisma.mapel.findMany({ select: { id: true } })).map(m => m.id));
  for (const c of configs) {
    const ids = (c.mapelIds as string[] | null) ?? [];
    const invalid = ids.filter(id => !allMapelIds.has(id));
    if (invalid.length > 0) {
      console.log(`  ⚠️  kelasId=${c.kelasId} punya mapelId tidak valid (sudah dihapus): ${invalid.join(", ")}`);
    }
  }

  const jadwalCount = await prisma.jadwal.count({ where: { periodeAkademikId: periode.id } });
  console.log("\nJumlah Jadwal existing di periode ini:", jadwalCount);

  // Sample beban per kelas
  const bebanPerKelas = await prisma.bebanMengajar.groupBy({
    by: ["kelasId"],
    where: { periodeAkademikId: periode.id },
    _count: { id: true },
  });
  console.log("\nBeban per kelas:");
  for (const b of bebanPerKelas) {
    const kelas = kelasList.find(k => k.id === b.kelasId);
    console.log(`  ${kelas?.namaKelas ?? b.kelasId}: ${b._count.id} beban`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
