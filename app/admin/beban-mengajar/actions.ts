"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type BebanFormState = { error?: string };

function parseBebanForm(formData: FormData) {
  const guruId  = (formData.get("guruId") as string) ?? "";
  const kelasId = (formData.get("kelasId") as string) ?? "";
  const mapelId = (formData.get("mapelId") as string) ?? "";
  const jpRaw   = formData.get("jp") as string;
  const jp      = Number(jpRaw);

  if (!guruId || !kelasId || !mapelId) return { error: "Guru, kelas, dan mapel wajib diisi." } as const;
  if (!Number.isFinite(jp) || jp < 1)  return { error: "Jumlah JP harus berupa angka \u2265 1." } as const;

  return { guruId, kelasId, mapelId, jp };
}

/**
 * Tambah Beban Mengajar baru pada periode akademik aktif.
 * Dipanggil dari BebanForm via useActionState (action prop).
 */
export async function createBeban(
  _prevState: BebanFormState,
  formData: FormData,
): Promise<BebanFormState> {
  const parsed = parseBebanForm(formData);
  if ("error" in parsed) return parsed;
  const { guruId, kelasId, mapelId, jp } = parsed;

  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) return { error: "Belum ada Periode Akademik aktif." };

  const duplikat = await prisma.bebanMengajar.findFirst({
    where: { guruId, kelasId, mapelId, periodeAkademikId: periode.id },
  });
  if (duplikat) return { error: "Kombinasi guru, kelas, dan mapel ini sudah tercatat sebelumnya." };

  await prisma.bebanMengajar.create({
    data: { guruId, kelasId, mapelId, jp, periodeAkademikId: periode.id },
  });

  revalidatePath("/admin/beban-mengajar");
  revalidatePath("/admin/master/guru");
  revalidatePath("/admin/master/mapel");
  redirect("/admin/beban-mengajar");
}

/**
 * Update Beban Mengajar yang sudah ada.
 * Dipanggil dari BebanForm via action={updateBeban.bind(null, id)}.
 */
export async function updateBeban(
  id: string,
  _prevState: BebanFormState,
  formData: FormData,
): Promise<BebanFormState> {
  const parsed = parseBebanForm(formData);
  if ("error" in parsed) return parsed;
  const { guruId, kelasId, mapelId, jp } = parsed;

  const existing = await prisma.bebanMengajar.findUnique({ where: { id } });
  if (!existing) return { error: "Beban mengajar tidak ditemukan." };

  const duplikat = await prisma.bebanMengajar.findFirst({
    where: {
      id: { not: id },
      guruId, kelasId, mapelId,
      periodeAkademikId: existing.periodeAkademikId,
    },
  });
  if (duplikat) return { error: "Kombinasi guru, kelas, dan mapel ini sudah tercatat sebelumnya." };

  await prisma.bebanMengajar.update({
    where: { id },
    data: { guruId, kelasId, mapelId, jp },
  });

  revalidatePath("/admin/beban-mengajar");
  revalidatePath("/admin/master/guru");
  revalidatePath("/admin/master/mapel");
  redirect("/admin/beban-mengajar");
}

export async function deleteBeban(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const jadwalCount = await prisma.jadwal.count({ where: { bebanMengajarId: id } });
  if (jadwalCount > 0) {
    throw new Error(
      "Beban mengajar tidak dapat dihapus karena sudah punya Jadwal. Hapus jadwalnya dulu / generate ulang."
    );
  }

  await prisma.bebanMengajar.delete({ where: { id } });
  revalidatePath("/admin/beban-mengajar");
  revalidatePath("/admin/master/guru");
  revalidatePath("/admin/master/mapel");
}

/**
 * Hapus SEMUA Beban Mengajar pada periode akademik aktif (untuk mulai ulang
 * dari nol). Guru, Kelas, dan Mapel TIDAK disentuh. Jadwal yang terikat ke
 * beban mengajar tersebut otomatis ikut dihapus dulu (FK BebanMengajar ←
 * Jadwal tidak punya onDelete cascade) agar tidak ada referensi nyangkut.
 */
export async function hapusSemuaBeban() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) throw new Error("Belum ada Periode Akademik aktif.");

  await prisma.$transaction([
    prisma.jadwal.deleteMany({ where: { periodeAkademikId: periode.id } }),
    prisma.bebanMengajar.deleteMany({ where: { periodeAkademikId: periode.id } }),
  ]);

  revalidatePath("/admin/beban-mengajar");
  revalidatePath("/admin/master/guru");
  revalidatePath("/admin/master/mapel");
  revalidatePath("/admin/penjadwalan/generate");
}
