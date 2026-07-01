import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Cari apa yang "menjaga" slot tertentu di jadwal guru, lalu cari kandidat swap
// yang bisa membebaskan slot itu tanpa bikin sesi lain jadi gagal.

const CHECKS: { guruNamaContains: string; hari: string; label: string }[] = [
  { guruNamaContains: "Mangalandong", hari: "JUMAT", label: "PJOK VIII-4" },
  { guruNamaContains: "Rika Juwita",  hari: "JUMAT", label: "BMR VII-2" },
];
const TARGET_URUTAN = 4; // JUMAT#4

async function main() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) { console.log("Tidak ada periode aktif"); return; }

  for (const check of CHECKS) {
    console.log(`\n${"=".repeat(70)}\n${check.label} — guru~"${check.guruNamaContains}"\n${"=".repeat(70)}`);
    const guru = await prisma.guru.findFirst({ where: { nama: { contains: check.guruNamaContains } } });
    if (!guru) { console.log("  guru tidak ditemukan"); continue; }

    const slot = await prisma.slotWaktu.findFirst({ where: { hari: check.hari as never, urutan: TARGET_URUTAN, jenisSlot: "PELAJARAN" } });
    if (!slot) { console.log(`  slot ${check.hari}#${TARGET_URUTAN} tidak ditemukan`); continue; }

    // Apa yang mengisi guru ini di JUMAT#4?
    const jadwalDiSlot = await prisma.jadwal.findFirst({
      where: { periodeAkademikId: periode.id, guruId: guru.id, hari: check.hari as never, slotWaktuId: slot.id },
      include: { kelas: true, bebanMengajar: { include: { mapel: true } } },
    });

    if (!jadwalDiSlot) {
      console.log(`  ✅ Guru ${guru.nama} SUDAH kosong di ${check.hari}#${TARGET_URUTAN} — cek ulang, mungkin sudah tidak bentrok.`);
      continue;
    }

    console.log(`  Guru ${guru.nama} SEDANG mengajar di ${check.hari}#${TARGET_URUTAN}:`);
    console.log(`    Kelas: ${jadwalDiSlot.kelas.namaKelas}  Mapel: ${jadwalDiSlot.bebanMengajar.mapel.kodeMapel}  isLocked: ${jadwalDiSlot.isLocked}`);

    if (jadwalDiSlot.isLocked) {
      console.log(`  ⚠️  Sesi ini LOCKED — tidak bisa digeser otomatis, harus manual/unlock dulu.`);
      continue;
    }

    // Cari slot kosong lain (di kelas & guru yg sama, hari apa saja) yang bisa jadi tujuan swap
    const semuaSlot = await prisma.slotWaktu.findMany({ where: { jenisSlot: "PELAJARAN" }, orderBy: [{ hari: "asc" }, { urutan: "asc" }] });
    const jadwalKelasIni = await prisma.jadwal.findMany({ where: { periodeAkademikId: periode.id, kelasId: jadwalDiSlot.kelasId } });
    const jadwalGuruIni = await prisma.jadwal.findMany({ where: { periodeAkademikId: periode.id, guruId: guru.id } });
    const occKelas = new Set(jadwalKelasIni.map(j => `${j.hari}::${j.slotWaktuId}`));
    const occGuru  = new Set(jadwalGuruIni.map(j => `${j.hari}::${j.slotWaktuId}`));

    const kandidat = semuaSlot.filter(s => {
      const k = `${s.hari}::${s.id}`;
      return !occKelas.has(k) && !occGuru.has(k); // kosong di keduanya = aman buat dipindah ke sini
    });

    console.log(`\n  Slot kosong (aman, kelas & guru sama-sama free) tempat "${jadwalDiSlot.bebanMengajar.mapel.kodeMapel}" bisa DIPINDAH ke:`);
    if (kandidat.length === 0) {
      console.log("    (tidak ada — swap langsung tidak memungkinkan, perlu rantai swap lebih panjang)");
    } else {
      for (const s of kandidat.slice(0, 10)) console.log(`    ${s.hari}#${s.urutan}`);
      if (kandidat.length > 10) console.log(`    ... dan ${kandidat.length - 10} slot lain`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
