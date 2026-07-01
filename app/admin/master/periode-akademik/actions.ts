"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const periodeSchema = z.object({
  tahun: z
    .string()
    .trim()
    .regex(/^\d{4}\/\d{4}$/, "Format tahun: 2026/2027"),
  semester: z.enum(["GANJIL", "GENAP"]),
});

export type PeriodeFormState = {
  error?: string;
};

function parseFormData(formData: FormData) {
  return periodeSchema.safeParse({
    tahun: formData.get("tahun"),
    semester: formData.get("semester"),
  });
}

export async function createPeriode(
  _prevState: PeriodeFormState,
  formData: FormData
): Promise<PeriodeFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const existing = await prisma.periodeAkademik.findUnique({
    where: {
      tahun_semester: { tahun: parsed.data.tahun, semester: parsed.data.semester },
    },
  });
  if (existing) {
    return { error: "Periode dengan tahun & semester tersebut sudah ada" };
  }

  const totalPeriode = await prisma.periodeAkademik.count();

  await prisma.periodeAkademik.create({
    data: {
      tahun: parsed.data.tahun,
      semester: parsed.data.semester,
      statusAktif: totalPeriode === 0,
    },
  });

  revalidatePath("/admin/master/periode-akademik");
  redirect("/admin/master/periode-akademik");
}

export async function updatePeriode(
  id: string,
  _prevState: PeriodeFormState,
  formData: FormData
): Promise<PeriodeFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const existing = await prisma.periodeAkademik.findFirst({
    where: {
      tahun: parsed.data.tahun,
      semester: parsed.data.semester,
      NOT: { id },
    },
  });
  if (existing) {
    return { error: "Periode dengan tahun & semester tersebut sudah ada" };
  }

  await prisma.periodeAkademik.update({
    where: { id },
    data: { tahun: parsed.data.tahun, semester: parsed.data.semester },
  });

  revalidatePath("/admin/master/periode-akademik");
  redirect("/admin/master/periode-akademik");
}

export async function setActivePeriode(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.$transaction([
    prisma.periodeAkademik.updateMany({
      data: { statusAktif: false },
      where: { NOT: { id } },
    }),
    prisma.periodeAkademik.update({
      where: { id },
      data: { statusAktif: true },
    }),
  ]);

  revalidatePath("/admin/master/periode-akademik");
  revalidatePath("/admin/dashboard");
}

export async function deletePeriode(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const [bebanCount, jadwalCount, slotCount, piketCount] = await Promise.all([
    prisma.bebanMengajar.count({ where: { periodeAkademikId: id } }),
    prisma.jadwal.count({ where: { periodeAkademikId: id } }),
    prisma.slotTerkunci.count({ where: { periodeAkademikId: id } }),
    prisma.piketGuru.count({ where: { periodeAkademikId: id } }),
  ]);

  if (bebanCount > 0 || jadwalCount > 0 || slotCount > 0 || piketCount > 0) {
    throw new Error(
      "Periode tidak dapat dihapus karena masih memiliki data Beban Mengajar/Jadwal/Slot Terkunci/Piket terkait."
    );
  }

  await prisma.periodeAkademik.delete({ where: { id } });
  revalidatePath("/admin/master/periode-akademik");
}
