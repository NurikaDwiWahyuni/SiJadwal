/**
 * Diagnostic script: scan SEMUA guru untuk cari sisa referensi
 * (di tabel lain) yang menyebabkan tx.guru.delete() gagal dengan
 * "Foreign key constraint violated".
 *
 * Cara jalankan (dari root project D:\app\roster):
 *   npx tsx scripts/diagnose-guru.ts
 *
 * Kalau belum ada "tsx", install dulu:
 *   npm install -D tsx
 */

import { prisma } from "../lib/prisma";

async function main() {
  const allGuru = await prisma.guru.findMany({
    select: { id: true, kodeGuru: true, nama: true },
  });

  console.log(`Total guru: ${allGuru.length}\n`);

  let bermasalah = 0;

  for (const g of allGuru) {
    const [
      bebanCount,
      jadwalLangsung,
      jadwalLewatBeban,
      piketCount,
      kelasWaliCount,
      ekskulCount,
    ] = await Promise.all([
      prisma.bebanMengajar.count({ where: { guruId: g.id } }),
      prisma.jadwal.count({ where: { guruId: g.id } }),
      prisma.jadwal.count({
        where: { bebanMengajar: { guruId: g.id } },
      }),
      prisma.piketGuru.count({ where: { guruId: g.id } }),
      prisma.kelas.count({ where: { waliKelasId: g.id } }),
      prisma.ekstrakurikuler.count({ where: { pembinaId: g.id } }),
    ]);

    const total = bebanCount + jadwalLangsung + jadwalLewatBeban + piketCount;

    if (total > 0 || kelasWaliCount > 0 || ekskulCount > 0) {
      bermasalah++;
      console.log(`⚠️  ${g.kodeGuru} - ${g.nama} (id: ${g.id})`);
      console.log(
        `    bebanMengajar=${bebanCount} jadwal(guruId)=${jadwalLangsung} jadwal(lewat bebanMengajarId)=${jadwalLewatBeban} piket=${piketCount} kelasWali=${kelasWaliCount} ekskul=${ekskulCount}`
      );
    }
  }

  console.log(
    `\nSelesai. ${bermasalah} dari ${allGuru.length} guru punya relasi (ini NORMAL untuk guru yang masih aktif/dipakai). ` +
      `Yang perlu dicurigai adalah kalau ada guru yang KAMU YAKIN sudah "bersih"/tidak terpakai, tapi tetap gagal dihapus dengan error FK.`
  );

  console.log("\n=== FK constraints yang mengarah ke tabel `guru` (struktur asli di DB) ===");
  const fkRows: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      kcu.TABLE_NAME, kcu.COLUMN_NAME, kcu.CONSTRAINT_NAME,
      rc.DELETE_RULE, rc.UPDATE_RULE
    FROM information_schema.KEY_COLUMN_USAGE kcu
    JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
      ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
    WHERE kcu.TABLE_SCHEMA = DATABASE()
      AND kcu.REFERENCED_TABLE_NAME = 'guru';
  `);
  console.table(fkRows);
}

main()
  .catch((e) => {
    console.error("Script error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
