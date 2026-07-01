import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) { console.log("Tidak ada periode aktif"); return; }

  // 1. Cek mapel aktif
  const semuaMapel = await prisma.mapel.findMany({ select: { id: true, namaMapel: true, kodeMapel: true, aktif: true } });
  const mapelAktif = semuaMapel.filter(m => m.aktif);
  console.log(`Total mapel: ${semuaMapel.length}, mapel AKTIF: ${mapelAktif.length}`);
  if (mapelAktif.length === 0) {
    console.log("⚠️  TIDAK ADA mapel dengan aktif=true! Ini kemungkinan besar penyebab 0/0.");
  }

  // 2. Ambil semua beban + mapelId nya, cek apakah mapelId beban itu aktif
  const bebanList = await prisma.bebanMengajar.findMany({
    where: { periodeAkademikId: periode.id },
    select: { id: true, mapelId: true, kelasId: true, jp: true, mapel: { select: { namaMapel: true, aktif: true } } },
  });
  console.log(`Total beban: ${bebanList.length}`);

  const bebanMapelTidakAktif = bebanList.filter(b => !b.mapel.aktif);
  console.log(`Beban yang mapel-nya TIDAK aktif: ${bebanMapelTidakAktif.length}`);
  if (bebanMapelTidakAktif.length > 0) {
    console.log("Contoh:", bebanMapelTidakAktif.slice(0, 5).map(b => b.mapel.namaMapel));
  }

  // 3. Simulasikan persis logika getEfektifMapelIdsBatch + filter di loadSharedContext
  const kelasIds = [...new Set(bebanList.map(b => b.kelasId))];
  const configs = await prisma.kelasMapelConfig.findMany({ where: { kelasId: { in: kelasIds } } });
  const semuaAktifIds = mapelAktif.map(m => m.id);
  const configMap = new Map(configs.map(c => [c.kelasId, c]));

  function hitungEfektif(semuaAktifIds: string[], config: { mode: string; mapelIds: unknown } | null): string[] {
    if (!config || config.mode === "ALL") return semuaAktifIds;
    const daftar = (config.mapelIds as string[] | null) ?? [];
    if (config.mode === "CUSTOM") {
      const daftarSet = new Set(daftar);
      return semuaAktifIds.filter((id) => daftarSet.has(id));
    }
    const excludeSet = new Set(daftar);
    return semuaAktifIds.filter((id) => !excludeSet.has(id));
  }

  const efektifMap = new Map<string, Set<string>>();
  for (const kelasId of kelasIds) {
    const config = configMap.get(kelasId) ?? null;
    efektifMap.set(kelasId, new Set(hitungEfektif(semuaAktifIds, config)));
  }

  const filteredBeban = bebanList.filter(b => {
    const e = efektifMap.get(b.kelasId);
    return !e || e.has(b.mapelId);
  });
  console.log(`filteredBeban (yang lolos getEfektifMapelIdsBatch): ${filteredBeban.length} dari ${bebanList.length}`);

  if (filteredBeban.length === 0 && bebanList.length > 0) {
    console.log("⚠️  SEMUA beban tersaring habis oleh filter mapel efektif. Ini PENYEBAB 0/0.");
  }

  // 4. Cek feasibility (kapasitas slot vs kebutuhan JP) — pakai bebanList MENTAH (sebelum filter)
  const slotPelajaran = await prisma.slotWaktu.count({ where: { jenisSlot: "PELAJARAN" } });
  const jumlahKelas = kelasIds.length;
  const totalKapasitas = slotPelajaran * Math.max(1, jumlahKelas);
  const totalKebutuhanJP = bebanList.reduce((s, b) => s + b.jp, 0);
  console.log(`\nFeasibility: kebutuhan JP total = ${totalKebutuhanJP}, kapasitas = ${slotPelajaran} slot x ${jumlahKelas} kelas = ${totalKapasitas}`);
  console.log(totalKebutuhanJP <= totalKapasitas ? "✅ Feasible (PHASE 0 lolos)" : "⚠️  TIDAK feasible — PHASE 0 akan menolak semua (tapi ini biasanya menampilkan pesan gagal, bukan 0/0 sukses)");

  // 5. Cek slotWaktu per hari — barangkali semua di satu hari/kosong di hari lain
  const slotByHari = await prisma.slotWaktu.groupBy({
    by: ["hari"],
    where: { jenisSlot: "PELAJARAN" },
    _count: { id: true },
  });
  console.log("\nSlot PELAJARAN per hari:");
  for (const s of slotByHari) console.log(`  ${s.hari}: ${s._count.id}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
