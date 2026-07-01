/**
 * Script: input-beban.ts
 * Jalankan dengan: npx ts-node --skip-project prisma/input-beban.ts
 * 
 * Input beban mengajar berdasarkan data guru-mapel-kelas.
 * Script ini AMAN: menggunakan upsert, tidak akan hapus data lain.
 * 
 * CATATAN JP PER MAPEL (standar SMP, sesuaikan jika berbeda):
 *   Matematika      → 5 JP/minggu
 *   Bahasa Indonesia→ 6 JP/minggu
 *   Bahasa Inggris  → 4 JP/minggu
 *   IPA             → 5 JP/minggu
 *   IPS             → 4 JP/minggu
 *   PPKN            → 3 JP/minggu
 *   Pendidikan Agama→ 3 JP/minggu
 *   PJOK            → 3 JP/minggu
 *   SBK             → 3 JP/minggu
 *   Informatika     → 2 JP/minggu
 *   BMR             → 2 JP/minggu
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── JP default per kode mapel ───────────────────────────────────────────────
const JP_DEFAULT: Record<string, number> = {
  MTK:  5,
  BIN:  6,
  BIG:  4,
  IPA:  5,
  IPS:  4,
  PPKN: 3,
  PAI:  3,
  PJOK: 3,
  SBK:  3,
  INFO: 2,
  BMR:  2,
};

// ─── Data beban mengajar ──────────────────────────────────────────────────────
// Format: [kodeGuru, kodeMapel, ...namaKelas]
// Guru dengan kode "*" = placeholder, akan dibuat otomatis jika belum ada.
const BEBAN_DATA: [string, string, ...string[]][] = [
  // Guru tetap
  ["SO",  "MTK",  "VIII-1", "VIII-2", "VIII-3"],
  ["RA",  "IPA",  "VIII-4", "IX-1",   "IX-2",  "IX-3", "IX-4"],
  ["TN",  "BIN",  "VIII-1", "VIII-2", "VIII-3", "VIII-4"],
  ["NH",  "PPKN", "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],
  ["IS",  "BIG",  "VII-1",  "VII-2",  "VII-3"],
  ["PK",  "BIN",  "IX-1",   "IX-2",   "IX-3",  "IX-4"],
  ["MO",  "PJOK", "VII-2",  "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],
  ["GG",  "BIG",  "VIII-3", "VIII-4", "IX-1",   "IX-2", "IX-3", "IX-4"],
  ["SF",  "PAI",  "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],
  ["YR",  "PJOK", "VII-1",  "VII-3",  "VIII-1"],
  ["NS",  "SBK",  "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],
  ["IN",  "IPA",  "VII-1",  "VII-2",  "VII-3",  "VIII-1", "VIII-2", "VIII-3"],
  ["NW",  "BMR",  "IX-1",   "IX-2",   "IX-3",   "IX-4"],
  ["BF",  "IPS",  "VII-1",  "VII-2",  "VII-3",  "VIII-1", "VIII-3"],
  ["AM",  "MTK",  "VIII-4", "IX-1",   "IX-2",   "IX-3", "IX-4"],
  ["EM",  "MTK",  "VII-1",  "VII-2",  "VII-3"],

  // Guru placeholder (kode SY, ES, RJ, MV, NL)
  ["SY",  "PPKN", "VII-1",  "VII-2",  "VII-3"],
  ["SY",  "PAI",  "VII-1",  "VII-2",  "VII-3"],
  ["ES",  "INFO", "VII-1",  "VII-2",  "VII-3",  "VIII-1", "VIII-2", "VIII-3", "VIII-4", "IX-1", "IX-2", "IX-3", "IX-4"],
  ["RJ",  "SBK",  "VII-1"],
  ["RJ",  "BMR",  "VII-1",  "VII-2",  "VII-3"],
  ["MV",  "SBK",  "VII-3"],
  ["MV",  "BMR",  "VIII-1", "VIII-2", "VIII-3", "VIII-4"],
  ["NL",  "SBK",  "VII-2"],
];

// Nama placeholder untuk kode yang belum ada di database
const PLACEHOLDER_NAMA: Record<string, string> = {
  SY: "Guru SY (Belum Ditentukan)",
  ES: "Guru ES (Belum Ditentukan)",
  RJ: "Guru RJ (Belum Ditentukan)",
  MV: "Guru MV (Belum Ditentukan)",
  NL: "Guru NL (Belum Ditentukan)",
};

async function main() {
  console.log("🔄 Memulai input beban mengajar...\n");

  // Ambil periode aktif
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) {
    console.error("❌ Tidak ada periode akademik aktif. Buat dulu di aplikasi.");
    process.exit(1);
  }
  console.log(`📅 Periode aktif: ${periode.tahun} ${periode.semester}\n`);

  // Pastikan semua guru ada (buat placeholder jika belum)
  const kodeGuruDibutuhkan = [...new Set(BEBAN_DATA.map(([kode]) => kode))];
  const guruMap: Record<string, string> = {};

  for (const kode of kodeGuruDibutuhkan) {
    let guru = await prisma.guru.findUnique({ where: { kodeGuru: kode } });
    if (!guru) {
      const nama = PLACEHOLDER_NAMA[kode] ?? `Guru ${kode}`;
      guru = await prisma.guru.create({
        data: { kodeGuru: kode, nama, status: "HONOR" },
      });
      console.log(`  ➕ Guru baru dibuat: [${kode}] ${nama}`);
    }
    guruMap[kode] = guru.id;
  }

  // Ambil semua mapel
  const mapelList = await prisma.mapel.findMany();
  const mapelMap: Record<string, string> = {};
  for (const m of mapelList) mapelMap[m.kodeMapel] = m.id;

  // Ambil semua kelas
  const kelasList = await prisma.kelas.findMany();
  const kelasMap: Record<string, string> = {};
  for (const k of kelasList) kelasMap[k.namaKelas] = k.id;

  // Input beban mengajar
  let berhasil = 0;
  let dilewati = 0;
  let gagal = 0;

  for (const [kodeGuru, kodeMapel, ...namaKelasList] of BEBAN_DATA) {
    const guruId = guruMap[kodeGuru];
    const mapelId = mapelMap[kodeMapel];
    const jp = JP_DEFAULT[kodeMapel] ?? 2;

    if (!guruId) { console.warn(`  ⚠️  Guru [${kodeGuru}] tidak ditemukan`); gagal++; continue; }
    if (!mapelId) { console.warn(`  ⚠️  Mapel [${kodeMapel}] tidak ditemukan`); gagal++; continue; }

    for (const namaKelas of namaKelasList) {
      const kelasId = kelasMap[namaKelas];
      if (!kelasId) { console.warn(`  ⚠️  Kelas [${namaKelas}] tidak ditemukan`); gagal++; continue; }

      try {
        // Cek apakah sudah ada beban di kelas+mapel ini oleh guru LAIN
        const existing = await prisma.bebanMengajar.findFirst({
          where: { kelasId, mapelId, periodeAkademikId: periode.id },
          include: { guru: true },
        });

        if (existing && existing.guruId !== guruId) {
          // Sudah diisi guru lain — cek apakah ada jadwal
          const jadwalCount = await prisma.jadwal.count({ where: { bebanMengajarId: existing.id } });
          if (jadwalCount > 0) {
            console.warn(
              `  ⚠️  LEWATI: ${namaKelas} - ${kodeMapel} sudah dipegang [${existing.guru.kodeGuru}] & ada jadwal`
            );
            dilewati++;
            continue;
          }
          // Hapus dulu, lalu buat ulang dengan guru baru
          await prisma.bebanMengajar.delete({ where: { id: existing.id } });
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
          create: { guruId, kelasId, mapelId, jp, periodeAkademikId: periode.id },
        });

        console.log(`  ✅ ${namaKelas} | ${kodeMapel} | [${kodeGuru}] | ${jp} JP`);
        berhasil++;
      } catch (err) {
        console.error(`  ❌ Gagal: ${namaKelas} - ${kodeMapel} [${kodeGuru}]:`, err);
        gagal++;
      }
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Berhasil : ${berhasil}`);
  console.log(`⚠️  Dilewati : ${dilewati}`);
  console.log(`❌ Gagal    : ${gagal}`);
  console.log(`${"─".repeat(50)}`);
  console.log("\nSelesai! Cek aplikasi di Master Data → Beban Mengajar.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
