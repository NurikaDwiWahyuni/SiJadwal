"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { upsertKelasMapelConfig, type KelasMapelMode } from "@/lib/kelas-mapel";

const kelasSchema = z.object({
  namaKelas: z.string().trim().min(1, "Nama kelas wajib diisi"),
  waliKelasId: z.string().trim().optional(),
});

export type KelasFormState = {
  error?: string;
};

function parseFormData(formData: FormData) {
  const waliKelasId = (formData.get("waliKelasId") as string) || "";
  return kelasSchema.safeParse({
    namaKelas: formData.get("namaKelas"),
    waliKelasId,
  });
}

/** Baca konfigurasi mapel dari FormData. */
function parseMapelConfig(formData: FormData): {
  mode: KelasMapelMode;
  mapelIds: string[];
} {
  const mode = (formData.get("mapelMode") as KelasMapelMode) || "ALL";
  const mapelIds = formData.getAll("mapelIds") as string[];
  return { mode, mapelIds: mapelIds.filter(Boolean) };
}

export async function createKelas(
  _prevState: KelasFormState,
  formData: FormData
): Promise<KelasFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const existing = await prisma.kelas.findUnique({
    where: { namaKelas: parsed.data.namaKelas },
  });
  if (existing) {
    return { error: `Kelas "${parsed.data.namaKelas}" sudah ada` };
  }

  const kelas = await prisma.kelas.create({
    data: {
      namaKelas: parsed.data.namaKelas,
      waliKelasId: parsed.data.waliKelasId || null,
    },
  });

  // Simpan konfigurasi mapel (jika bukan ALL, simpan; jika ALL, tidak perlu)
  const { mode, mapelIds } = parseMapelConfig(formData);
  await upsertKelasMapelConfig(kelas.id, mode, mapelIds);

  revalidatePath("/admin/master/kelas");
  redirect("/admin/master/kelas");
}

export async function updateKelas(
  id: string,
  _prevState: KelasFormState,
  formData: FormData
): Promise<KelasFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const existing = await prisma.kelas.findFirst({
    where: { namaKelas: parsed.data.namaKelas, NOT: { id } },
  });
  if (existing) {
    return { error: `Kelas "${parsed.data.namaKelas}" sudah ada` };
  }

  await prisma.kelas.update({
    where: { id },
    data: {
      namaKelas: parsed.data.namaKelas,
      waliKelasId: parsed.data.waliKelasId || null,
    },
  });

  // Update konfigurasi mapel
  const { mode, mapelIds } = parseMapelConfig(formData);
  await upsertKelasMapelConfig(id, mode, mapelIds);

  revalidatePath("/admin/master/kelas");
  redirect("/admin/master/kelas");
}

export async function deleteKelas(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  // Cascade manual dalam transaksi atomik:
  // jadwal → slot_terkunci → beban_mengajar → kelas_mapel_config → kelas
  await prisma.$transaction(async (tx) => {
    await tx.jadwal.deleteMany({ where: { kelasId: id } });
    await tx.slotTerkunci.deleteMany({ where: { kelasId: id } });
    await tx.bebanMengajar.deleteMany({ where: { kelasId: id } });
    // kelasMapelConfig ter-cascade via FK onDelete: Cascade,
    // tapi explicit di sini agar aman di semua driver
    await tx.kelasMapelConfig.deleteMany({ where: { kelasId: id } });
    await tx.kelas.delete({ where: { id } });
  });

  revalidatePath("/admin/master/kelas");
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/beban-mengajar");
}
