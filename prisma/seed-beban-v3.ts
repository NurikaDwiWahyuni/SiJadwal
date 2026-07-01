/**
 * seed-beban-v3.ts
 * Beban mengajar final sesuai data resmi terbaru.
 *
 * Jalankan: npx tsx prisma/seed-beban-v3.ts
 *
 * ─── ANALISIS JP PER KELAS ────────────────────────────────────────────────────
 *
 * Data asli      → JP per kelas yang dipakai  → Keterangan
 * ──────────────────────────────────────────────────────────────────────────────
 * AM  MTK   5 kls, total 27 JP  → 5 JP/kls (25 JP)  ⚠ data bilang 27, pakai 25
 * BF  IPS   5 kls, total 20 JP  → 4 JP/kls (20 JP)  ✅
 * EM  MTK   3 kls, total 15 JP  → 5 JP/kls (15 JP)  ✅
 * MV  BMR   4 kls (VIII), SBK 1 kls (VII-3)
 *           BMR VIII-1..4 = 4×2=8, SBK VII-3 = 3 → total 11 JP ✅
 *           (data bilang 5 kelas, tapi VII-3 itu SBK bukan BMR)
 * GG  BING  6 kls, total 24 JP  → 4 JP/kls (24 JP)  ✅
 * ES  INFO  11 kls, total 22 JP → 2 JP/kls (22 JP)  ✅
 * IN  IPA   6 kls, total 29 JP  → 5 JP/kls (30 JP)  ⚠ data bilang 29, pakai 30
 * IS  BING  3 kls, total 12 JP  → 4 JP/kls (12 JP)  ✅
 * MO  PJOK  8 kls, total 24 JP  → 3 JP/kls (24 JP)  ✅
 * NW  BMR   4 kls, total  8 JP  → 2 JP/kls  (8 JP)  ✅
 * NL  SBK   1 kls, total  3 JP  → 3 JP/kls  (3 JP)  ✅
 * NH  PPKN  8 kls, total 24 JP  → 3 JP/kls (24 JP)  ✅
 * NS  SBK   8 kls, total 24 JP  → 3 JP/kls (24 JP)  ✅
 * NA  IPS   7 kls, total 23 JP  → campuran: 4 kls×4=16 + 3 kls×7/3≈?
 *           → pakai 4 JP/kls semua = 28 JP ⚠ data bilang 23
 *           → kemungkinan beberapa kelas 3 JP: 5×4 + 1×3 = 23? Tidak pas.
 *           → pakai: IX-1..4 (4×4=16) + VIII-2,3,4 (3×? = 7) → tidak bulat
 *           → KEPUTUSAN: pakai 4 JP/kls semua, totalnya 28 JP (ikut standar)
 * PK  BIND  4 kls, total 24 JP  → 6 JP/kls (24 JP)  ✅
 * RA  IPA   5 kls, total 25 JP  → 5 JP/kls (25 JP)  ✅
 * RJ  BMR+SBK VII-1,2,3
 *           BMR VII-1,2,3 = 3×2=6, SBK VII-1 = 3 → total 9 JP ✅
 * SO  MTK   3 kls, total 15 JP  → 5 JP/kls (15 JP)  ✅
 * SF  PAI   8 kls, total 24 JP  → 3 JP/kls (24 JP)  ✅
 * SY  PAI+PPKN VII-1,2,3
 *           PAI 3×3=9, PPKN 3×3=9 → total 18 JP ✅
 * TN  BIND  4 kls, total 24 JP  → 6 JP/kls (24 JP)  ✅
 * YR  PJOK  3 kls, total  9 JP  → 3 JP/kls  (9 JP)  ✅
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── JP standar per mapel ─────────────────────────────────────────────────────
const JP: Record<string, number> = {
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

// ─── Data guru (upsert) ───────────────────────────────────────────────────────
const GURU: {
  kode: string;
  nama: string;
  totalJp: number | null;
  status: "PNS" | "HONOR";
}[] = [
  { kode: "AM", nama: "Anjar Sari Maharani, S.Pd",             totalJp: 27,   status: "HONOR" },
  { kode: "BF", nama: "Berlianta Fitriani Br Tarigan, S.Pd",   totalJp: 20,   status: "HONOR" },
  { kode: "EM", nama: "Elvrida Monika, S.Pd",                  totalJp: 15,   status: "HONOR" },
  { kode: "MV", nama: "Elvrida Monika, S.Pd (MV)",             totalJp: 11,   status: "HONOR" },
  { kode: "GG", nama: "Gebriel Gultom, S.Pd",                  totalJp: 24,   status: "HONOR" },
  { kode: "ES", nama: "Guru Informatika (ES)",                  totalJp: 22,   status: "HONOR" },
  { kode: "IN", nama: "Imam Nirwana, S.Pd",                    totalJp: 29,   status: "PNS"   },
  { kode: "IS", nama: "Iwan Syofianto, S.Pd",                  totalJp: 12,   status: "HONOR" },
  { kode: "MO", nama: "Mangalandong Ompusunggu, S.Pd",         totalJp: 24,   status: "PNS"   },
  { kode: "NW", nama: "Nila Wati, S.Pd",                       totalJp: null, status: "HONOR" },
  { kode: "NL", nama: "Nila Wati, S.Pd (NL)",                  totalJp: null, status: "HONOR" },
  { kode: "NH", nama: "Nurasiah, S.Pd.I",                      totalJp: 24,   status: "PNS"   },
  { kode: "NS", nama: "Nurma Sulistia, SE",                    totalJp: 24,   status: "HONOR" },
  { kode: "NA", nama: "Nurul Almi, SE",                        totalJp: 23,   status: "HONOR" },
  { kode: "PK", nama: "Poni Kemala, S.Pd",                     totalJp: 24,   status: "PNS"   },
  { kode: "RA", nama: "Ratna, SP",                              totalJp: 25,   status: "HONOR" },
  { kode: "RJ", nama: "Rika Juwita, S.Pd",                     totalJp: 9,    status: "HONOR" },
  { kode: "SO", nama: "Surianto, S.Pd",                        totalJp: 15,   status: "HONOR" },
  { kode: "SF", nama: "Syafrudin, S.Pd.I",                     totalJp: 24,   status: "PNS"   },
  { kode: "SY", nama: "Syayaroh Rizki Ibya, S.Pd",             totalJp: 18,   status: "HONOR" },
  { kode: "TN", nama: "Tiurlan Naria, S.Pd",                   totalJp: 24,   status: "PNS"   },
  { kode: "YR", nama: "Yunita Rosadi, S.Pd",                   totalJp: 9,    status: "HONOR" },
];

// ─── Beban mengajar ───────────────────────────────────────────────────────────
// Format: [kodeGuru, kodeMapel, jp_per_kelas, ...namaKelas]
type B = [string, string, number, ...string[]];

const BEBAN: B[] = [
  // AM — MTK: IX-1,IX-2,IX-3,IX-4,VIII-4 (5 kelas × 5 = 25 JP) ⚠ data=27
  ["AM", "MTK", 5, "IX-1", "IX-2", "IX-3", "IX-4", "VIII-4"],

  // BF — IPS: VII-1,VII-2,VII-3,VIII-1,VIII-3 (5 × 4 = 20 JP) ✅
  ["BF", "IPS", 4, "VII-1", "VII-2", "VII-3", "VIII-1", "VIII-3"],

  // EM — MTK: VII-1,VII-2,VII-3 (3 × 5 = 15 JP) ✅
  ["EM", "MTK", 5, "VII-1", "VII-2", "VII-3"],

  // MV — BMR: VIII-1,VIII-2,VIII-3,VIII-4 (4 × 2 = 8 JP)
  //         + SBK: VII-3 (1 × 3 = 3 JP) → total 11 JP ✅
  ["MV", "BMR", 2, "VIII-1", "VIII-2", "VIII-3", "VIII-4"],
  ["MV", "SBK", 3, "VII-3"],

  // GG — BING: IX-1,IX-2,IX-3,IX-4,VIII-3,VIII-4 (6 × 4 = 24 JP) ✅
  ["GG", "BING", 4, "IX-1", "IX-2", "IX-3", "IX-4", "VIII-3", "VIII-4"],

  // ES — INFO: semua 11 kelas (11 × 2 = 22 JP) ✅
  ["ES", "INFO", 2,
    "IX-1", "IX-2", "IX-3", "IX-4",
    "VII-1", "VII-2", "VII-3",
    "VIII-1", "VIII-2", "VIII-3", "VIII-4"],

  // IN — IPA: VII-1,VII-2,VII-3,VIII-1,VIII-2,VIII-3 (6 × 5 = 30 JP) ⚠ data=29
  ["IN", "IPA", 5, "VII-1", "VII-2", "VII-3", "VIII-1", "VIII-2", "VIII-3"],

  // IS — BING: VII-1,VII-2,VII-3 (3 × 4 = 12 JP) ✅
  ["IS", "BING", 4, "VII-1", "VII-2", "VII-3"],

  // MO — PJOK: IX-1,IX-2,IX-3,IX-4,VII-2,VIII-2,VIII-3,VIII-4 (8 × 3 = 24 JP) ✅
  ["MO", "PJOK", 3, "IX-1", "IX-2", "IX-3", "IX-4", "VII-2", "VIII-2", "VIII-3", "VIII-4"],

  // NW — BMR: IX-1,IX-2,IX-3,IX-4 (4 × 2 = 8 JP) ✅
  ["NW", "BMR", 2, "IX-1", "IX-2", "IX-3", "IX-4"],

  // NL — SBK: VII-2 (1 × 3 = 3 JP) ✅
  ["NL", "SBK", 3, "VII-2"],

  // NH — PPKN: IX-1,IX-2,IX-3,IX-4,VIII-1,VIII-2,VIII-3,VIII-4 (8 × 3 = 24 JP) ✅
  ["NH", "PPKN", 3, "IX-1", "IX-2", "IX-3", "IX-4", "VIII-1", "VIII-2", "VIII-3", "VIII-4"],

  // NS — SBK: IX-1,IX-2,IX-3,IX-4,VIII-1,VIII-2,VIII-3,VIII-4 (8 × 3 = 24 JP) ✅
  ["NS", "SBK", 3, "IX-1", "IX-2", "IX-3", "IX-4", "VIII-1", "VIII-2", "VIII-3", "VIII-4"],

  // NA — IPS: IX-1,IX-2,IX-3,IX-4,VIII-2,VIII-3,VIII-4 (7 × 4 = 28 JP) ⚠ data=23
  ["NA", "IPS", 4, "IX-1", "IX-2", "IX-3", "IX-4", "VIII-2", "VIII-3", "VIII-4"],

  // PK — BIND: IX-1,IX-2,IX-3,IX-4 (4 × 6 = 24 JP) ✅
  ["PK", "BIND", 6, "IX-1", "IX-2", "IX-3", "IX-4"],

  // RA — IPA: IX-1,IX-2,IX-3,IX-4,VIII-4 (5 × 5 = 25 JP) ✅
  ["RA", "IPA", 5, "IX-1", "IX-2", "IX-3", "IX-4", "VIII-4"],

  // RJ — SBK: VII-1 (3 JP) + BMR: VII-1,VII-2,VII-3 (6 JP) = 9 JP ✅
  ["RJ", "SBK", 3, "VII-1"],
  ["RJ", "BMR", 2, "VII-1", "VII-2", "VII-3"],

  // SO — MTK: VIII-1,VIII-2,VIII-3 (3 × 5 = 15 JP) ✅
  ["SO", "MTK", 5, "VIII-1", "VIII-2", "VIII-3"],

  // SF — PAI: IX-1,IX-2,IX-3,IX-4,VIII-1,VIII-2,VIII-3,VIII-4 (8 × 3 = 24 JP) ✅
  ["SF", "PAI", 3, "IX-1", "IX-2", "IX-3", "IX-4", "VIII-1", "VIII-2", "VIII-3", "VIII-4"],

  // SY — PAI: VII-1,VII-2,VII-3 (3 × 3 = 9 JP)
  //         + PPKN: VII-1,VII-2,VII-3 (3 × 3 = 9 JP) = 18 JP ✅
  ["SY", "PAI",  3, "VII-1", "VII-2", "VII-3"],
  ["SY", "PPKN", 3, "VII-1", "VII-2", "VII-3"],

  // TN — BIND: VIII-1,VIII-2,VIII-3,VIII-4 (4 × 6 = 24 JP) ✅
  ["TN", "BIND", 6, "VIII-1", "VIII-2", "VIII-3", "VIII-4"],

  // YR — PJOK: VII-1,VII-3,VIII-1 (3 × 3 = 9 JP) ✅
  ["YR", "PJOK", 3, "VII-1", "VII-3", "VIII-1"],
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═".repeat(70));
  console.log("  SEED BEBAN MENGAJAR v3 — Data Resmi Terbaru");
  console.log("═".repeat(70));

  // ── Step 1: Hapus beban lama (non-locked) & upsert guru ──────────────────
  console.log("\n▶ STEP 1 — Upsert guru\n");
  for (const g of GURU) {
    await prisma.guru.upsert({
      where:  { kodeGuru: g.kode },
      update: { nama: g.nama, status: g.status, maksJp: g.totalJp },
      create: { kodeGuru: g.kode, nama: g.nama, status: g.status, maksJp: g.totalJp },
    });
    console.log(`  ✅ [${g.kode.padEnd(3)}] ${g.nama} — maks ${g.totalJp ?? "∞"} JP`);
  }

  // ── Step 2: Cari periode aktif ────────────────────────────────────────────
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) {
    console.error("\n❌ Tidak ada periode aktif. Buat dulu di /admin/master/periode-akademik");
    process.exit(1);
  }
  console.log(`\n  📅 Periode: ${periode.tahun} ${periode.semester}\n`);

  // ── Step 3: Lookup maps ───────────────────────────────────────────────────
  const [guruRows, mapelRows, kelasRows] = await Promise.all([
    prisma.guru.findMany(),
    prisma.mapel.findMany(),
    prisma.kelas.findMany(),
  ]);
  const guruMap  = new Map(guruRows.map((r) => [r.kodeGuru,  r.id]));
  const mapelMap = new Map(mapelRows.map((r) => [r.kodeMapel, r.id]));
  const kelasMap = new Map(kelasRows.map((r) => [r.namaKelas, r.id]));

  // ── Step 4: Hapus semua beban lama yang tidak punya jadwal terkunci ───────
  console.log("▶ STEP 2 — Bersihkan beban lama (tanpa jadwal locked)\n");

  const bebanLama = await prisma.bebanMengajar.findMany({
    where: { periodeAkademikId: periode.id },
    include: { _count: { select: { jadwal: { where: { isLocked: true } } } } },
  });

  let hapus = 0, pertahankan = 0;
  for (const b of bebanLama) {
    if (b._count.jadwal > 0) {
      console.log(`  🔒 PERTAHANKAN beban ${b.id} (ada ${b._count.jadwal} jadwal locked)`);
      pertahankan++;
    } else {
      await prisma.jadwal.deleteMany({ where: { bebanMengajarId: b.id } });
      await prisma.bebanMengajar.delete({ where: { id: b.id } });
      hapus++;
    }
  }
  console.log(`  → Dihapus: ${hapus}, Dipertahankan (locked): ${pertahankan}\n`);

  // ── Step 5: Insert beban baru ─────────────────────────────────────────────
  console.log("▶ STEP 3 — Insert beban mengajar\n");

  let ok = 0, err = 0;

  for (const [kodeGuru, kodeMapel, jpPerKelas, ...kelasList] of BEBAN) {
    const guruId  = guruMap.get(kodeGuru);
    const mapelId = mapelMap.get(kodeMapel);

    if (!guruId)  { console.error(`  ❌ Guru [${kodeGuru}] tidak ada di DB`);   err++; continue; }
    if (!mapelId) { console.error(`  ❌ Mapel [${kodeMapel}] tidak ada di DB`); err++; continue; }

    for (const namaKelas of kelasList) {
      const kelasId = kelasMap.get(namaKelas);
      if (!kelasId) {
        console.warn(`  ⚠️  Kelas [${namaKelas}] tidak ditemukan — lewati`);
        err++; continue;
      }

      // Cek konflik: mapel sama di kelas ini dipegang guru lain yang punya jadwal locked
      const konflikLocked = await prisma.bebanMengajar.findFirst({
        where: {
          kelasId, mapelId, periodeAkademikId: periode.id,
          NOT: { guruId },
          jadwal: { some: { isLocked: true } },
        },
        include: { guru: true },
      });
      if (konflikLocked) {
        console.warn(
          `  ⚠️  LEWATI [${kodeGuru}] ${namaKelas}/${kodeMapel}` +
          ` — masih dipegang [${konflikLocked.guru.kodeGuru}] dengan jadwal terkunci`
        );
        err++; continue;
      }

      try {
        await prisma.bebanMengajar.upsert({
          where: {
            guruId_kelasId_mapelId_periodeAkademikId: {
              guruId, kelasId, mapelId, periodeAkademikId: periode.id,
            },
          },
          update: { jp: jpPerKelas },
          create: { guruId, kelasId, mapelId, jp: jpPerKelas, periodeAkademikId: periode.id },
        });
        console.log(`  ✅ [${kodeGuru.padEnd(3)}] ${namaKelas.padEnd(7)} ${kodeMapel.padEnd(5)} ${jpPerKelas} JP`);
        ok++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`  ❌ [${kodeGuru}] ${namaKelas} ${kodeMapel}: ${msg}`);
        err++;
      }
    }
  }

  // ── Step 6: Verifikasi ────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(70));
  console.log("▶ STEP 4 — Verifikasi Total JP per Guru");
  console.log("═".repeat(70));

  const warnings: string[] = [];

  for (const g of GURU.sort((a, b) => a.kode.localeCompare(b.kode))) {
    const guruId = guruMap.get(g.kode);
    if (!guruId) continue;

    const beban = await prisma.bebanMengajar.findMany({
      where:   { guruId, periodeAkademikId: periode.id },
      include: { mapel: true, kelas: true },
    });
    if (beban.length === 0) continue;

    const totalJp  = beban.reduce((s, b) => s + b.jp, 0);
    const target   = g.totalJp;
    let   flag     = "✅";
    if (target !== null) {
      if (totalJp > target)       { flag = "🔴 LEBIH"; warnings.push(`[${g.kode}] total ${totalJp} > target ${target}`); }
      else if (totalJp < target)  { flag = "🟡 KURANG"; warnings.push(`[${g.kode}] total ${totalJp} < target ${target}`); }
    }

    const detail = beban
      .sort((a, b) => a.kelas.namaKelas.localeCompare(b.kelas.namaKelas))
      .map((b) => `${b.kelas.namaKelas}/${b.mapel.kodeMapel}(${b.jp})`)
      .join(", ");

    console.log(
      `\n  [${g.kode.padEnd(3)}] ${g.nama.padEnd(46)}` +
      `${String(totalJp).padStart(3)} JP / target ${target ?? "∞"} JP  ${flag}`
    );
    console.log(`         ${detail}`);
  }

  // ── Ringkasan ─────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(70));
  console.log(`  ✅ Berhasil : ${ok}`);
  console.log(`  ❌ Error    : ${err}`);

  if (warnings.length > 0) {
    console.log("\n  ⚠️  PERBEDAAN TOTAL JP (data vs standar JP × jumlah kelas):");
    for (const w of warnings) console.log(`     ${w}`);
    console.log("\n  Penyebab umum:");
    console.log("     • AM  MTK  : data=27, dihitung=25 (5 kls × 5 JP)");
    console.log("     • IN  IPA  : data=29, dihitung=30 (6 kls × 5 JP)");
    console.log("     • NA  IPS  : data=23, dihitung=28 (7 kls × 4 JP)");
    console.log("  → Sesuaikan manual di /admin/beban-mengajar jika perlu.");
  } else {
    console.log("\n  ✅ Semua total JP sesuai target.");
  }
  console.log("═".repeat(70));
}

main()
  .catch((e) => { console.error("❌ Fatal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
