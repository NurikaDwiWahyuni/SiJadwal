"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Toggle isLocked pada satu record Jadwal.
 * Dipanggil dari LockToggle (client component) via useTransition.
 */
export async function toggleJadwalLock(jadwalId: string) {
  const current = await prisma.jadwal.findUnique({
    where: { id: jadwalId },
    select: { isLocked: true },
  });
  if (!current) return;

  await prisma.jadwal.update({
    where: { id: jadwalId },
    data: { isLocked: !current.isLocked },
  });

  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
}

/**
 * Kunci SEMUA slot JP suatu kelas yang sudah terjadwal.
 * Slot NON_PELAJARAN tidak terpengaruh (tidak ada di tabel Jadwal).
 */
export async function lockAllJadwalKelas(kelasId: string, periodeId: string) {
  await prisma.jadwal.updateMany({
    where: { kelasId, periodeAkademikId: periodeId },
    data: { isLocked: true },
  });
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
}

/**
 * Buka kunci SEMUA slot JP suatu kelas (kebalikan dari lockAllJadwalKelas).
 */
export async function unlockAllJadwalKelas(kelasId: string, periodeId: string) {
  await prisma.jadwal.updateMany({
    where: { kelasId, periodeAkademikId: periodeId },
    data: { isLocked: false },
  });
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
}

/**
 * Tambah jadwal manual ke slot yang kosong.
 * Melewati aturan split — digunakan untuk slot yang gagal digenerate otomatis.
 */
export async function tambahJadwalManual(data: {
  periodeAkademikId: string;
  kelasId:           string;
  slotWaktuId:       string;
  hari:              string;
  bebanMengajarId:   string;
  guruId:            string;
}): Promise<{ ok: boolean; pesan?: string }> {
  // Cek konflik kelas
  const konflikKelas = await prisma.jadwal.findFirst({
    where: {
      periodeAkademikId: data.periodeAkademikId,
      kelasId:           data.kelasId,
      slotWaktuId:       data.slotWaktuId,
      hari:              data.hari as never,
    },
  });
  if (konflikKelas) return { ok: false, pesan: "Slot ini sudah terisi untuk kelas ini." };

  // Cek konflik guru
  const konflikGuru = await prisma.jadwal.findFirst({
    where: {
      periodeAkademikId: data.periodeAkademikId,
      guruId:            data.guruId,
      slotWaktuId:       data.slotWaktuId,
      hari:              data.hari as never,
    },
  });
  if (konflikGuru) return { ok: false, pesan: "Guru sudah mengajar di slot ini (kelas lain)." };

  // Cek: mapel yang sama tidak boleh di hari yang sama untuk kelas ini (PALING KRUSIAL)
  const konflikMapelHari = await prisma.jadwal.findFirst({
    where: {
      periodeAkademikId: data.periodeAkademikId,
      kelasId:           data.kelasId,
      hari:              data.hari as never,
      bebanMengajar:     { mapelId: (await prisma.bebanMengajar.findUnique({ where: { id: data.bebanMengajarId }, select: { mapelId: true } }))?.mapelId ?? "" },
    },
  });
  if (konflikMapelHari) return { ok: false, pesan: "Mapel ini sudah ada di hari yang sama untuk kelas ini. Pilih hari lain." };

  await prisma.jadwal.create({
    data: {
      periodeAkademikId: data.periodeAkademikId,
      kelasId:           data.kelasId,
      slotWaktuId:       data.slotWaktuId,
      hari:              data.hari as never,
      bebanMengajarId:   data.bebanMengajarId,
      guruId:            data.guruId,
      isLocked:          false,
    },
  });

  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
  return { ok: true };
}

/**
 * Hapus satu slot jadwal non-locked.
 */
export async function hapusJadwalSlot(jadwalId: string): Promise<{ ok: boolean; pesan?: string }> {
  const j = await prisma.jadwal.findUnique({ where: { id: jadwalId } });
  if (!j)          return { ok: false, pesan: "Jadwal tidak ditemukan." };
  if (j.isLocked)  return { ok: false, pesan: "Slot terkunci, buka kunci dulu." };
  await prisma.jadwal.delete({ where: { id: jadwalId } });
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
  return { ok: true };
}
