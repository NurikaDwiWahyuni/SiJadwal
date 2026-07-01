/**
 * prisma/seed-data.ts
 * Seed data awal: Guru, Kelas, Mapel, Ekstrakurikuler
 *
 * Jalankan dengan:
 *   npx tsx prisma/seed-data.ts
 */

import { PrismaClient, StatusGuru } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

const GURU_LIST = [
  { kode: "SO", nama: "Surianto, S.Pd",                        jp: 15,   status: "HONOR" },
  { kode: "RA", nama: "Ratna, SP",                              jp: 25,   status: "HONOR" },
  { kode: "TN", nama: "Tiurlan Naria, S.Pd",                   jp: 24,   status: "HONOR" },
  { kode: "NH", nama: "Nurasiah, S.Pd.I",                      jp: 24,   status: "HONOR" },
  { kode: "IS", nama: "Iwan Syofianto, S.Pd",                  jp: 16,   status: "HONOR" },
  { kode: "PK", nama: "Poni Kemala, S.Pd",                     jp: 24,   status: "HONOR" },
  { kode: "MO", nama: "Mangalandong Ompusunggu, S.Pd",         jp: 24,   status: "HONOR" },
  { kode: "GG", nama: "Gebriel Gultom, S.Pd",                  jp: 28,   status: "HONOR" },
  { kode: "SF", nama: "Syafrudin, S.Pd.I",                     jp: 24,   status: "HONOR" },
  { kode: "YR", nama: "Yunita Rosadi, S.Pd",                   jp: 17,   status: "HONOR" },
  { kode: "NS", nama: "Nurma Sulistia, SE",                    jp: 24,   status: "HONOR" },
  { kode: "IN", nama: "Imam Nirwana, S.Pd",                    jp: 25,   status: "HONOR" },
  { kode: "NW", nama: "Nila Wati, S.Pd",                       jp: null, status: "HONOR" },
  { kode: "BF", nama: "Berlianta Fitriani Br Tarigan, S.Pd",   jp: 20,   status: "HONOR" },
  { kode: "AM", nama: "Anjar Sari Maharani, S.Pd",             jp: 20,   status: "HONOR" },
  { kode: "SR", nama: "Syayaroh Rizki Ibya, S.Pd",             jp: 18,   status: "HONOR" },
  { kode: "EM", nama: "Elfrida Monika, S.Pd",                  jp: 22,   status: "HONOR" },
  { kode: "LA", nama: "Lisa Arianti, S.Pd",                    jp: 26,   status: "HONOR" },
  { kode: "DB", nama: "Debesty",                                jp: null, status: "HONOR" },
];

const KELAS_LIST = [
  "VII-1", "VII-2", "VII-3",
  "VIII-1", "VIII-2", "VIII-3", "VIII-4",
  "IX-1", "IX-2", "IX-3", "IX-4",
];

const MAPEL_LIST = [
  { nama: "Pendidikan Pancasila dan Kewarganegaraan", kode: "PPKN",   jpMax: 2, pertemuanMax: 3 },
  { nama: "Matematika",                               kode: "MTK",    jpMax: 2, pertemuanMax: 3 },
  { nama: "Bahasa Indonesia",                         kode: "BIND",   jpMax: 2, pertemuanMax: 3 },
  { nama: "Bahasa Inggris",                           kode: "BING",   jpMax: 2, pertemuanMax: 3 },
  { nama: "IPA",                                      kode: "IPA",    jpMax: 2, pertemuanMax: 3 },
  { nama: "IPS",                                      kode: "IPS",    jpMax: 2, pertemuanMax: 3 },
  { nama: "Informatika",                              kode: "INFO",   jpMax: 2, pertemuanMax: 2 },
  { nama: "PJOK",                                     kode: "PJOK",   jpMax: 2, pertemuanMax: 2 },
  { nama: "Seni Budaya",                              kode: "SBK",    jpMax: 2, pertemuanMax: 2 },
  { nama: "Pendidikan Agama Islam",                   kode: "PAI",    jpMax: 2, pertemuanMax: 3 },
  { nama: "BMR",                                      kode: "BMR",    jpMax: 2, pertemuanMax: 2 },
];

// Ekstrakurikuler + pembina (nama guru, bukan kode — dicocokkan saat insert)
const EKSKUL_LIST: {
  nama: string;
  hari: "SABTU";
  jamMulai: string;
  jamSelesai: string;
  pembina: string[]; // array nama guru
}[] = [
  {
    nama: "Pramuka",
    hari: "SABTU", jamMulai: "07:30", jamSelesai: "09:30",
    pembina: ["Iwan Syofianto, S.Pd", "Lisa Arianti, S.Pd", "Syayaroh Rizki Ibya, S.Pd"],
  },
  {
    nama: "Bola Voli",
    hari: "SABTU", jamMulai: "07:30", jamSelesai: "09:30",
    pembina: ["Yunita Rosadi, S.Pd"],
  },
  {
    nama: "Bulu Tangkis",
    hari: "SABTU", jamMulai: "07:30", jamSelesai: "09:30",
    pembina: ["Yunita Rosadi, S.Pd"],
  },
  {
    nama: "Futsal",
    hari: "SABTU", jamMulai: "07:30", jamSelesai: "09:30",
    pembina: ["Surianto, S.Pd"],
  },
  {
    nama: "Keterampilan dan Seni",
    hari: "SABTU", jamMulai: "07:30", jamSelesai: "09:30",
    pembina: ["Elfrida Monika, S.Pd", "Nurma Sulistia, SE"],
  },
  {
    nama: "Nasyid",
    hari: "SABTU", jamMulai: "07:30", jamSelesai: "09:30",
    pembina: ["Nurasiah, S.Pd.I"],
  },
  {
    nama: "Seni Baca Al-Qur'an dan Al-Kitab",
    hari: "SABTU", jamMulai: "07:30", jamSelesai: "09:30",
    pembina: ["Syayaroh Rizki Ibya, S.Pd"],
  },
  {
    nama: "PMR",
    hari: "SABTU", jamMulai: "07:30", jamSelesai: "09:30",
    pembina: ["Lisa Arianti, S.Pd"],
  },
];

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log("🌱 Memulai seeding...\n");

  // ── 1. Guru ──────────────────────────────────
  console.log("👤 Memasukkan data guru...");
  let guruBaru = 0, guruSkip = 0;
  for (const g of GURU_LIST) {
    const existing = await prisma.guru.findUnique({ where: { kodeGuru: g.kode } });
    if (existing) { guruSkip++; continue; }
    await prisma.guru.create({
      data: {
        kodeGuru: g.kode,
        nama: g.nama,
        status: g.status as StatusGuru,
        maksJp: g.jp ?? null,
      },
    });
    guruBaru++;
    console.log(`   ✅ ${g.kode} — ${g.nama}`);
  }
  if (guruSkip > 0) console.log(`   ⏭  ${guruSkip} guru sudah ada, dilewati.`);

  // ── 2. Kelas ─────────────────────────────────
  console.log("\n🏫 Memasukkan data kelas...");
  let kelasBaru = 0, kelasSkip = 0;
  for (const nama of KELAS_LIST) {
    const existing = await prisma.kelas.findUnique({ where: { namaKelas: nama } });
    if (existing) { kelasSkip++; continue; }
    await prisma.kelas.create({ data: { namaKelas: nama } });
    kelasBaru++;
    console.log(`   ✅ ${nama}`);
  }
  if (kelasSkip > 0) console.log(`   ⏭  ${kelasSkip} kelas sudah ada, dilewati.`);

  // ── 3. Mapel ─────────────────────────────────
  console.log("\n📚 Memasukkan data mata pelajaran...");
  let mapelBaru = 0, mapelSkip = 0;
  for (const m of MAPEL_LIST) {
    const existing = await prisma.mapel.findUnique({ where: { kodeMapel: m.kode } });
    if (existing) { mapelSkip++; continue; }
    await prisma.mapel.create({
      data: {
        namaMapel: m.nama,
        kodeMapel: m.kode,
        jpMaksBerurutan: m.jpMax,
        jumlahPertemuanMaks: m.pertemuanMax,
      },
    });
    mapelBaru++;
    console.log(`   ✅ ${m.kode} — ${m.nama}`);
  }
  if (mapelSkip > 0) console.log(`   ⏭  ${mapelSkip} mapel sudah ada, dilewati.`);

  // ── 4. Ekstrakurikuler ────────────────────────
  console.log("\n🏅 Memasukkan data ekstrakurikuler...");

  // Ambil semua guru untuk lookup nama → id
  const semuaGuru = await prisma.guru.findMany({ select: { id: true, nama: true } });
  const guruByNama = new Map(semuaGuru.map((g) => [g.nama, g.id]));

  for (const e of EKSKUL_LIST) {
    const existing = await prisma.ekstrakurikuler.findFirst({ where: { nama: e.nama } });
    if (existing) {
      console.log(`   ⏭  ${e.nama} sudah ada, dilewati.`);
      continue;
    }

    // Jika lebih dari 1 pembina: buat satu record per pembina
    // Jika 1 pembina: gunakan field pembinaId
    if (e.pembina.length === 1) {
      const guruId = guruByNama.get(e.pembina[0]);
      await prisma.ekstrakurikuler.create({
        data: {
          nama: e.nama,
          hari: e.hari,
          jamMulai: e.jamMulai,
          jamSelesai: e.jamSelesai,
          pembinaId: guruId ?? null,
        },
      });
      console.log(`   ✅ ${e.nama} (pembina: ${e.pembina[0]})`);
    } else {
      // Lebih dari 1 pembina → buat satu record per pembina dengan nama ekskul sama
      for (const namaPembina of e.pembina) {
        const guruId = guruByNama.get(namaPembina);
        if (!guruId) {
          console.warn(`   ⚠  Guru "${namaPembina}" tidak ditemukan untuk ekskul ${e.nama}`);
          continue;
        }
        await prisma.ekstrakurikuler.create({
          data: {
            nama: e.nama,
            hari: e.hari,
            jamMulai: e.jamMulai,
            jamSelesai: e.jamSelesai,
            pembinaId: guruId,
          },
        });
        console.log(`   ✅ ${e.nama} (pembina: ${namaPembina})`);
      }
    }
  }

  // ── Ringkasan ─────────────────────────────────
  console.log("\n────────────────────────────────");
  console.log("✅ Seeding selesai!");
  console.log(`   Guru   : ${guruBaru} baru, ${guruSkip} dilewati`);
  console.log(`   Kelas  : ${kelasBaru} baru, ${kelasSkip} dilewati`);
  console.log(`   Mapel  : ${mapelBaru} baru, ${mapelSkip} dilewati`);
  console.log("────────────────────────────────");
  console.log("\n📌 Langkah selanjutnya:");
  console.log("   1. Buat Periode Akademik aktif di /admin/master/periode-akademik");
  console.log("   2. Buat Slot Waktu di /admin/master/slot-waktu");
  console.log("   3. Input Beban Mengajar di /admin/beban-mengajar");
  console.log("   4. Generate Jadwal di /admin/penjadwalan/generate");
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
