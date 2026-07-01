"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { HARI_LIST } from "@/lib/constants";

const ekskulSchema = z.object({
  nama: z.string().trim().min(2, "Nama ekstrakurikuler wajib diisi"),
  pembinaId: z.string().trim().optional(),
  hari: z.enum(HARI_LIST),
  jamMulai: z.string().trim().min(1, "Jam mulai wajib diisi"),
  jamSelesai: z.string().trim().min(1, "Jam selesai wajib diisi"),
  lokasi: z.string().trim().optional(),
});

export type EkskulFormState = {
  error?: string;
};

function parseFormData(formData: FormData) {
  return ekskulSchema.safeParse({
    nama: formData.get("nama"),
    pembinaId: (formData.get("pembinaId") as string) || "",
    hari: formData.get("hari"),
    jamMulai: formData.get("jamMulai"),
    jamSelesai: formData.get("jamSelesai"),
    lokasi: (formData.get("lokasi") as string) || "",
  });
}

export async function createEkskul(
  _prevState: EkskulFormState,
  formData: FormData
): Promise<EkskulFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await prisma.ekstrakurikuler.create({
    data: {
      nama: parsed.data.nama,
      pembinaId: parsed.data.pembinaId || null,
      hari: parsed.data.hari,
      jamMulai: parsed.data.jamMulai,
      jamSelesai: parsed.data.jamSelesai,
      lokasi: parsed.data.lokasi || null,
    },
  });

  revalidatePath("/admin/master/ekstrakurikuler");
  redirect("/admin/master/ekstrakurikuler");
}

export async function updateEkskul(
  id: string,
  _prevState: EkskulFormState,
  formData: FormData
): Promise<EkskulFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await prisma.ekstrakurikuler.update({
    where: { id },
    data: {
      nama: parsed.data.nama,
      pembinaId: parsed.data.pembinaId || null,
      hari: parsed.data.hari,
      jamMulai: parsed.data.jamMulai,
      jamSelesai: parsed.data.jamSelesai,
      lokasi: parsed.data.lokasi || null,
    },
  });

  revalidatePath("/admin/master/ekstrakurikuler");
  redirect("/admin/master/ekstrakurikuler");
}

export async function deleteEkskul(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const slotCount = await prisma.slotTerkunci.count({
    where: { ekstrakurikulerId: id },
  });
  if (slotCount > 0) {
    throw new Error(
      "Ekstrakurikuler tidak dapat dihapus karena masih memiliki data Slot Terkunci terkait."
    );
  }

  await prisma.ekstrakurikuler.delete({ where: { id } });
  revalidatePath("/admin/master/ekstrakurikuler");
}
