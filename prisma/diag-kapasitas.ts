import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) { console.log("Tidak ada periode aktif"); return; }
  console.log(`Periode aktif: ${periode.tahun} ${periode.semester}\n`);

  // 1. Struktur slot per hari
  const semuaSlot = await prisma.slotWaktu.findMany({ orderBy: [{ hari: "asc" }, { urutan: "asc" }] });
  const slotByHari: Record<string, number> = {};
  const nonPelajaranByHari: Record<string, number> = {};
  for (const s of semuaSlot) {
    if (s.jenisSlot === "PELAJARAN") slotByHari[s.hari] = (slotByHari[s.hari] ?? 0) + 1;
    else nonPelajaranByHari[s.hari] = (nonPelajaranByHari[s.hari] ?? 0) + 1;
  }
  console.log("=== Slot PELAJARAN per hari (yang dipakai scheduler) ===");
  for (const h of ["SENIN","SELASA","RABU","KAMIS","JUMAT","SABTU"]) {
    console.log(`  ${h}: ${slotByHari[h] ?? 0} slot pelajaran, ${nonPelajaranByHari[h] ?? 0} slot non-pelajaran (istirahat/keagamaan/dll)`);
  }
  const totalSlotPerKelas = Object.values(slotByHari).reduce((a, b) => a + b, 0);
  console.log(`  TOTAL slot pelajaran/kelas/minggu: ${totalSlotPerKelas}`);
  console.log(`  (Bandingkan dengan struktur di file Ramadhan: 7+7+7+7+5+4 = 37 kalau Keagamaan+istirahat dikeluarkan)`);

  // 2. Beban
  const beban = await prisma.bebanMengajar.findMany({
    where: { periodeAkademikId: periode.id },
    include: { guru: true, kelas: true, mapel: true },
  });
  console.log(`\nTotal baris beban mengajar: ${beban.length}`);

  // 3. Per kelas: kebutuhan JP vs kapasitas
  console.log("\n=== Kebutuhan JP per kelas vs kapasitas slot ===");
  const byKelas = new Map<string, { nama: string; jp: number }>();
  for (const b of beban) {
    const e = byKelas.get(b.kelasId) ?? { nama: b.kelas.namaKelas, jp: 0 };
    e.jp += b.jp;
    byKelas.set(b.kelasId, e);
  }
  for (const [, v] of [...byKelas].sort((a, b) => a[1].nama.localeCompare(b[1].nama))) {
    const status = v.jp > totalSlotPerKelas ? "❌ OVER KAPASITAS" : "✅ OK";
    console.log(`  ${v.nama}: butuh ${v.jp} JP  vs  kapasitas ${totalSlotPerKelas} slot   ${status}`);
  }

  // 4. Per guru: kebutuhan JP vs slot tersedia (memperhitungkan hariTidakTersedia)
  console.log("\n=== Kebutuhan JP per guru vs slot tersedia (setelah hariTidakTersedia) ===");
  const byGuru = new Map<string, { nama: string; kode: string; jp: number; hariTidak: string[] }>();
  for (const b of beban) {
    const hariTidak = Array.isArray(b.guru.hariTidakTersedia) ? (b.guru.hariTidakTersedia as string[]) : [];
    const e = byGuru.get(b.guruId) ?? { nama: b.guru.nama, kode: b.guru.kodeGuru, jp: 0, hariTidak };
    e.jp += b.jp;
    byGuru.set(b.guruId, e);
  }
  const guruBermasalah: string[] = [];
  for (const [, v] of [...byGuru].sort((a, b) => a[1].kode.localeCompare(b[1].kode))) {
    const availSlots = Object.entries(slotByHari)
      .filter(([h]) => !v.hariTidak.includes(h))
      .reduce((a, [, n]) => a + n, 0);
    const status = v.jp > availSlots ? "❌ OVER" : "✅ OK";
    if (v.jp > availSlots) guruBermasalah.push(v.kode);
    const blokirLabel = v.hariTidak.length ? `  [blokir: ${v.hariTidak.join(",")}]` : "";
    console.log(`  ${v.kode.padEnd(4)} ${v.nama.padEnd(35)} butuh ${String(v.jp).padStart(3)} JP / tersedia ${availSlots} slot${blokirLabel}  ${status}`);
  }
  if (guruBermasalah.length) {
    console.log(`\n⚠️  Guru OVER kapasitas (kemungkinan besar sumber GAGAL): ${guruBermasalah.join(", ")}`);
  }

  // 5. Konfigurasi mapel
  console.log("\n=== Konfigurasi mapel (jpMaksBerurutan / jumlahPertemuanMaks) ===");
  const mapelList = await prisma.mapel.findMany({ orderBy: { kodeMapel: "asc" } });
  for (const m of mapelList) {
    console.log(`  ${m.kodeMapel.padEnd(15)} jpMaksBerurutan=${m.jpMaksBerurutan}  jumlahPertemuanMaks=${m.jumlahPertemuanMaks}  aktif=${m.aktif}`);
  }

  // 6. Beban yang JP-nya butuh sesi > jumlahPertemuanMaks mapel (walau split table ideal)
  console.log("\n=== Beban yang berpotensi butuh lebih banyak sesi dari jumlahPertemuanMaks mapel-nya ===");
  const ADMIN_MIN_SESI: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 3 };
  let flagCount = 0;
  for (const b of beban) {
    const minSesi = ADMIN_MIN_SESI[b.jp] ?? Math.ceil(b.jp / 3);
    if (minSesi > b.mapel.jumlahPertemuanMaks) {
      flagCount++;
      console.log(`  ⚠️  ${b.kelas.namaKelas} - ${b.mapel.kodeMapel} (${b.guru.kodeGuru}): JP=${b.jp} butuh min ${minSesi} sesi, tapi jumlahPertemuanMaks mapel cuma ${b.mapel.jumlahPertemuanMaks}`);
    }
  }
  if (flagCount === 0) console.log("  (tidak ada — aman)");

  // 7. Slot terkunci (ekskul/blokir manual) yang mungkin makan kapasitas
  const slotTerkunci = await prisma.slotTerkunci.count({ where: { periodeAkademikId: periode.id } });
  console.log(`\n=== Slot terkunci (ekskul/blokir manual) aktif di periode ini: ${slotTerkunci} ===`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
