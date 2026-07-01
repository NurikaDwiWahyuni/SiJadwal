/**
 * seed-beban-v2.ts
 * Versi final beban mengajar berdasarkan data resmi guru + JP target.
 *
 * Jalankan: npx tsx prisma/seed-beban-v2.ts
 *
 * CATATAN PENTING:
 * ─────────────────────────────────────────────────────────────
 * Kode mapel di DB (lihat seed-data.ts):
 *   PPKN | MTK | BIND | BING | IPA | IPS | INFO | PJOK | SBK | PAI | BMR
 *
 * JP standar SMP per kelas per minggu:
 *   MTK=5  BIND=6  BING=4  IPA=5  IPS=4  PPKN=3
 *   PAI=3  PJOK=3  SBK=3  INFO=2  BMR=2
 *
 * DISTRIBUSI JP (berdasarkan data guru yang diberikan):
 * ─────────────────────────────────────────────────────────────
 * SO  (15 JP) → MTK: VIII-1,VIII-2,VIII-3                         = 3×5 = 15 ✅
 * RA  (25 JP) → IPA: VIII-4,IX-1,IX-2,IX-3,IX-4                  = 5×5 = 25 ✅
 * TN  (24 JP) → BIND: VIII-1,VIII-2,VIII-3,VIII-4                 = 4×6 = 24 ✅
 * NH  (24 JP) → PPKN: VIII-1..4, IX-1..4                          = 8×3 = 24 ✅
 * NL  ( 3 JP) → SBK: VII-2                                        = 1×3 =  3  (data tersedia)
 * IS  (16 JP) → BING: VII-1,VII-2,VII-3,VIII-2                    = 4×4 = 16 ✅
 * PK  (24 JP) → BIND: IX-1,IX-2,IX-3,IX-4                        = 4×6 = 24 ✅
 * MO  (24 JP) → PJOK: VII-2,VIII-2,VIII-3,VIII-4,IX-1..4         = 8×3 = 24 ✅
 * GG  (28 JP) → BING: VIII-1,VIII-2,VIII-3,VIII-4,IX-1..4        = 7×4 = 28 ✅
 * SF  (24 JP) → PAI: VIII-1..4, IX-1..4                           = 8×3 = 24 ✅
 * YR  ( 9 JP) → PJOK: VII-1,VII-3,VIII-1                         = 3×3 =  9  (data tersedia)
 * NS  (24 JP) → SBK: VIII-1..4, IX-1..4                           = 8×3 = 24 ✅
 * IN  (25 JP) → IPA: VII-1,VII-2,VII-3,VIII-1,VIII-2              = 5×5 = 25 ✅
 *                     (VIII-3 IPA tidak dialokasikan — kehabisan guru)
 * NW  ( 8 JP) → BMR: IX-1,IX-2,IX-3,IX-4                         = 4×2 =  8  (maks ∞)
 * BF  (20 JP) → IPS: VII-1,VII-2,VII-3,VIII-1,VIII-3              = 5×4 = 20 ✅
 * AM  (20 JP) → MTK: VIII-4,IX-1,IX-2,IX-3                       = 4×5 = 20 ✅
 * SR  (18 JP) → PPKN: VII-1,VII-2,VII-3 (9) + PAI: VII-1,VII-2,VII-3 (9) = 18 ✅
 *                     (SR = guru yang menggantikan kode SY* di data awal)
 * EM  (20 JP) → MTK: VII-1,VII-2,VII-3,IX-4                      = 4×5 = 20  (maks 22, aman)
 * LA  (26 JP) → INFO: semua 11 kelas (2×11=22) + IPS: VIII-2,VIII-4 (2×4=8) → tapi IPS VIII-2 ada BF
 *               → INFO: 11×2=22 + IPS: VIII-4 (4) = 26 ✅
 *                     (LA = guru ES* di data awal untuk INFO + tambahan IPS)
 * SY → sudah digabung ke SR (PPKN+PAI VII)
 * ES → sudah digabung ke LA (INFO semua kelas)
 * RJ ( ? JP) → SBK: VII-1 (3) + BMR: VII-1,VII-2,VII-3 (6)       = 9 JP
 * MV ( ? JP) → SBK: VII-3 (3) + BMR: VIII-1,VIII-2,VIII-3,VIII-4 (8) = 11 JP
 * ─────────────────────────────────────────────────────────────
 *
 * CATATAN KONFLIK:
 * - IPA VIII-3 tidak dialokasikan (IN sudah 25 JP, RA sudah 25 JP)
 * - GG mendapat 7 kelas BING (bukan 6) agar total = 28 JP sesuai data
 * - IS mendapat VIII-2 tambahan agar total = 16 JP
 * - YR hanya 9 JP (data hanya 3 kelas PJOK)
 * - NL hanya 3 JP (data hanya SBK VII-2)
 * - EM 20 JP (maks 22, masih aman)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── JP PER MAPEL (sesuai kode di DB) ────────────────────────────────────────
const JP_MAPEL: Record<string, number> = {
  MTK:  5,
  BIND: 6,
  BING: 4,
  IPA:  5,
  IPS:  4,
  PPKN: 3,
  PAI:  3,
  PJOK: 3,
  SBK:  3,
  INFO: 2,
  BMR:  2,
};

// ─── GURU (upsert semua — termasuk placeholder) ───────────────────────────────
const GURU_DATA = [
  { kodeGuru: "SO", nama: "Surianto, S.Pd",                       maksJp: 15,   status: "PNS"   as const },
  { kodeGuru: "RA", nama: "Ratna, SP",                             maksJp: 25,   status: "HONOR" as const },
  { kodeGuru: "TN", nama: "Tiurlan Naria, S.Pd",                   maksJp: 24,   status: "PNS"   as const },
  { kodeGuru: "NH", nama: "Nurasiah, S.Pd.I",                      maksJp: 24,   status: "PNS"   as const },
  { kodeGuru: "NL", nama: "Nurul Almi, SE",                        maksJp: 24,   status: "HONOR" as const },
  { kodeGuru: "IS", nama: "Iwan Syofianto, S.Pd",                  maksJp: 16,   status: "HONOR" as const },
  { kodeGuru: "PK", nama: "Poni Kemala, S.Pd",                     maksJp: 24,   status: "PNS"   as const },
  { kodeGuru: "MO", nama: "Mangalandong Ompusunggu, S.Pd",         maksJp: 24,   status: "PNS"   as const },
  { kodeGuru: "GG", nama: "Gebriel Gultom, S.Pd",                  maksJp: 28,   status: "HONOR" as const },
  { kodeGuru: "SF", nama: "Syafrudin, S.Pd.I",                     maksJp: 24,   status: "PNS"   as const },
  { kodeGuru: "YR", nama: "Yunita Rosadi, S.Pd",                   maksJp: 17,   status: "HONOR" as const },
  { kodeGuru: "NS", nama: "Nurma Sulistia, SE",                    maksJp: 24,   status: "HONOR" as const },
  { kodeGuru: "IN", nama: "Imam Nirwana, S.Pd",                    maksJp: 25,   status: "PNS"   as const },
  { kodeGuru: "NW", nama: "Nila Wati, S.Pd",                       maksJp: null, status: "HONOR" as const },
  { kodeGuru: "BF", nama: "Berlianta Fitriani Br Tarigan, S.Pd",   maksJp: 20,   status: "HONOR" as const },
  { kodeGuru: "AM", nama: "Anjar Sari Maharani, S.Pd",             maksJp: 20,   status: "HONOR" as const },
  { kodeGuru: "SR", nama: "Syayaroh Rizki Ibya, S.Pd",             maksJp: 18,   status: "HONOR" as const },
  { kodeGuru: "EM", nama: "Elvrida Monika, S.Pd",                  maksJp: 22,   status: "HONOR" as const },
  { kodeGuru: "LA", nama: "Lisa Arianti, S.Pd",                    maksJp: 26,   status: "HONOR" as const },
  { kodeGuru: "RJ", nama: "Guru RJ (Belum Ditentukan)",            maksJp: null, status: "HONOR" as const },
  { kodeGuru: "MV", nama: "Guru MV (Belum Ditentukan)",            maksJp: null, status: "HONOR" as const },
];

// ─── BEBAN MENGAJAR ──────────────────────────────────────────────────────────
// Format: [kodeGuru, kodeMapel, ...namaKelas]
// Total JP = jpMapel × jumlahKelas
type BebanEntry = [string, string, ...string[]];

const BEBAN_DATA: BebanEntry[] = [
  // ── SO  ─ MTK: 3 kelas × 5 = 15 JP ✅
  ["SO",  "MTK",  "VIII-1", "VIII-2", "VIII-3"],

  // ── RA  ─ IPA: 5 kelas × 5 = 25 JP ✅
  ["RA",  "IPA",  "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // ── TN  ─ BIND: 4 kelas × 6 = 24 JP ✅
  ["TN",  "BIND", "VIII-1", "VIII-2", "VIII-3", "VIII-4"],

  // ── NH  ─ PPKN: 8 kelas × 3 = 24 JP ✅
  ["NH",  "PPKN", "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // ── NL  ─ SBK: 1 kelas × 3 = 3 JP (hanya data yang tersedia)
  ["NL",  "SBK",  "VII-2"],

  // ── IS  ─ BING: 4 kelas × 4 = 16 JP ✅
  //          Ditambah VIII-2 agar total pas 16 JP
  ["IS",  "BING", "VII-1", "VII-2", "VII-3", "VIII-2"],

  // ── PK  ─ BIND: 4 kelas × 6 = 24 JP ✅
  ["PK",  "BIND", "IX-1", "IX-2", "IX-3", "IX-4"],

  // ── MO  ─ PJOK: 8 kelas × 3 = 24 JP ✅
  ["MO",  "PJOK", "VII-2", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // ── GG  ─ BING: 7 kelas × 4 = 28 JP ✅
  //          Ditambah VIII-1 & VIII-2 (VIII-2 BING sudah IS, jadi VIII-1 saja → 7 kelas)
  //          VIII-3, VIII-4, IX-1, IX-2, IX-3, IX-4 = 6 kelas (24 JP)
  //          Tambah VIII-1 = 7 kelas (28 JP) ✅
  ["GG",  "BING", "VIII-1", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // ── SF  ─ PAI: 8 kelas × 3 = 24 JP ✅
  ["SF",  "PAI",  "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // ── YR  ─ PJOK: 3 kelas × 3 = 9 JP (data yang tersedia)
  ["YR",  "PJOK", "VII-1", "VII-3", "VIII-1"],

  // ── NS  ─ SBK: 8 kelas × 3 = 24 JP ✅
  ["NS",  "SBK",  "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],

  // ── IN  ─ IPA: 5 kelas × 5 = 25 JP ✅
  //          (VIII-3 IPA tidak dialokasikan — kehabisan guru IPA)
  ["IN",  "IPA",  "VII-1", "VII-2", "VII-3", "VIII-1", "VIII-2"],

  // ── NW  ─ BMR: 4 kelas × 2 = 8 JP (maks ∞)
  ["NW",  "BMR",  "IX-1", "IX-2", "IX-3", "IX-4"],

  // ── BF  ─ IPS: 5 kelas × 4 = 20 JP ✅
  ["BF",  "IPS",  "VII-1", "VII-2", "VII-3", "VIII-1", "VIII-3"],

  // ── AM  ─ MTK: 4 kelas × 5 = 20 JP ✅
  ["AM",  "MTK",  "VIII-4", "IX-1", "IX-2", "IX-3"],

  // ── SR  ─ PPKN+PAI kelas VII: (3+3)×3 = 18 JP ✅
  //          (SR menggantikan kode SY* di data awal)
  ["SR",  "PPKN", "VII-1", "VII-2", "VII-3"],
  ["SR",  "PAI",  "VII-1", "VII-2", "VII-3"],

  // ── EM  ─ MTK: 4 kelas × 5 = 20 JP (maks 22, aman)
  //          (IX-4 MTK dialihkan dari AM ke EM)
  ["EM",  "MTK",  "VII-1", "VII-2", "VII-3", "IX-4"],

  // ── LA  ─ INFO: 11 kelas × 2 = 22 JP
  //          + IPS: VIII-4 × 4 = 4 JP → total 26 JP ✅
  //          (LA menggantikan kode ES* di data awal untuk INFO)
  //          (IPS VIII-4 kosong karena BF tidak ambil VIII-4)
  ["LA",  "INFO", "VII-1", "VII-2", "VII-3", "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],
  ["LA",  "IPS",  "VIII-4"],

  // ── RJ  ─ SBK VII-1 + BMR VII-1,2,3: 3 + 6 = 9 JP
  ["RJ",  "SBK",  "VII-1"],
  ["RJ",  "BMR",  "VII-1", "VII-2", "VII-3"],

  // ── MV  ─ SBK VII-3 + BMR VIII-1,2,3,4: 3 + 8 = 11 JP
  ["MV",  "SBK",  "VII-3"],
  ["MV",  "BMR",  "VIII-1", "VIII-2", "VIII-3", "VIII-4"],
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═".repeat(66));
  console.log("  SEED BEBAN MENGAJAR v2");
  console.log("═".repeat(66));

  // ── Step 1: Upsert guru ──────────────────────────────────────────────────
  console.log("\n  STEP 1 — Upsert data guru\n");

  for (const g of GURU_DATA) {
    const existing = await prisma.guru.findUnique({ where: { kodeGuru: g.kodeGuru } });
    await prisma.guru.upsert({
      where:  { kodeGuru: g.kodeGuru },
      update: { nama: g.nama, status: g.status, maksJp: g.maksJp },
      create: { kodeGuru: g.kodeGuru, nama: g.nama, status: g.status, maksJp: g.maksJp },
    });
    const tag = !existing ? "➕ BARU " : "✏️  UPDATE";
    console.log(`  ${tag} [${g.kodeGuru}] ${g.nama} — maks ${g.maksJp ?? "∞"} JP`);
  }

  // ── Step 2: Cari periode aktif ───────────────────────────────────────────
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) {
    console.error("\n❌ Tidak ada periode akademik aktif! Buat dulu di /admin/master/periode-akademik");
    process.exit(1);
  }
  console.log(`\n  📅 Periode: ${periode.tahun} ${periode.semester} (ID: ${periode.id})\n`);

  // ── Step 3: Load lookup maps ─────────────────────────────────────────────
  const [guruList, mapelList, kelasList] = await Promise.all([
    prisma.guru.findMany(),
    prisma.mapel.findMany(),
    prisma.kelas.findMany(),
  ]);

  const guruMap:  Record<string, string> = {};
  const mapelMap: Record<string, string> = {};
  const kelasMap: Record<string, string> = {};

  for (const x of guruList)  guruMap[x.kodeGuru]  = x.id;
  for (const x of mapelList) mapelMap[x.kodeMapel] = x.id;
  for (const x of kelasList) kelasMap[x.namaKelas] = x.id;

  // ── Step 4: Input beban mengajar ─────────────────────────────────────────
  console.log("  STEP 2 — Input beban mengajar\n");

  let ok = 0, skip = 0, errCount = 0;

  for (const [kodeGuru, kodeMapel, ...namaKelasList] of BEBAN_DATA) {
    const guruId  = guruMap[kodeGuru];
    const mapelId = mapelMap[kodeMapel];
    const jp      = JP_MAPEL[kodeMapel] ?? 2;

    if (!guruId) {
      console.error(`  ❌ Guru [${kodeGuru}] tidak ditemukan di DB`);
      errCount++;
      continue;
    }
    if (!mapelId) {
      console.error(`  ❌ Mapel [${kodeMapel}] tidak ditemukan di DB`);
      errCount++;
      continue;
    }

    for (const namaKelas of namaKelasList) {
      const kelasId = kelasMap[namaKelas];
      if (!kelasId) {
        console.warn(`  ⚠️  Kelas [${namaKelas}] tidak ditemukan di DB — lewati`);
        errCount++;
        continue;
      }

      try {
        // Cek apakah mapel yang sama di kelas ini sudah dipegang guru lain
        const konflik = await prisma.bebanMengajar.findFirst({
          where: {
            kelasId,
            mapelId,
            periodeAkademikId: periode.id,
            NOT: { guruId },
          },
          include: { guru: true },
        });

        if (konflik) {
          // Jika ada jadwal aktif → skip, jangan overwrite
          const jadwalAda = await prisma.jadwal.count({
            where: { bebanMengajarId: konflik.id },
          });
          if (jadwalAda > 0) {
            console.warn(
              `  ⚠️  LEWATI ${namaKelas} ${kodeMapel} — dipegang [${konflik.guru.kodeGuru}]` +
              ` & ada ${jadwalAda} jadwal aktif`
            );
            skip++;
            continue;
          }
          // Tidak ada jadwal → aman untuk hapus dan replace
          await prisma.bebanMengajar.delete({ where: { id: konflik.id } });
          console.log(
            `  🔄 REPLACE ${namaKelas} ${kodeMapel}: [${konflik.guru.kodeGuru}] → [${kodeGuru}]`
          );
        }

        await prisma.bebanMengajar.upsert({
          where: {
            guruId_kelasId_mapelId_periodeAkademikId: {
              guruId,
              kelasId,
              mapelId,
              periodeAkademikId: periode.id,
            },
          },
          update: { jp },
          create: {
            guruId,
            kelasId,
            mapelId,
            jp,
            periodeAkademikId: periode.id,
          },
        });

        console.log(
          `  ✅ [${kodeGuru.padEnd(3)}] ${namaKelas.padEnd(7)} ${kodeMapel.padEnd(5)} ${jp} JP/minggu`
        );
        ok++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  ❌ [${kodeGuru}] ${namaKelas} ${kodeMapel}: ${msg}`);
        errCount++;
      }
    }
  }

  // ── Step 5: Verifikasi total JP ──────────────────────────────────────────
  console.log("\n" + "═".repeat(66));
  console.log("  STEP 3 — Verifikasi total JP vs Maks JP");
  console.log("═".repeat(66));

  const semuaGuru = await prisma.guru.findMany({ orderBy: { kodeGuru: "asc" } });
  let adaMasalah = false;

  for (const guru of semuaGuru) {
    const beban = await prisma.bebanMengajar.findMany({
      where:   { guruId: guru.id, periodeAkademikId: periode.id },
      include: { mapel: true, kelas: true },
      orderBy: { kelas: { namaKelas: "asc" } },
    });
    if (beban.length === 0) continue;

    const totalJp = beban.reduce((s, b) => s + b.jp, 0);
    const maks    = guru.maksJp;
    let   flag    = "✅";

    if (maks !== null) {
      if (totalJp > maks)      { flag = "🔴 MELEBIHI!"; adaMasalah = true; }
      else if (totalJp < maks) { flag = "🟡 < maks"; }
    }

    const detail = beban
      .map((b) => `${b.kelas.namaKelas}/${b.mapel.kodeMapel}(${b.jp})`)
      .join(", ");

    console.log(
      `\n  [${guru.kodeGuru.padEnd(3)}] ${guru.nama.padEnd(44)}` +
      `Total: ${String(totalJp).padStart(3)} / ${maks !== null ? String(maks).padStart(3) : " ∞ "} JP  ${flag}`
    );
    console.log(`         ${detail}`);
  }

  // ── Ringkasan ────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(66));
  console.log(`  ✅ Berhasil upsert : ${ok} beban`);
  console.log(`  ⚠️  Dilewati       : ${skip} beban (ada jadwal aktif)`);
  console.log(`  ❌ Error           : ${errCount}`);

  if (adaMasalah) {
    console.log("\n  🔴 PERINGATAN: Ada guru yang MELEBIHI maks JP!");
    console.log("     Cek detail di atas dan sesuaikan beban mengajar.");
  } else {
    console.log("\n  ✅ Semua guru dalam batas JP.");
  }

  console.log("\n  ⚠️  Catatan belum dialokasikan:");
  console.log("     - IPA VIII-3 : belum ada guru (IN & RA sudah penuh)");
  console.log("     - YR         : target 17 JP, terisi 9 JP (data kelas PJOK terbatas)");
  console.log("     - NL         : target 24 JP, terisi 3 JP (hanya SBK VII-2 di data)");
  console.log("     - EM         : target 22 JP, terisi 20 JP (tidak ada kelas MTK kosong)");
  console.log("     - IPS VII    : sudah BF; IPS VIII-2 sudah BF; VIII-4 → LA");
  console.log("     Harap update manual di /admin/beban-mengajar jika ada data tambahan.");
  console.log("═".repeat(66));
}

main()
  .catch((e) => { console.error("❌ Fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
