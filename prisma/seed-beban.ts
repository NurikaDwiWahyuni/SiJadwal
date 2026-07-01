/**
 * seed-beban.ts  —  Update guru + Input beban mengajar
 * Jalankan: npx tsx prisma/seed-beban.ts
 *
 * Yang dilakukan:
 *  1. Upsert 19 guru resmi (nama, kode, maksJp, status)
 *  2. Tambah guru placeholder SY, ES, RJ, MV yang belum ada
 *  3. Input semua beban mengajar dengan JP yang sudah dihitung pas
 *  4. Verifikasi akhir total JP vs maks tiap guru
 *
 * KALKULASI JP (standar SMP):
 *   MTK=5  BIN=6  BIG=4  IPA=5  IPS=4  PPKN=3
 *   PAI=3  PJOK=3  SBK=3  INFO=2  BMR=2
 *
 * CATATAN PENYESUAIAN vs data awal:
 *   IS  → ditambah BIG VIII-2  (12→16 JP, pas maks 16)
 *   IN  → dikurangi VIII-3 IPA (30→25 JP, pas maks 25)
 *   AM  → dikurangi IX-4 MTK  (25→20 JP, pas maks 20)
 *   EM  → ditambah IX-4 MTK   (15→20 JP, sesuai kapasitas)
 *   VIII-3 IPA → kosong (belum ada guru IPA tersisa)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── 1. DATA GURU ────────────────────────────────────────────────────────────
const GURU_DATA = [
  { kodeGuru: "SO", nama: "Surianto, S.Pd",                     maksJp: 15,   status: "PNS"   as const },
  { kodeGuru: "RA", nama: "Ratna, SP",                           maksJp: 25,   status: "HONOR" as const },
  { kodeGuru: "TN", nama: "Tiurlan Naria, S.Pd",                 maksJp: 24,   status: "PNS"   as const },
  { kodeGuru: "NH", nama: "Nurasiah, S.Pd.I",                    maksJp: 24,   status: "PNS"   as const },
  { kodeGuru: "NL", nama: "Nurul Almi, SE",                      maksJp: 24,   status: "HONOR" as const },
  { kodeGuru: "IS", nama: "Iwan Syofianto, S.Pd",                maksJp: 16,   status: "HONOR" as const },
  { kodeGuru: "PK", nama: "Poni Kemala, S.Pd",                   maksJp: 24,   status: "PNS"   as const },
  { kodeGuru: "MO", nama: "Mangalandong Ompusunggu, S.Pd",       maksJp: 24,   status: "PNS"   as const },
  { kodeGuru: "GG", nama: "Gebriel Gultom, S.Pd",                maksJp: 28,   status: "HONOR" as const },
  { kodeGuru: "SF", nama: "Syafrudin, S.Pd.I",                   maksJp: 24,   status: "PNS"   as const },
  { kodeGuru: "YR", nama: "Yunita Rosadi, S.Pd",                 maksJp: 17,   status: "HONOR" as const },
  { kodeGuru: "NS", nama: "Nurma Sulistia, SE",                  maksJp: 24,   status: "HONOR" as const },
  { kodeGuru: "IN", nama: "Imam Nirwana, S.Pd",                  maksJp: 25,   status: "PNS"   as const },
  { kodeGuru: "NW", nama: "Nila Wati, S.Pd",                     maksJp: null, status: "HONOR" as const },
  { kodeGuru: "BF", nama: "Berlianta Fitriani Br Tarigan, S.Pd", maksJp: 20,   status: "HONOR" as const },
  { kodeGuru: "AM", nama: "Anjar Sari Maharani, S.Pd",           maksJp: 20,   status: "HONOR" as const },
  { kodeGuru: "SR", nama: "Syayaroh Rizki Ibya, S.Pd",           maksJp: 18,   status: "HONOR" as const },
  { kodeGuru: "EM", nama: "Elvrida Monika, S.Pd",                maksJp: 22,   status: "HONOR" as const },
  { kodeGuru: "LA", nama: "Lisa Arianti, S.Pd",                  maksJp: 26,   status: "HONOR" as const },
  // Placeholder — nama bisa diupdate di UI nanti
  { kodeGuru: "SY", nama: "Guru SY (Belum Ditentukan)",          maksJp: null, status: "HONOR" as const },
  { kodeGuru: "ES", nama: "Guru ES (Belum Ditentukan)",          maksJp: null, status: "HONOR" as const },
  { kodeGuru: "RJ", nama: "Guru RJ (Belum Ditentukan)",          maksJp: null, status: "HONOR" as const },
  { kodeGuru: "MV", nama: "Guru MV (Belum Ditentukan)",          maksJp: null, status: "HONOR" as const },
];

// ─── 2. JP PER MAPEL ─────────────────────────────────────────────────────────
const JP: Record<string, number> = {
  MTK: 5, BIN: 6, BIG: 4, IPA: 5, IPS: 4,
  PPKN: 3, PAI: 3, PJOK: 3, SBK: 3, INFO: 2, BMR: 2,
};

// ─── 3. BEBAN MENGAJAR ───────────────────────────────────────────────────────
// Format: [kodeGuru, kodeMapel, kelas1, kelas2, ...]
// Total JP sudah diverifikasi tidak melebihi maksJp masing-masing guru.
const BEBAN: [string, string, ...string[]][] = [
  // SO — MTK: 3×5=15 JP ✅ (maks 15)
  ["SO", "MTK", "VIII-1", "VIII-2", "VIII-3"],

  // RA — IPA: 5×5=25 JP ✅ (maks 25)
  ["RA", "IPA", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // TN — BIN: 4×6=24 JP ✅ (maks 24)
  ["TN", "BIN", "VIII-1", "VIII-2", "VIII-3", "VIII-4"],

  // NH — PPKN: 8×3=24 JP ✅ (maks 24)
  ["NH", "PPKN", "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // NL — SBK: 1×3=3 JP (maks 24, sisanya belum ada data)
  ["NL", "SBK", "VII-2"],

  // IS — BIG: 4×4=16 JP ✅ (maks 16) — ditambah VIII-2 vs data awal
  ["IS", "BIG", "VII-1", "VII-2", "VII-3", "VIII-2"],

  // PK — BIN: 4×6=24 JP ✅ (maks 24)
  ["PK", "BIN", "IX-1", "IX-2", "IX-3", "IX-4"],

  // MO — PJOK: 8×3=24 JP ✅ (maks 24)
  ["MO", "PJOK", "VII-2", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // GG — BIG: 6×4=24 JP (maks 28, masih dalam batas)
  ["GG", "BIG", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // SF — PAI: 8×3=24 JP ✅ (maks 24)
  ["SF", "PAI", "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // YR — PJOK: 3×3=9 JP (maks 17, kelas VII terbatas karena MO tidak ambil VII-1,VII-3)
  ["YR", "PJOK", "VII-1", "VII-3", "VIII-1"],

  // NS — SBK: 8×3=24 JP ✅ (maks 24)
  ["NS", "SBK", "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // IN — IPA: 5×5=25 JP ✅ (maks 25) — dikurangi VIII-3 vs data awal
  ["IN", "IPA", "VII-1", "VII-2", "VII-3", "VIII-1", "VIII-2"],

  // NW — BMR: 4×2=8 JP (maks tidak dibatasi)
  ["NW", "BMR", "IX-1", "IX-2", "IX-3", "IX-4"],

  // BF — IPS: 5×4=20 JP ✅ (maks 20)
  ["BF", "IPS", "VII-1", "VII-2", "VII-3", "VIII-1", "VIII-3"],

  // AM — MTK: 4×5=20 JP ✅ (maks 20) — dikurangi IX-4 vs data awal
  ["AM", "MTK", "VIII-4", "IX-1", "IX-2", "IX-3"],

  // SR — belum ada data beban (maks 18, assign jika ada info)

  // EM — MTK: 4×5=20 JP ✅ (maks 22) — ditambah IX-4 vs data awal
  ["EM", "MTK", "VII-1", "VII-2", "VII-3", "IX-4"],

  // LA — belum ada data beban (maks 26)

  // SY — PPKN+PAI kelas VII: 3×3+3×3=18 JP
  ["SY", "PPKN", "VII-1", "VII-2", "VII-3"],
  ["SY", "PAI",  "VII-1", "VII-2", "VII-3"],

  // ES — INFO: 11×2=22 JP
  ["ES", "INFO", "VII-1", "VII-2", "VII-3", "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // RJ — SBK VII-1 + BMR VII-1,2,3: 3+6=9 JP
  ["RJ", "SBK", "VII-1"],
  ["RJ", "BMR", "VII-1", "VII-2", "VII-3"],

  // MV — SBK VII-3 + BMR VIII-1,2,3,4: 3+8=11 JP
  ["MV", "SBK", "VII-3"],
  ["MV", "BMR", "VIII-1", "VIII-2", "VIII-3", "VIII-4"],
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  // ── Step 1: Upsert guru ──────────────────────────────────────────────────
  console.log("═".repeat(60));
  console.log("  STEP 1 — Update & tambah data guru");
  console.log("═".repeat(60));

  for (const g of GURU_DATA) {
    const existing = await prisma.guru.findUnique({ where: { kodeGuru: g.kodeGuru } });
    await prisma.guru.upsert({
      where:  { kodeGuru: g.kodeGuru },
      update: { nama: g.nama, status: g.status, maksJp: g.maksJp },
      create: { kodeGuru: g.kodeGuru, nama: g.nama, status: g.status, maksJp: g.maksJp },
    });
    const isNew = !existing;
    console.log(`  ${isNew ? "➕ BARU " : "✏️  UPDATE"} [${g.kodeGuru}] ${g.nama} — maks ${g.maksJp ?? "∞"} JP`);
  }

  // ── Step 2: Beban mengajar ───────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("  STEP 2 — Input beban mengajar");
  console.log("═".repeat(60));

  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) {
    console.error("❌ Tidak ada periode akademik aktif!");
    process.exit(1);
  }
  console.log(`  📅 Periode: ${periode.tahun} ${periode.semester}\n`);

  const guruList  = await prisma.guru.findMany();
  const mapelList = await prisma.mapel.findMany();
  const kelasList = await prisma.kelas.findMany();

  const guruMap:  Record<string, string> = {};
  const mapelMap: Record<string, string> = {};
  const kelasMap: Record<string, string> = {};

  for (const x of guruList)  guruMap[x.kodeGuru]   = x.id;
  for (const x of mapelList) mapelMap[x.kodeMapel]  = x.id;
  for (const x of kelasList) kelasMap[x.namaKelas]  = x.id;

  let ok = 0, skip = 0, err = 0;

  for (const [kodeGuru, kodeMapel, ...kelasList2] of BEBAN) {
    const guruId  = guruMap[kodeGuru];
    const mapelId = mapelMap[kodeMapel];
    const jp      = JP[kodeMapel] ?? 2;

    if (!guruId)  { console.warn(`  ⚠️  Guru [${kodeGuru}] tidak ada`);   err++; continue; }
    if (!mapelId) { console.warn(`  ⚠️  Mapel [${kodeMapel}] tidak ada`); err++; continue; }

    for (const namaKelas of kelasList2) {
      const kelasId = kelasMap[namaKelas];
      if (!kelasId) { console.warn(`  ⚠️  Kelas [${namaKelas}] tidak ada`); err++; continue; }

      try {
        // Kalau kelas+mapel sudah dipegang guru lain, cek jadwal dulu
        const konflik = await prisma.bebanMengajar.findFirst({
          where: { kelasId, mapelId, periodeAkademikId: periode.id, NOT: { guruId } },
          include: { guru: true },
        });
        if (konflik) {
          const jadwalAda = await prisma.jadwal.count({ where: { bebanMengajarId: konflik.id } });
          if (jadwalAda > 0) {
            console.warn(`  ⚠️  LEWATI ${namaKelas} ${kodeMapel} — dipegang [${konflik.guru.kodeGuru}] & ada jadwal`);
            skip++; continue;
          }
          await prisma.bebanMengajar.delete({ where: { id: konflik.id } });
        }

        await prisma.bebanMengajar.upsert({
          where: {
            guruId_kelasId_mapelId_periodeAkademikId: {
              guruId, kelasId, mapelId, periodeAkademikId: periode.id,
            },
          },
          update: { jp },
          create: { guruId, kelasId, mapelId, jp, periodeAkademikId: periode.id },
        });

        console.log(`  ✅ [${kodeGuru}] ${namaKelas.padEnd(6)} ${kodeMapel.padEnd(5)} ${jp} JP`);
        ok++;
      } catch (e) {
        console.error(`  ❌ [${kodeGuru}] ${namaKelas} ${kodeMapel}:`, e);
        err++;
      }
    }
  }

  // ── Step 3: Verifikasi JP ────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("  STEP 3 — Verifikasi total JP vs Maks JP");
  console.log("═".repeat(60));

  const semuaGuru = await prisma.guru.findMany({ orderBy: { kodeGuru: "asc" } });
  let adaMasalah = false;

  for (const guru of semuaGuru) {
    const beban = await prisma.bebanMengajar.findMany({
      where: { guruId: guru.id, periodeAkademikId: periode.id },
      include: { mapel: true, kelas: true },
    });
    if (beban.length === 0) continue;

    const totalJp = beban.reduce((s, b) => s + b.jp, 0);
    const maks    = guru.maksJp;
    let   flag    = "✅";

    if (maks !== null) {
      if (totalJp > maks)      { flag = "🔴 MELEBIHI!"; adaMasalah = true; }
      else if (totalJp < maks) { flag = "🟡 kurang"; }
    }

    const detail = beban
      .map((b) => `${b.kelas.namaKelas}/${b.mapel.kodeMapel}(${b.jp})`)
      .join(", ");

    console.log(
      `  [${guru.kodeGuru.padEnd(3)}] ${guru.nama.padEnd(42)}` +
      `Total: ${String(totalJp).padStart(3)} / ${maks !== null ? String(maks).padStart(3) : " ∞ "} JP  ${flag}`
    );
    console.log(`         ${detail}`);
  }

  console.log("\n" + "═".repeat(60));
  console.log(`  ✅ Berhasil : ${ok}`);
  console.log(`  ⚠️  Dilewati : ${skip}`);
  console.log(`  ❌ Error    : ${err}`);
  if (adaMasalah) {
    console.log("  🔴 Ada guru yang MELEBIHI maks JP! Cek detail di atas.");
  } else {
    console.log("  ✅ Semua guru dalam batas JP.");
  }
  console.log("═".repeat(60));
  console.log("  Selesai. Cek di aplikasi → Master Data → Beban Mengajar");
  console.log("═".repeat(60));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
