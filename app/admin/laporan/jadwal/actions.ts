"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateJadwal } from "@/lib/scheduler";

function revalidateAll() {
  revalidatePath("/admin/laporan/jadwal");
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
}

/** Toggle isLocked pada satu slot jadwal */
export async function toggleLockJadwal(id: string, locked: boolean) {
  await prisma.jadwal.update({ where: { id }, data: { isLocked: locked } });
  revalidatePath("/admin/laporan/jadwal");
}

/** Regenerate hanya slot yang TIDAK terkunci */
export async function regenerateUnlocked(): Promise<{ berhasil: number; gagal: number }> {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) throw new Error("Belum ada periode aktif");

  await prisma.jadwal.deleteMany({ where: { periodeAkademikId: periode.id, isLocked: false } });
  const result = await generateJadwal(periode.id, "autofix");
  revalidateAll();
  return { berhasil: result.berhasil, gagal: result.gagal.length };
}

/**
 * Isi slot kosong secara manual dari preview matriks.
 * Validasi: slot benar-benar kosong, guru & kelas tidak bentrok.
 */
export async function isiSlotManual(params: {
  periodeId:       string;
  bebanMengajarId: string;
  kelasId:         string;
  hari:            string;
  slotWaktuId:     string;
}): Promise<{ ok: boolean; error?: string }> {
  const { periodeId, bebanMengajarId, kelasId, hari, slotWaktuId } = params;

  const beban = await prisma.bebanMengajar.findUnique({
    where:   { id: bebanMengajarId },
    include: { guru: true },
  });
  if (!beban) return { ok: false, error: "Beban tidak ditemukan" };

  const bentrokKelas = await prisma.jadwal.findFirst({
    where: { periodeAkademikId: periodeId, kelasId, hari: hari as never, slotWaktuId },
  });
  if (bentrokKelas) return { ok: false, error: "Slot ini sudah terisi untuk kelas ini" };

  const bentrokGuru = await prisma.jadwal.findFirst({
    where: { periodeAkademikId: periodeId, guruId: beban.guruId, hari: hari as never, slotWaktuId },
  });
  if (bentrokGuru) return { ok: false, error: `${beban.guru.nama} sudah mengajar di slot ini` };

  await prisma.jadwal.create({
    data: {
      periodeAkademikId: periodeId,
      bebanMengajarId,
      guruId:      beban.guruId,
      kelasId,
      hari:        hari as never,
      slotWaktuId,
      isLocked:    false,
    },
  });

  revalidateAll();
  return { ok: true };
}

/**
 * Ambil info beban yang JP-nya belum terpenuhi + occupied map untuk validasi konflik client-side.
 */
export async function getGagalInfo(periodeId: string): Promise<{
  gagalBeban: {
    bebanId:     string;
    guruId:      string;
    guruNama:    string;
    kodeGuru:    string;
    kelasId:     string;
    kelasNama:   string;
    mapelNama:   string;
    kodeMapel:   string;
    jpTarget:    number;
    jpTerjadwal: number;
    jpKurang:    number;
  }[];
  guruOccupied:  [string, string[]][];
  kelasOccupied: [string, string[]][];
}> {
  const [bebanList, jadwalAll] = await Promise.all([
    prisma.bebanMengajar.findMany({
      where:   { periodeAkademikId: periodeId },
      include: { guru: true, kelas: true, mapel: true },
    }),
    prisma.jadwal.findMany({
      where:  { periodeAkademikId: periodeId },
      select: { bebanMengajarId: true, guruId: true, kelasId: true, hari: true, slotWaktuId: true },
    }),
  ]);

  const jpMap = new Map<string, number>();
  const guruOcc  = new Map<string, Set<string>>();
  const kelasOcc = new Map<string, Set<string>>();

  for (const j of jadwalAll) {
    jpMap.set(j.bebanMengajarId, (jpMap.get(j.bebanMengajarId) ?? 0) + 1);
    const k = `${j.hari}|${j.slotWaktuId}`;
    if (!guruOcc.has(j.guruId))   guruOcc.set(j.guruId, new Set());
    if (!kelasOcc.has(j.kelasId)) kelasOcc.set(j.kelasId, new Set());
    guruOcc.get(j.guruId)!.add(k);
    kelasOcc.get(j.kelasId)!.add(k);
  }

  const gagalBeban = bebanList
    .map((b) => ({
      bebanId:     b.id,
      guruId:      b.guruId,
      guruNama:    b.guru.nama,
      kodeGuru:    b.guru.kodeGuru,
      kelasId:     b.kelasId,
      kelasNama:   b.kelas.namaKelas,
      mapelNama:   b.mapel.namaMapel,
      kodeMapel:   b.mapel.kodeMapel,
      jpTarget:    b.jp,
      jpTerjadwal: jpMap.get(b.id) ?? 0,
      jpKurang:    b.jp - (jpMap.get(b.id) ?? 0),
    }))
    .filter((b) => b.jpKurang > 0)
    .sort((a, b) => b.jpKurang - a.jpKurang);

  return {
    gagalBeban,
    guruOccupied:  [...guruOcc.entries()].map(([id, s]) => [id, [...s]]),
    kelasOccupied: [...kelasOcc.entries()].map(([id, s]) => [id, [...s]]),
  };
}
