import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TARGETS: { kelasNama: string; guruNamaContains: string; mapelKodeContains?: string }[] = [
  { kelasNama: "VIII-4", guruNamaContains: "Mangalandong" }, // PJOK
  { kelasNama: "VII-2",  guruNamaContains: "Rika Juwita" },  // BMR
];

function slotKey(hari: string, id: string) { return `${hari}::${id}`; }

async function main() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) { console.log("Tidak ada periode aktif"); return; }
  console.log(`Periode aktif: ${periode.tahun} ${periode.semester} (id=${periode.id})\n`);

  const semuaSlot = await prisma.slotWaktu.findMany({ orderBy: [{ hari: "asc" }, { urutan: "asc" }] });
  const slotPelajaran = semuaSlot.filter(s => s.jenisSlot === "PELAJARAN");
  const slotByHari: Record<string, typeof slotPelajaran> = {};
  for (const s of slotPelajaran) (slotByHari[s.hari] ??= []).push(s);
  const totalSlotPerKelas = slotPelajaran.length;
  console.log("=== Kapasitas slot PELAJARAN per hari ===");
  for (const [h, list] of Object.entries(slotByHari)) console.log(`  ${h}: ${list.length}`);
  console.log(`  TOTAL/minggu: ${totalSlotPerKelas}\n`);

  for (const target of TARGETS) {
    console.log(`\n${"=".repeat(70)}\nTARGET: kelas~"${target.kelasNama}" guru~"${target.guruNamaContains}"\n${"=".repeat(70)}`);

    const kelas = await prisma.kelas.findFirst({ where: { namaKelas: { contains: target.kelasNama } } });
    const guru = await prisma.guru.findFirst({ where: { nama: { contains: target.guruNamaContains } } });
    if (!kelas) { console.log(`  ❌ Kelas tidak ditemukan untuk "${target.kelasNama}"`); continue; }
    if (!guru)  { console.log(`  ❌ Guru tidak ditemukan untuk "${target.guruNamaContains}"`); continue; }
    console.log(`  Kelas: ${kelas.namaKelas} (${kelas.id})`);
    console.log(`  Guru : ${guru.nama} / ${guru.kodeGuru} (${guru.id})`);
    console.log(`  Guru.hariTidakTersedia: ${JSON.stringify(guru.hariTidakTersedia)}`);
    console.log(`  Guru.maksJp: ${guru.maksJp}`);

    // Total JP kebutuhan kelas ini (semua mapel) di periode ini
    const bebanKelas = await prisma.bebanMengajar.findMany({
      where: { periodeAkademikId: periode.id, kelasId: kelas.id },
      include: { mapel: true, guru: true },
    });
    const totalJPKelas = bebanKelas.reduce((a, b) => a + b.jp, 0);
    console.log(`\n  --- Beban kelas ${kelas.namaKelas} (total ${bebanKelas.length} baris, ${totalJPKelas} JP) ---`);
    console.log(`  Kapasitas slot/minggu: ${totalSlotPerKelas}  →  sisa margin: ${totalSlotPerKelas - totalJPKelas} slot`);
    for (const b of bebanKelas.sort((a, c) => a.mapel.kodeMapel.localeCompare(c.mapel.kodeMapel))) {
      console.log(`    ${b.mapel.kodeMapel.padEnd(15)} ${b.jp} JP  (guru: ${b.guru.kodeGuru}, jpMaksBerurutan=${b.mapel.jpMaksBerurutan}, pertemuanMaks=${b.mapel.jumlahPertemuanMaks})`);
    }

    // Total JP guru ini di periode ini
    const bebanGuru = await prisma.bebanMengajar.findMany({
      where: { periodeAkademikId: periode.id, guruId: guru.id },
      include: { mapel: true, kelas: true },
    });
    const totalJPGuru = bebanGuru.reduce((a, b) => a + b.jp, 0);
    const hariTidak = Array.isArray(guru.hariTidakTersedia) ? (guru.hariTidakTersedia as string[]) : [];
    const availSlotsGuru = Object.entries(slotByHari).filter(([h]) => !hariTidak.includes(h)).reduce((a, [, l]) => a + l.length, 0);
    console.log(`\n  --- Beban guru ${guru.nama} (total ${bebanGuru.length} baris, ${totalJPGuru} JP) ---`);
    console.log(`  Slot tersedia guru (setelah hariTidakTersedia): ${availSlotsGuru}  →  sisa margin: ${availSlotsGuru - totalJPGuru} slot`);

    // Ekskul yang dibina guru ini -> slot terkunci turunan
    const ekskul = await prisma.ekstrakurikuler.findMany({ where: { pembinaId: guru.id } });
    console.log(`\n  --- Ekstrakurikuler dibina guru ini: ${ekskul.length} ---`);
    for (const e of ekskul) console.log(`    ${e.nama} — ${e.hari} ${e.jamMulai}-${e.jamSelesai}`);

    // Slot terkunci untuk kelas ini (ekskul wajib kelas / blokir manual)
    const slotTerkunciKelas = await prisma.slotTerkunci.findMany({
      where: { periodeAkademikId: periode.id, kelasId: kelas.id },
      include: { slotWaktuMulai: true, mapel: true, ekstrakurikuler: true },
    });
    console.log(`\n  --- Slot terkunci utk kelas ${kelas.namaKelas}: ${slotTerkunciKelas.length} ---`);
    for (const st of slotTerkunciKelas) {
      console.log(`    ${st.hari} mulai=${st.slotWaktuMulai.namaSlot}(urutan ${st.slotWaktuMulai.urutan}) durasi=${st.durasiSlot} label=${st.label ?? st.mapel?.namaMapel ?? st.ekstrakurikuler?.nama ?? "-"}`);
    }
    const slotTerkunciGlobal = await prisma.slotTerkunci.findMany({
      where: { periodeAkademikId: periode.id, kelasId: null },
      include: { slotWaktuMulai: true },
    });
    console.log(`  --- Slot terkunci GLOBAL (semua kelas): ${slotTerkunciGlobal.length} ---`);
    for (const st of slotTerkunciGlobal) {
      console.log(`    ${st.hari} mulai urutan ${st.slotWaktuMulai.urutan} durasi=${st.durasiSlot} label=${st.label ?? "-"}`);
    }

    // Jadwal yang sudah tersimpan (hasil generate terakhir) utk kelas & guru ini
    const jadwalKelas = await prisma.jadwal.findMany({
      where: { periodeAkademikId: periode.id, kelasId: kelas.id },
      include: { slotWaktu: true, bebanMengajar: { include: { mapel: true } } },
    });
    const occupiedKelas = new Set(jadwalKelas.map(j => slotKey(j.hari, j.slotWaktuId)));
    console.log(`\n  --- Jadwal TERSIMPAN utk kelas (isLocked apapun): ${jadwalKelas.length} / ${totalSlotPerKelas} slot terisi ---`);
    const freeKelas: string[] = [];
    for (const [h, list] of Object.entries(slotByHari)) {
      for (const s of list) {
        const k = slotKey(h, s.id);
        if (!occupiedKelas.has(k)) freeKelas.push(`${h}#${s.urutan}`);
      }
    }
    console.log(`  Slot KOSONG kelas (${freeKelas.length}): ${freeKelas.join(", ") || "(tidak ada)"}`);

    const jadwalGuru = await prisma.jadwal.findMany({
      where: { periodeAkademikId: periode.id, guruId: guru.id },
      include: { slotWaktu: true },
    });
    const occupiedGuru = new Set(jadwalGuru.map(j => slotKey(j.hari, j.slotWaktuId)));
    console.log(`\n  --- Jadwal TERSIMPAN utk guru: ${jadwalGuru.length} slot terisi ---`);
    const freeGuru: string[] = [];
    for (const [h, list] of Object.entries(slotByHari)) {
      if (hariTidak.includes(h)) continue;
      for (const s of list) {
        const k = slotKey(h, s.id);
        if (!occupiedGuru.has(k)) freeGuru.push(`${h}#${s.urutan}`);
      }
    }
    console.log(`  Slot KOSONG guru (${freeGuru.length}): ${freeGuru.join(", ") || "(tidak ada)"}`);

    const bothFree = freeKelas.filter(k => freeGuru.includes(k));
    console.log(`\n  >>> Slot yang KOSONG di KEDUANYA (guru & kelas): ${bothFree.length} → ${bothFree.join(", ") || "(TIDAK ADA — inilah akar masalahnya)"}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
