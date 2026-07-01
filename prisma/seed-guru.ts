/**
 * seed-guru.ts
 * Jalankan: npx tsx prisma/seed-guru.ts
 *
 * Update data guru: nama resmi, kode, maksJp, status.
 * Tambah Nurul Almi (NL) yang belum ada.
 * AMAN: hanya upsert berdasarkan kodeGuru, tidak hapus data lain.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Update data guru...\n");

  const guruData = [
    // kodeGuru | nama resmi              | maksJp | status
    { kodeGuru: "SO", nama: "Surianto, S.Pd",                       maksJp: 15,   status: "PNS"   as const },
    { kodeGuru: "RA", nama: "Ratna, SP",                             maksJp: 25,   status: "HONOR" as const },
    { kodeGuru: "TN", nama: "Tiurlan Naria, S.Pd",                   maksJp: 24,   status: "PNS"   as const },
    { kodeGuru: "NH", nama: "Nurasiah, S.Pd.I",                      maksJp: 24,   status: "PNS"   as const },
    { kodeGuru: "NL", nama: "Nurul Almi, SE",                        maksJp: 24,   status: "HONOR" as const }, // ← BARU
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
    // DB (Debesty) tidak ada di daftar resmi — dibiarkan di DB, tidak diubah
  ];

  for (const g of guruData) {
    const result = await prisma.guru.upsert({
      where:  { kodeGuru: g.kodeGuru },
      update: { nama: g.nama, status: g.status, maksJp: g.maksJp },
      create: { kodeGuru: g.kodeGuru, nama: g.nama, status: g.status, maksJp: g.maksJp },
    });
    const tag = result.createdAt === result.updatedAt ? "➕ BARU " : "✏️  UPDATE";
    console.log(`  ${tag} [${g.kodeGuru}] ${g.nama} — maks ${g.maksJp ?? "∞"} JP`);
  }

  // ─── Verifikasi total JP per guru (dari beban mengajar) ─────────
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (periode) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📊 Verifikasi total JP vs Maks JP (periode aktif: ${periode.tahun} ${periode.semester})`);
    console.log(`${"─".repeat(60)}`);

    const semuaGuru = await prisma.guru.findMany({ orderBy: { kodeGuru: "asc" } });
    let adaMasalah = false;

    for (const guru of semuaGuru) {
      const beban = await prisma.bebanMengajar.findMany({
        where: { guruId: guru.id, periodeAkademikId: periode.id },
      });
      const totalJp = beban.reduce((s, b) => s + b.jp, 0);

      if (beban.length === 0) continue; // skip guru tanpa beban

      const maks = guru.maksJp;
      let status = "✅";
      if (maks !== null) {
        if (totalJp > maks) { status = "🔴 MELEBIHI"; adaMasalah = true; }
        else if (totalJp < maks) { status = "🟡 kurang"; }
      }

      console.log(
        `  [${guru.kodeGuru.padEnd(3)}] ${guru.nama.padEnd(40)} Total: ${String(totalJp).padStart(3)} JP  Maks: ${maks !== null ? String(maks).padStart(3) : " ∞ "} JP  ${status}`
      );
    }

    if (!adaMasalah) {
      console.log("\n  ✅ Semua guru dalam batas JP.\n");
    } else {
      console.log("\n  ⚠️  Ada guru yang melebihi maks JP — cek beban mengajar.\n");
    }
  }

  console.log("✅ Selesai.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
