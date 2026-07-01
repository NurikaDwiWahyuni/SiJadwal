"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const identitasSchema = z.object({
  namaSekolah:    z.string().trim().min(2, "Nama sekolah wajib diisi"),
  npsn:           z.string().trim().optional(),
  nss:            z.string().trim().optional(),
  alamat:         z.string().trim().optional(),
  email:          z.string().trim().optional(),
  kecamatan:      z.string().trim().optional(),
  namaPemerintah: z.string().trim().optional(),
  namaDinas:      z.string().trim().optional(),
  kurikulum:      z.string().trim().optional(),
  tahunPelajaran: z.string().trim().min(1, "Tahun pelajaran wajib diisi"),
  semester:       z.enum(["GANJIL", "GENAP"]),
  logoKiri:       z.string().optional(),
  logoKanan:      z.string().optional(),
  // Tanda tangan (gabung dari PengaturanTtd)
  namaKepsek:     z.string().trim().optional(),
  nipKepsek:      z.string().trim().optional(),
  namaWaka:       z.string().trim().optional(),
  nipWaka:        z.string().trim().optional(),
});

export type IdentitasFormState = {
  error?: string;
  success?: boolean;
};

export async function updateIdentitas(
  _prevState: IdentitasFormState,
  formData: FormData
): Promise<IdentitasFormState> {
  const parsed = identitasSchema.safeParse({
    namaSekolah:    formData.get("namaSekolah"),
    npsn:           formData.get("npsn")           || undefined,
    nss:            formData.get("nss")            || undefined,
    alamat:         formData.get("alamat")         || undefined,
    email:          formData.get("email")          || undefined,
    kecamatan:      formData.get("kecamatan")      || undefined,
    namaPemerintah: formData.get("namaPemerintah") || undefined,
    namaDinas:      formData.get("namaDinas")      || undefined,
    kurikulum:      formData.get("kurikulum")      || undefined,
    tahunPelajaran: formData.get("tahunPelajaran"),
    semester:       formData.get("semester"),
    logoKiri:       formData.get("logoKiri")       || undefined,
    logoKanan:      formData.get("logoKanan")      || undefined,
    namaKepsek:     formData.get("namaKepsek")     || undefined,
    nipKepsek:      formData.get("nipKepsek")      || undefined,
    namaWaka:       formData.get("namaWaka")       || undefined,
    nipWaka:        formData.get("nipWaka")        || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const { tahunPelajaran, semester, namaKepsek, nipKepsek, namaWaka, nipWaka, ...rest } = parsed.data;

  await prisma.$transaction(async (tx) => {
    // Simpan identitas sekolah
    await tx.identitasSekolah.upsert({
      where:  { id: 1 },
      update: { tahunPelajaran, semester, ...rest },
      create: { id: 1, tahunPelajaran, semester, ...rest },
    });

    // Simpan tanda tangan (upsert ke PengaturanTtd)
    if (namaKepsek || namaWaka) {
      await tx.pengaturanTtd.upsert({
        where:  { id: 1 },
        update: {
          namaKepsek: namaKepsek || "",
          nipKepsek:  nipKepsek  || null,
          namaWaka:   namaWaka   || "",
          nipWaka:    nipWaka    || null,
        },
        create: {
          id: 1,
          namaKepsek: namaKepsek || "",
          nipKepsek:  nipKepsek  || null,
          namaWaka:   namaWaka   || "",
          nipWaka:    nipWaka    || null,
        },
      });
    }

    // Sync PeriodeAkademik
    await tx.periodeAkademik.updateMany({ data: { statusAktif: false } });
    await tx.periodeAkademik.upsert({
      where:  { tahun_semester: { tahun: tahunPelajaran, semester } },
      update: { statusAktif: true },
      create: { tahun: tahunPelajaran, semester, statusAktif: true },
    });
  });

  revalidatePath("/admin/master/identitas-sekolah");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
