/**
 * seed-mapel.ts
 * Update jpMaksBerurutan & jumlahPertemuanMaks per mapel sesuai aturan:
 *
 *   JP/minggu = 2 → tidak boleh dipisah          → jpMaksBerurutan=2, pertemuanMaks=1
 *   JP/minggu = 3 → boleh [3] atau [2,1]          → jpMaksBerurutan=3, pertemuanMaks=2
 *   JP/minggu = 4 → [2,2]                         → jpMaksBerurutan=2, pertemuanMaks=2
 *   JP/minggu = 5 → [3,2]                         → jpMaksBerurutan=3, pertemuanMaks=2
 *   JP/minggu = 6 → [3,3]                         → jpMaksBerurutan=3, pertemuanMaks=2
 *
 * Jalankan: npx tsx prisma/seed-mapel.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

//
// jpMaksBerurutan = ukuran sesi TERBESAR yang boleh ada dalam satu blok
// jumlahPertemuanMaks = berapa kali mapel boleh muncul dalam seminggu (jumlah sesi)
//
// Mapel      JP/minggu  Pembagian   jpMaksBerurutan  pertemuanMaks
// ─────────────────────────────────────────────────────────────────
// PPKN       3          [3]|[2,1]   3                2
// MTK        5          [3,2]       3                2
// BIND       6          [3,3]       3                2
// BING       4          [2,2]       2                2
// IPA        5          [3,2]       3                2
// IPS        4          [2,2]       2                2
// INFO       2          [2]         2                1
// PJOK       3          [3]|[2,1]   3                2
// SBK        3          [3]|[2,1]   3                2
// PAI        3          [3]|[2,1]   3                2
// BMR        2          [2]         2                1
//

const MAPEL_UPDATE = [
  { kode: "PPKN", jpMaksBerurutan: 3, jumlahPertemuanMaks: 2 },
  { kode: "MTK",  jpMaksBerurutan: 3, jumlahPertemuanMaks: 2 },
  { kode: "BIND", jpMaksBerurutan: 3, jumlahPertemuanMaks: 2 },
  { kode: "BING", jpMaksBerurutan: 2, jumlahPertemuanMaks: 2 },
  { kode: "IPA",  jpMaksBerurutan: 3, jumlahPertemuanMaks: 2 },
  { kode: "IPS",  jpMaksBerurutan: 2, jumlahPertemuanMaks: 2 },
  { kode: "INFO", jpMaksBerurutan: 2, jumlahPertemuanMaks: 1 },
  { kode: "PJOK", jpMaksBerurutan: 3, jumlahPertemuanMaks: 2 },
  { kode: "SBK",  jpMaksBerurutan: 3, jumlahPertemuanMaks: 2 },
  { kode: "PAI",  jpMaksBerurutan: 3, jumlahPertemuanMaks: 2 },
  { kode: "BMR",  jpMaksBerurutan: 2, jumlahPertemuanMaks: 1 },
];

async function main() {
  console.log("═".repeat(58));
  console.log("  UPDATE jpMaksBerurutan & jumlahPertemuanMaks per Mapel");
  console.log("═".repeat(58));

  for (const m of MAPEL_UPDATE) {
    const existing = await prisma.mapel.findUnique({ where: { kodeMapel: m.kode } });
    if (!existing) {
      console.warn(`  ⚠️  [${m.kode}] tidak ditemukan di DB — lewati`);
      continue;
    }

    await prisma.mapel.update({
      where: { kodeMapel: m.kode },
      data: {
        jpMaksBerurutan:     m.jpMaksBerurutan,
        jumlahPertemuanMaks: m.jumlahPertemuanMaks,
      },
    });

    const sebelum = `max=${existing.jpMaksBerurutan} pertemuan=${existing.jumlahPertemuanMaks}`;
    const sesudah = `max=${m.jpMaksBerurutan} pertemuan=${m.jumlahPertemuanMaks}`;
    const changed = existing.jpMaksBerurutan !== m.jpMaksBerurutan ||
                    existing.jumlahPertemuanMaks !== m.jumlahPertemuanMaks;

    console.log(
      `  ${changed ? "✏️  UPDATE" : "✅ SAMA  "} [${m.kode.padEnd(5)}]  ${sebelum}  →  ${sesudah}`
    );
  }

  console.log("\n" + "═".repeat(58));
  console.log("  Verifikasi akhir:");
  console.log("═".repeat(58));

  const semua = await prisma.mapel.findMany({ orderBy: { kodeMapel: "asc" } });
  for (const m of semua) {
    console.log(
      `  [${m.kodeMapel.padEnd(5)}] ${m.namaMapel.padEnd(46)}` +
      `jpMaks=${m.jpMaksBerurutan}  pertemuan=${m.jumlahPertemuanMaks}`
    );
  }

  console.log("\n  ✅ Selesai. Jalankan Generate Jadwal ulang agar aturan baru berlaku.");
  console.log("═".repeat(58));
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
