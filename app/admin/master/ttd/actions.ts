"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const ttdSchema = z.object({
  namaKepsek: z.string().trim().min(2, "Nama kepala sekolah wajib diisi"),
  nipKepsek: z.string().trim().optional(),
  namaWaka: z.string().trim().min(2, "Nama waka kurikulum wajib diisi"),
  nipWaka: z.string().trim().optional(),
});

export type TtdFormState = {
  error?: string;
  success?: boolean;
};

export async function updateTtd(
  _prevState: TtdFormState,
  formData: FormData
): Promise<TtdFormState> {
  const parsed = ttdSchema.safeParse({
    namaKepsek: formData.get("namaKepsek"),
    nipKepsek: (formData.get("nipKepsek") as string) || "",
    namaWaka: formData.get("namaWaka"),
    nipWaka: (formData.get("nipWaka") as string) || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  await prisma.pengaturanTtd.upsert({
    where: { id: 1 },
    update: {
      namaKepsek: parsed.data.namaKepsek,
      nipKepsek: parsed.data.nipKepsek || null,
      namaWaka: parsed.data.namaWaka,
      nipWaka: parsed.data.nipWaka || null,
    },
    create: {
      id: 1,
      namaKepsek: parsed.data.namaKepsek,
      nipKepsek: parsed.data.nipKepsek || null,
      namaWaka: parsed.data.namaWaka,
      nipWaka: parsed.data.nipWaka || null,
    },
  });

  revalidatePath("/admin/master/ttd");
  return { success: true };
}
