"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { syncBebanMapel } from "@/lib/beban-sync";

const mapelSchema = z.object({
  namaMapel: z.string().trim().min(2, "Nama mapel wajib diisi"),
  kodeMapel: z.string().trim().min(1, "Kode mapel wajib diisi").max(15).toUpperCase(),
  jpMaksBerurutan: z.coerce.number().int().min(1, "Minimal 1"),
  jumlahPertemuanMaks: z.coerce.number().int().min(1, "Minimal 1"),
  aktif: z.boolean().default(true),
});

export type MapelFormState = {
  error?: string;
};

function parseFormData(formData: FormData) {
  return mapelSchema.safeParse({
    namaMapel: formData.get("namaMapel"),
    kodeMapel: formData.get("kodeMapel"),
    jpMaksBerurutan: formData.get("jpMaksBerurutan"),
    jumlahPertemuanMaks: formData.get("jumlahPertemuanMaks"),
    // checkbox: hadir = "1" = true, tidak hadir = null = false
    aktif: formData.get("aktif") === "1",
  });
}

/** Baca fieldset "Guru Pengampu per Kelas" yang ditempel di MapelForm. */
function parsePengampu(formData: FormData) {
  const kelasIds = formData.getAll("pengampuKelasId") as string[];
  const guruIds = formData.getAll("pengampuGuruId") as string[];
  const jpList = formData.getAll("pengampuJp") as string[];
  return kelasIds.map((kelasId, i) => ({
    kelasId,
    guruId: (guruIds[i] ?? "").trim(),
    jp: Math.max(1, parseInt(jpList[i], 10) || 2),
  }));
}

export async function createMapel(
  _prevState: MapelFormState,
  formData: FormData
): Promise<MapelFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const existing = await prisma.mapel.findUnique({
    where: { kodeMapel: parsed.data.kodeMapel },
  });
  if (existing) {
    return { error: `Kode mapel "${parsed.data.kodeMapel}" sudah digunakan` };
  }

  const mapel = await prisma.mapel.create({ data: parsed.data });

  const rows = parsePengampu(formData);
  let diabaikan: string[] = [];
  if (rows.length > 0) {
    const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
    if (periode) {
      const result = await syncBebanMapel(mapel.id, periode.id, rows);
      diabaikan = result.diabaikan;
      revalidatePath("/admin/beban-mengajar");
      revalidatePath("/admin/master/guru");
    }
  }

  revalidatePath("/admin/master/mapel");
  if (diabaikan.length > 0) {
    redirect(`/admin/master/mapel?warning=${encodeURIComponent(diabaikan.join("; "))}`);
  }
  redirect("/admin/master/mapel");
}

export async function updateMapel(
  id: string,
  _prevState: MapelFormState,
  formData: FormData
): Promise<MapelFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const existing = await prisma.mapel.findFirst({
    where: { kodeMapel: parsed.data.kodeMapel, NOT: { id } },
  });
  if (existing) {
    return { error: `Kode mapel "${parsed.data.kodeMapel}" sudah digunakan` };
  }

  await prisma.mapel.update({ where: { id }, data: parsed.data });

  const rows = parsePengampu(formData);
  let diabaikan: string[] = [];
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (periode && rows.length > 0) {
    const result = await syncBebanMapel(id, periode.id, rows);
    diabaikan = result.diabaikan;
    revalidatePath("/admin/beban-mengajar");
    revalidatePath("/admin/master/guru");
  }

  revalidatePath("/admin/master/mapel");
  if (diabaikan.length > 0) {
    redirect(`/admin/master/mapel?warning=${encodeURIComponent(diabaikan.join("; "))}`);
  }
  redirect("/admin/master/mapel");
}

export async function deleteMapel(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const [bebanCount, slotCount] = await Promise.all([
    prisma.bebanMengajar.count({ where: { mapelId: id } }),
    prisma.slotTerkunci.count({ where: { mapelId: id } }),
  ]);

  if (bebanCount > 0 || slotCount > 0) {
    throw new Error(
      "Mapel tidak dapat dihapus karena masih memiliki data Beban Mengajar/Slot Terkunci terkait."
    );
  }

  await prisma.mapel.delete({ where: { id } });
  revalidatePath("/admin/master/mapel");
}
