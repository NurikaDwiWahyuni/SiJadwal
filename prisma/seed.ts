import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ─── USER ADMIN ───────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("rostersmp2026", 10);
  await prisma.user.upsert({
    where:  { username: "admin" },
    update: { passwordHash },
    create: { username: "admin", passwordHash, nama: "Administrator", role: "ADMIN" },
  });

  // ─── PERIODE AKADEMIK ─────────────────────────────────────────
  await prisma.periodeAkademik.upsert({
    where:  { tahun_semester: { tahun: "2025/2026", semester: "GANJIL" } },
    update: {},
    create: { tahun: "2025/2026", semester: "GANJIL", statusAktif: true },
  });

  // ─── GURU ─────────────────────────────────────────────────────
  const guruData = [
    { kodeGuru: "SO", nama: "Surianto, S.Pd",                       maksJp: 15,   status: "PNS"   as const },
    { kodeGuru: "RA", nama: "Ratna, SP",                             maksJp: 25,   status: "HONOR" as const },
    { kodeGuru: "TN", nama: "Tiurlan Naria, S.Pd",                   maksJp: 24,   status: "PNS"   as const },
    { kodeGuru: "NH", nama: "Nurasiah, S.Pd.I",                      maksJp: 24,   status: "PNS"   as const },
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
    { kodeGuru: "EM", nama: "Elfrida Monika, S.Pd",                  maksJp: 22,   status: "HONOR" as const },
    { kodeGuru: "LA", nama: "Lisa Arianti, S.Pd",                    maksJp: 26,   status: "HONOR" as const },
    { kodeGuru: "DB", nama: "Debesty",                                maksJp: null, status: "HONOR" as const },
  ];

  const guruMap: Record<string, string> = {};
  for (const g of guruData) {
    const guru = await prisma.guru.upsert({
      where:  { kodeGuru: g.kodeGuru },
      update: { nama: g.nama, status: g.status, maksJp: g.maksJp },
      create: { kodeGuru: g.kodeGuru, nama: g.nama, status: g.status, maksJp: g.maksJp },
    });
    guruMap[g.nama]     = guru.id;
    guruMap[g.kodeGuru] = guru.id;
  }
  console.log(`  ✓ ${guruData.length} guru`);

  // ─── KELAS ────────────────────────────────────────────────────
  const namaKelasList = [
    "VII-1", "VII-2", "VII-3",
    "VIII-1", "VIII-2", "VIII-3", "VIII-4",
    "IX-1", "IX-2", "IX-3", "IX-4",
  ];
  for (const nama of namaKelasList) {
    await prisma.kelas.upsert({
      where:  { namaKelas: nama },
      update: {},
      create: { namaKelas: nama },
    });
  }
  console.log(`  ✓ ${namaKelasList.length} kelas`);

  // ─── MAPEL ────────────────────────────────────────────────────
  const mapelData = [
    { kodeMapel: "PPKN", namaMapel: "Pendidikan Pancasila dan Kewarganegaraan" },
    { kodeMapel: "MTK",  namaMapel: "Matematika" },
    { kodeMapel: "BIN",  namaMapel: "Bahasa Indonesia" },
    { kodeMapel: "BIG",  namaMapel: "Bahasa Inggris" },
    { kodeMapel: "IPA",  namaMapel: "IPA" },
    { kodeMapel: "IPS",  namaMapel: "IPS" },
    { kodeMapel: "INFO", namaMapel: "Informatika" },
    { kodeMapel: "PJOK", namaMapel: "PJOK" },
    { kodeMapel: "SBK",  namaMapel: "Seni Budaya" },
    { kodeMapel: "PAI",  namaMapel: "Pendidikan Agama Islam" },
    { kodeMapel: "BMR",  namaMapel: "BMR" },
  ];
  for (const m of mapelData) {
    await prisma.mapel.upsert({
      where:  { kodeMapel: m.kodeMapel },
      update: { namaMapel: m.namaMapel },
      create: { ...m, jpMaksBerurutan: 2, jumlahPertemuanMaks: 3 },
    });
  }
  console.log(`  ✓ ${mapelData.length} mapel`);

  // ─── EKSTRAKURIKULER ──────────────────────────────────────────
  // `nama` bukan @unique, jadi pakai findFirst + create/update manual
  // (tidak bisa pakai upsert karena Prisma butuh unique field di where)
  const ekskulData = [
    { nama: "Pramuka",                          pembina: "Iwan Syofianto, S.Pd",     hari: "JUMAT" as const, jamMulai: "14:00", jamSelesai: "16:00" },
    { nama: "Bola Voli",                         pembina: "Yunita Rosadi, S.Pd",      hari: "JUMAT" as const, jamMulai: "14:00", jamSelesai: "16:00" },
    { nama: "Bulu Tangkis",                      pembina: "Yunita Rosadi, S.Pd",      hari: "JUMAT" as const, jamMulai: "14:00", jamSelesai: "16:00" },
    { nama: "Futsal",                            pembina: "Surianto, S.Pd",            hari: "JUMAT" as const, jamMulai: "14:00", jamSelesai: "16:00" },
    { nama: "Keterampilan dan Seni",             pembina: "Elfrida Monika, S.Pd",     hari: "JUMAT" as const, jamMulai: "14:00", jamSelesai: "16:00" },
    { nama: "Nasyid",                            pembina: "Nurasiah, S.Pd.I",          hari: "JUMAT" as const, jamMulai: "14:00", jamSelesai: "16:00" },
    { nama: "Seni Baca Al-Qur'an dan Al-Kitab",  pembina: "Syayaroh Rizki Ibya, S.Pd", hari: "JUMAT" as const, jamMulai: "14:00", jamSelesai: "16:00" },
    { nama: "PMR",                               pembina: "Lisa Arianti, S.Pd",        hari: "JUMAT" as const, jamMulai: "14:00", jamSelesai: "16:00" },
  ];

  for (const e of ekskulData) {
    const pembinaId = guruMap[e.pembina] ?? null;
    const existing  = await prisma.ekstrakurikuler.findFirst({ where: { nama: e.nama } });
    if (existing) {
      await prisma.ekstrakurikuler.update({
        where:  { id: existing.id },
        data:   { pembinaId, hari: e.hari, jamMulai: e.jamMulai, jamSelesai: e.jamSelesai },
      });
    } else {
      await prisma.ekstrakurikuler.create({
        data: { nama: e.nama, pembinaId, hari: e.hari, jamMulai: e.jamMulai, jamSelesai: e.jamSelesai },
      });
    }
  }
  console.log(`  ✓ ${ekskulData.length} ekstrakurikuler`);

  // ─── SLOT WAKTU ───────────────────────────────────────────────
  type SlotInput = {
    urutan: number;
    namaSlot: string;
    jenisSlot: "PELAJARAN" | "NON_PELAJARAN";
    jamMulai?: string;
    jamSelesai?: string;
  };

  async function upsertSlots(hari: "SENIN"|"SELASA"|"RABU"|"KAMIS"|"JUMAT"|"SABTU", slots: SlotInput[]) {
    for (const s of slots) {
      await prisma.slotWaktu.upsert({
        where:  { hari_urutan: { hari, urutan: s.urutan } },
        update: { namaSlot: s.namaSlot, jenisSlot: s.jenisSlot, jamMulai: s.jamMulai ?? null, jamSelesai: s.jamSelesai ?? null },
        create: { hari, ...s, jamMulai: s.jamMulai ?? null, jamSelesai: s.jamSelesai ?? null },
      });
    }
  }

  // Senin — Upacara di awal
  await upsertSlots("SENIN", [
    { urutan: 1, namaSlot: "Upacara",   jenisSlot: "NON_PELAJARAN" },
    { urutan: 2, namaSlot: "JP 1",      jenisSlot: "PELAJARAN",     jamMulai: "07:45", jamSelesai: "08:25" },
    { urutan: 3, namaSlot: "JP 2",      jenisSlot: "PELAJARAN",     jamMulai: "08:25", jamSelesai: "09:05" },
    { urutan: 4, namaSlot: "JP 3",      jenisSlot: "PELAJARAN",     jamMulai: "09:05", jamSelesai: "09:45" },
    { urutan: 5, namaSlot: "Istirahat", jenisSlot: "NON_PELAJARAN" },
    { urutan: 6, namaSlot: "JP 4",      jenisSlot: "PELAJARAN",     jamMulai: "10:05", jamSelesai: "10:45" },
    { urutan: 7, namaSlot: "JP 5",      jenisSlot: "PELAJARAN",     jamMulai: "10:45", jamSelesai: "11:25" },
    { urutan: 8, namaSlot: "JP 6",      jenisSlot: "PELAJARAN",     jamMulai: "11:25", jamSelesai: "12:05" },
  ]);

  // Selasa, Rabu, Kamis — sama
  for (const hari of ["SELASA", "RABU", "KAMIS"] as const) {
    await upsertSlots(hari, [
      { urutan: 1, namaSlot: "JP 1",      jenisSlot: "PELAJARAN",     jamMulai: "07:30", jamSelesai: "08:10" },
      { urutan: 2, namaSlot: "JP 2",      jenisSlot: "PELAJARAN",     jamMulai: "08:10", jamSelesai: "08:50" },
      { urutan: 3, namaSlot: "JP 3",      jenisSlot: "PELAJARAN",     jamMulai: "08:50", jamSelesai: "09:30" },
      { urutan: 4, namaSlot: "Istirahat", jenisSlot: "NON_PELAJARAN" },
      { urutan: 5, namaSlot: "JP 4",      jenisSlot: "PELAJARAN",     jamMulai: "09:50", jamSelesai: "10:30" },
      { urutan: 6, namaSlot: "JP 5",      jenisSlot: "PELAJARAN",     jamMulai: "10:30", jamSelesai: "11:10" },
      { urutan: 7, namaSlot: "JP 6",      jenisSlot: "PELAJARAN",     jamMulai: "11:10", jamSelesai: "11:50" },
    ]);
  }

  // Jumat — Yasinan di awal
  await upsertSlots("JUMAT", [
    { urutan: 1, namaSlot: "Yasinan",   jenisSlot: "NON_PELAJARAN" },
    { urutan: 2, namaSlot: "Yasinan",   jenisSlot: "NON_PELAJARAN" },
    { urutan: 3, namaSlot: "JP 1",      jenisSlot: "PELAJARAN",     jamMulai: "09:00", jamSelesai: "09:40" },
    { urutan: 4, namaSlot: "JP 2",      jenisSlot: "PELAJARAN",     jamMulai: "09:40", jamSelesai: "10:20" },
    { urutan: 5, namaSlot: "Istirahat", jenisSlot: "NON_PELAJARAN" },
    { urutan: 6, namaSlot: "JP 3",      jenisSlot: "PELAJARAN",     jamMulai: "10:40", jamSelesai: "11:20" },
    { urutan: 7, namaSlot: "JP 4",      jenisSlot: "PELAJARAN",     jamMulai: "11:20", jamSelesai: "12:00" },
  ]);
  console.log("  ✓ slot waktu");

  // ─── IDENTITAS SEKOLAH ────────────────────────────────────────
  // Pakai $executeRaw untuk update yang aman terhadap kolom yang mungkin baru
  // di-migrate — jika kolom belum ada, db push harus dijalankan lebih dulu.
  const identitasExisting = await prisma.identitasSekolah.findUnique({ where: { id: 1 } });

  const identitasData = {
    namaSekolah:    "SMP NEGERI 3 BAGAN SINEMBAH",
    namaPemerintah: "PEMERINTAH KABUPATEN ROKAN HILIR",
    namaDinas:      "DINAS PENDIDIKAN DAN KEBUDAYAAN",
    kecamatan:      "KEC. BAGAN SINEMBAH",
    npsn:           "10405515",
    nss:            "201091005036",
    alamat:         "Dusun Bakti, Desa Bakti Makmur, Kecamatan Bagan Sinembah, Kabupaten Rokan Hilir \u2013 Riau 28992",
    email:          "smpnbagansinembah03@gmail.com",
    tahunPelajaran: "2025 / 2026",
    kurikulum:      "KURIKULUM MERDEKA",
  };

  if (identitasExisting) {
    await prisma.identitasSekolah.update({ where: { id: 1 }, data: identitasData });
  } else {
    await prisma.identitasSekolah.create({ data: { id: 1, ...identitasData } });
  }
  console.log("  ✓ identitas sekolah");

  // ─── TANDA TANGAN ─────────────────────────────────────────────
  const ttdExisting = await prisma.pengaturanTtd.findUnique({ where: { id: 1 } });
  if (!ttdExisting) {
    await prisma.pengaturanTtd.create({
      data: { id: 1, namaKepsek: "Kepala Sekolah", namaWaka: "Waka Kurikulum" },
    });
  }
  console.log("  ✓ pengaturan ttd");

  console.log("\n✅ Seed selesai!");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed error:", e.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
