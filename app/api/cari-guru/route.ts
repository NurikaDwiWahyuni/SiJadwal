import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Peta hari JS (0=Minggu,1=Senin,...) ke enum Hari
const JS_DAY_TO_HARI = [
  null,        // 0 Minggu — tidak ada
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
] as const;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ guru: [] });
  }

  // Cari guru berdasarkan nama (case-insensitive, partial match)
  const guruList = await prisma.guru.findMany({
    where: {
      nama: { contains: q },
    },
    orderBy: { nama: "asc" },
    take: 10,
  });

  if (guruList.length === 0) {
    return NextResponse.json({ guru: [] });
  }

  // Periode aktif
  const periodeAktif = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });

  // Hari sekarang & besok (lewati Minggu karena sekolah tidak beroperasi)
  const now = new Date();
  const hariIni = JS_DAY_TO_HARI[now.getDay()];

  const besok = new Date(now);
  besok.setDate(besok.getDate() + 1);
  let hariBesok = JS_DAY_TO_HARI[besok.getDay()];
  if (!hariBesok) {
    // Besok Minggu -> lompat ke Senin (hari sekolah berikutnya)
    besok.setDate(besok.getDate() + 1);
    hariBesok = JS_DAY_TO_HARI[besok.getDay()];
  }

  const results = await Promise.all(
    guruList.map(async (guru) => {
      // ── Jadwal mengajar hari ini ──────────────────────────
      const jadwalHariIni = hariIni && periodeAktif
        ? await prisma.jadwal.findMany({
            where: {
              guruId: guru.id,
              periodeAkademikId: periodeAktif.id,
              hari: hariIni,
            },
            include: {
              slotWaktu: true,
              kelas: true,
              bebanMengajar: { include: { mapel: true } },
            },
            orderBy: { slotWaktu: { urutan: "asc" } },
          })
        : [];

      // ── Semua jadwal minggu ini (opsional, tampilkan per hari) ──
      const jadwalMinggu = periodeAktif
        ? await prisma.jadwal.findMany({
            where: {
              guruId: guru.id,
              periodeAkademikId: periodeAktif.id,
            },
            include: {
              slotWaktu: true,
              kelas: true,
              bebanMengajar: { include: { mapel: true } },
            },
            orderBy: [
              { hari: "asc" },
              { slotWaktu: { urutan: "asc" } },
            ],
          })
        : [];

      // ── Piket ─────────────────────────────────────────────
      const piket = periodeAktif
        ? await prisma.piketGuru.findMany({
            where: {
              guruId: guru.id,
              periodeAkademikId: periodeAktif.id,
            },
          })
        : [];

      // ── Ekstrakurikuler ───────────────────────────────────
      const ekskul = await prisma.ekstrakurikuler.findMany({
        where: { pembinaId: guru.id },
        orderBy: { hari: "asc" },
      });

      return {
        id: guru.id,
        nama: guru.nama,
        kodeGuru: guru.kodeGuru,
        status: guru.status,
        hariIni: hariIni ?? null,
        jadwalHariIni: jadwalHariIni.map((j) => ({
          namaSlot: j.slotWaktu.namaSlot,
          jamMulai: j.slotWaktu.jamMulai,
          jamSelesai: j.slotWaktu.jamSelesai,
          kelas: j.kelas.namaKelas,
          mapel: j.bebanMengajar.mapel.namaMapel,
        })),
        jadwalMinggu: jadwalMinggu.map((j) => ({
          hari: j.hari,
          namaSlot: j.slotWaktu.namaSlot,
          jamMulai: j.slotWaktu.jamMulai,
          jamSelesai: j.slotWaktu.jamSelesai,
          kelas: j.kelas.namaKelas,
          mapel: j.bebanMengajar.mapel.namaMapel,
        })),
        piket: piket.map((p) => p.hari),
        // Announce H (hari ini) dan H-1 (besok) piket
        piketHariIni: piket.some((p) => p.hari === hariIni),
        piketBesok: piket.some((p) => p.hari === hariBesok),
        hariBesok: hariBesok ?? null,
        ekskul: ekskul.map((e) => ({
          nama: e.nama,
          hari: e.hari,
          jamMulai: e.jamMulai,
          jamSelesai: e.jamSelesai,
          lokasi: e.lokasi,
        })),
      };
    })
  );

  return NextResponse.json({ guru: results });
}
