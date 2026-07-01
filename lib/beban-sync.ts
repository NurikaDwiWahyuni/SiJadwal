import { prisma } from "@/lib/prisma";

export type SyncResult = { disimpan: number; diabaikan: string[] };

/**
 * Sinkronkan baris BebanMengajar untuk SATU GURU berdasarkan checklist
 * (mapelId, kelasId, jp) yang dicentang di form Guru.
 *
 * - Baris lama milik guru ini yang sudah tidak dicentang akan dihapus.
 * - Kalau kombinasi kelas+mapel itu sebelumnya dipegang guru lain, dan
 *   belum punya Jadwal, kepemilikannya dipindah ke guru ini.
 * - Baris (milik guru ini atau guru lain) yang sudah punya Jadwal tidak
 *   diutak-atik — dilaporkan lewat `diabaikan` supaya admin tahu.
 */
export async function syncBebanGuru(
  guruId: string,
  periodeAkademikId: string,
  assignments: { mapelId: string; kelasId: string; jp: number }[]
): Promise<SyncResult> {
  const diabaikan: string[] = [];
  let disimpan = 0;

  const existingMilikGuru = await prisma.bebanMengajar.findMany({
    where: { guruId, periodeAkademikId },
    include: { mapel: true, kelas: true },
  });
  const desiredKeys = new Set(assignments.map((a) => `${a.mapelId}:${a.kelasId}`));

  // Hapus baris guru ini yang sudah tidak dicentang
  for (const e of existingMilikGuru) {
    const key = `${e.mapelId}:${e.kelasId}`;
    if (desiredKeys.has(key)) continue;
    const jadwalCount = await prisma.jadwal.count({ where: { bebanMengajarId: e.id } });
    if (jadwalCount > 0) {
      diabaikan.push(
        `${e.mapel.kodeMapel} - ${e.kelas.namaKelas} (sudah punya jadwal, tidak dihapus)`
      );
      continue;
    }
    await prisma.bebanMengajar.delete({ where: { id: e.id } });
  }

  // Buat/perbarui baris yang dicentang
  for (const a of assignments) {
    const milikSendiri = existingMilikGuru.find(
      (e) => e.mapelId === a.mapelId && e.kelasId === a.kelasId
    );
    if (milikSendiri) {
      if (milikSendiri.jp !== a.jp) {
        await prisma.bebanMengajar.update({
          where: { id: milikSendiri.id },
          data: { jp: a.jp },
        });
      }
      disimpan++;
      continue;
    }

    // Kombinasi kelas+mapel ini mungkin sudah dipegang guru lain
    const milikGuruLain = await prisma.bebanMengajar.findFirst({
      where: { kelasId: a.kelasId, mapelId: a.mapelId, periodeAkademikId },
      include: { mapel: true, kelas: true },
    });
    if (milikGuruLain) {
      const jadwalCount = await prisma.jadwal.count({
        where: { bebanMengajarId: milikGuruLain.id },
      });
      if (jadwalCount > 0) {
        diabaikan.push(
          `${milikGuruLain.mapel.kodeMapel} - ${milikGuruLain.kelas.namaKelas} (sudah diajar guru lain & punya jadwal)`
        );
        continue;
      }
      await prisma.bebanMengajar.delete({ where: { id: milikGuruLain.id } });
    }

    await prisma.bebanMengajar.create({
      data: { guruId, kelasId: a.kelasId, mapelId: a.mapelId, jp: a.jp, periodeAkademikId },
    });
    disimpan++;
  }

  return { disimpan, diabaikan };
}

/**
 * Sinkronkan baris BebanMengajar untuk SATU MAPEL: tiap kelas boleh diisi
 * guru berbeda-beda, atau dikosongkan (= mapel ini tidak diajar di kelas
 * itu). Dipakai oleh form Mapel (baru & edit).
 */
export async function syncBebanMapel(
  mapelId: string,
  periodeAkademikId: string,
  rows: { kelasId: string; guruId: string; jp: number }[]
): Promise<SyncResult> {
  const diabaikan: string[] = [];
  let disimpan = 0;

  for (const row of rows) {
    const existing = await prisma.bebanMengajar.findFirst({
      where: { kelasId: row.kelasId, mapelId, periodeAkademikId },
      include: { kelas: true },
    });

    // Hapus semua duplikat (kelas+mapel+periode sama, guru berbeda)
    const semuaUntukKelas = await prisma.bebanMengajar.findMany({
      where: { kelasId: row.kelasId, mapelId, periodeAkademikId },
      include: { kelas: true },
    });
    if (semuaUntukKelas.length > 1) {
      // Pertahankan yang pertama, hapus sisanya (pilih yang punya jadwal kalau ada)
      const punya_jadwal = await Promise.all(
        semuaUntukKelas.map(async (e) => ({
          ...e,
          jadwalCount: await prisma.jadwal.count({ where: { bebanMengajarId: e.id } }),
        }))
      );
      const utama = punya_jadwal.find((e) => e.jadwalCount > 0) ?? punya_jadwal[0];
      for (const e of punya_jadwal) {
        if (e.id !== utama.id) {
          // Hapus jadwal milik duplikat ini dulu (FK constraint)
          if (e.jadwalCount > 0) {
            await prisma.jadwal.deleteMany({ where: { bebanMengajarId: e.id } });
          }
          await prisma.bebanMengajar.delete({ where: { id: e.id } });
        }
      }
    }

    if (!row.guruId) {
      if (existing) {
        const jadwalCount = await prisma.jadwal.count({ where: { bebanMengajarId: existing.id } });
        if (jadwalCount > 0) {
          diabaikan.push(`${existing.kelas.namaKelas} (sudah punya jadwal, tidak bisa dihapus)`);
          continue;
        }
        await prisma.bebanMengajar.delete({ where: { id: existing.id } });
        disimpan++;
      }
      continue;
    }

    if (existing) {
      if (existing.guruId === row.guruId && existing.jp === row.jp) continue;
      if (existing.guruId !== row.guruId) {
        const jadwalCount = await prisma.jadwal.count({ where: { bebanMengajarId: existing.id } });
        if (jadwalCount > 0) {
          diabaikan.push(`${existing.kelas.namaKelas} (sudah punya jadwal, ganti guru dibatalkan)`);
          continue;
        }
      }
      await prisma.bebanMengajar.update({
        where: { id: existing.id },
        data: { guruId: row.guruId, jp: row.jp },
      });
      disimpan++;
    } else {
      const dup = await prisma.bebanMengajar.findUnique({
        where: {
          guruId_kelasId_mapelId_periodeAkademikId: {
            guruId: row.guruId,
            kelasId: row.kelasId,
            mapelId,
            periodeAkademikId,
          },
        },
      });
      if (dup) continue;
      await prisma.bebanMengajar.create({
        data: { guruId: row.guruId, kelasId: row.kelasId, mapelId, jp: row.jp, periodeAkademikId },
      });
      disimpan++;
    }
  }

  return { disimpan, diabaikan };
}
