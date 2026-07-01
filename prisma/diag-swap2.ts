import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Cari swap 2-langkah: MO punya 16 slot kosong lain (selain JUMAT#4).
// Untuk tiap slot X itu, cek siapa yang ngisi VIII-4 di X. Kalau guru itu (G2)
// kebetulan KOSONG di JUMAT#4, kita bisa tukar:
//   - pindahin sesi G2 dari (VIII-4, X) ke (VIII-4, JUMAT#4)
//   - pindahin sesi MO (PJOK VIII-4 yang nyangkut) ke (VIII-4, X)
// Tanpa perlu ganggu kelas ke-3 sama sekali.

async function main() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) return;

  const kelas = await prisma.kelas.findFirst({ where: { namaKelas: { contains: "VIII-4" } } });
  const guruMO = await prisma.guru.findFirst({ where: { nama: { contains: "Mangalandong" } } });
  if (!kelas || !guruMO) { console.log("data tidak ketemu"); return; }

  const slotPelajaran = await prisma.slotWaktu.findMany({ where: { jenisSlot: "PELAJARAN" }, orderBy: [{ hari: "asc" }, { urutan: "asc" }] });
  const jadwalMO = await prisma.jadwal.findMany({ where: { periodeAkademikId: periode.id, guruId: guruMO.id }, include: { slotWaktu: true } });
  const occMO = new Set(jadwalMO.map(j => `${j.hari}::${j.slotWaktuId}`));

  const jumat4 = slotPelajaran.find(s => s.hari === "JUMAT" && s.urutan === 4)!;
  const kMO_freeSlots = slotPelajaran.filter(s => !occMO.has(`${s.hari}::${s.id}`) && !(s.hari === "JUMAT" && s.urutan === 4));

  console.log(`MO punya ${kMO_freeSlots.length} slot kosong lain (selain JUMAT#4). Mengecek satu-satu...\n`);

  let found = false;
  for (const X of kMO_freeSlots) {
    // Siapa yang ngisi VIII-4 di slot X?
    const jadwalVIII4diX = await prisma.jadwal.findFirst({
      where: { periodeAkademikId: periode.id, kelasId: kelas.id, hari: X.hari, slotWaktuId: X.id },
      include: { guru: true, bebanMengajar: { include: { mapel: true } } },
    });
    if (!jadwalVIII4diX) { console.log(`  ${X.hari}#${X.urutan}: VIII-4 kosong juga di sini?! (aneh, cek manual)`); continue; }
    if (jadwalVIII4diX.isLocked) continue;

    const G2 = jadwalVIII4diX.guru;
    // Apakah G2 kosong di JUMAT#4?
    const g2SibukDiJumat4 = await prisma.jadwal.findFirst({
      where: { periodeAkademikId: periode.id, guruId: G2.id, hari: "JUMAT", slotWaktuId: jumat4.id },
    });

    const status = g2SibukDiJumat4 ? "❌ G2 juga sibuk di Jumat#4" : "✅ G2 KOSONG di Jumat#4 — SWAP BISA!";
    console.log(`  ${X.hari}#${X.urutan}: VIII-4 diisi ${jadwalVIII4diX.bebanMengajar.mapel.kodeMapel} oleh guru ${G2.nama} (${G2.kodeGuru}) — ${status}`);

    if (!g2SibukDiJumat4) {
      found = true;
      console.log(`\n  🎯 SOLUSI DITEMUKAN:`);
      console.log(`     1. Pindah ${jadwalVIII4diX.bebanMengajar.mapel.kodeMapel} (guru ${G2.kodeGuru}) di VIII-4: dari ${X.hari}#${X.urutan} → JUMAT#4`);
      console.log(`     2. Taruh PJOK (guru MO) di VIII-4: JUMAT#4 → ${X.hari}#${X.urutan}`);
      console.log(`     jadwalId sesi yang dipindah (langkah 1): ${jadwalVIII4diX.id}`);
    }
  }
  if (!found) console.log("\n  Tidak ada swap 2-langkah yang langsung berhasil. Perlu rantai 3-langkah.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
