"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ConstraintFormState = {
  error?: string;
};

/**
 * Kunci sebuah slot jadwal yang sudah ada di tabel Jadwal.
 * Mencari record berdasarkan (periodeId, kelasId, hari, slotWaktuId),
 * lalu set isLocked = true.
 *
 * Jika belum ada jadwal di slot tsb → error, karena constraint hanya
 * bisa diterapkan pada slot yang sudah digenerate.
 */
export async function addConstraint(
  _prev: ConstraintFormState,
  formData: FormData
): Promise<ConstraintFormState> {
  const kelasId = formData.get("kelasId") as string;
  const hari = formData.get("hari") as string;
  const slotWaktuId = formData.get("slotWaktuId") as string;

  if (!kelasId || !hari || !slotWaktuId) {
    return { error: "Kelas, Hari, dan JP wajib dipilih." };
  }

  const periode = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });
  if (!periode) return { error: "Belum ada Periode Akademik aktif." };

  const jadwal = await prisma.jadwal.findFirst({
    where: {
      periodeAkademikId: periode.id,
      kelasId,
      hari: hari as never,
      slotWaktuId,
    },
  });

  if (!jadwal) {
    return {
      error:
        "Slot ini belum ada jadwal. Generate jadwal dulu, lalu kunci slot yang diinginkan.",
    };
  }

  if (jadwal.isLocked) {
    return { error: "Slot ini sudah terkunci." };
  }

  await prisma.jadwal.update({
    where: { id: jadwal.id },
    data: { isLocked: true },
  });

  revalidatePath("/admin/penjadwalan/constraint");
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
  redirect("/admin/penjadwalan/constraint");
}

/** Unlock satu slot — set isLocked = false. */
export async function removeConstraint(jadwalId: string) {
  await prisma.jadwal.update({
    where: { id: jadwalId },
    data: { isLocked: false },
  });

  revalidatePath("/admin/penjadwalan/constraint");
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
}

/** Unlock semua slot terkunci milik satu kelas. */
export async function removeAllConstraintKelas(kelasId: string, periodeId: string) {
  await prisma.jadwal.updateMany({
    where: { kelasId, periodeAkademikId: periodeId, isLocked: true },
    data: { isLocked: false },
  });

  revalidatePath("/admin/penjadwalan/constraint");
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
}
