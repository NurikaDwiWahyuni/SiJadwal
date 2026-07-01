"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { HARI_LIST } from "@/lib/constants";

const guruSchema = z.object({
  kodeGuru: z
    .string()
    .trim()
    .min(2, "Kode guru minimal 2 karakter")
    .max(10, "Kode guru maksimal 10 karakter")
    .toUpperCase(),
  nama: z.string().trim().min(3, "Nama guru wajib diisi"),
  status: z.enum(["PNS", "HONOR"]),
  hariTidakTersedia: z.array(z.enum(HARI_LIST)).default([]),
  maksJp: z.coerce.number().int().min(1).nullable().optional(),
});

export type GuruFormState = {
  error?: string;
};

function parseFormData(formData: FormData) {
  const hariTidakTersedia = formData.getAll("hariTidakTersedia") as string[];
  const maksJpRaw = formData.get("maksJp");
  return guruSchema.safeParse({
    kodeGuru: formData.get("kodeGuru"),
    nama: formData.get("nama"),
    status: formData.get("status"),
    hariTidakTersedia,
    maksJp: maksJpRaw ? Number(maksJpRaw) : null,
  });
}

export async function createGuru(
  _prevState: GuruFormState,
  formData: FormData
): Promise<GuruFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const existing = await prisma.guru.findUnique({
    where: { kodeGuru: parsed.data.kodeGuru },
  });
  if (existing) {
    return { error: `Kode guru "${parsed.data.kodeGuru}" sudah digunakan` };
  }

  await prisma.guru.create({
    data: {
      kodeGuru: parsed.data.kodeGuru,
      nama: parsed.data.nama,
      status: parsed.data.status,
      hariTidakTersedia: parsed.data.hariTidakTersedia,
      maksJp: parsed.data.maksJp ?? null,
    },
  });

  revalidatePath("/admin/master/guru");
  redirect("/admin/master/guru");
}

export async function updateGuru(
  id: string,
  _prevState: GuruFormState,
  formData: FormData
): Promise<GuruFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const existing = await prisma.guru.findFirst({
    where: { kodeGuru: parsed.data.kodeGuru, NOT: { id } },
  });
  if (existing) {
    return { error: `Kode guru "${parsed.data.kodeGuru}" sudah digunakan` };
  }

  // Ambil data mengajar dari formData
  const mapelIds = formData.getAll("mengajarMapelId") as string[];
  const kelasIds = formData.getAll("mengajarKelasId") as string[];
  const jps = formData.getAll("mengajarJp") as string[];

  await prisma.$transaction(async (tx) => {
    await tx.guru.update({
      where: { id },
      data: {
        kodeGuru: parsed.data.kodeGuru,
        nama: parsed.data.nama,
        status: parsed.data.status,
        hariTidakTersedia: parsed.data.hariTidakTersedia,
        maksJp: parsed.data.maksJp ?? null,
      },
    });

    if (mapelIds.length > 0) {
      const periode = await tx.periodeAkademik.findFirst({ where: { statusAktif: true } });
      if (periode) {
        await tx.bebanMengajar.deleteMany({ where: { guruId: id, periodeAkademikId: periode.id } });
        await tx.bebanMengajar.createMany({
          data: mapelIds.map((mapelId, i) => ({
            guruId: id,
            mapelId,
            kelasId: kelasIds[i],
            jp: parseInt(jps[i] ?? "2", 10),
            periodeAkademikId: periode.id,
          })),
        });
      }
    }
  });

  revalidatePath("/admin/master/guru");
  redirect("/admin/master/guru");
}

export async function deleteGuru(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  // Urutan cascade wajib mengikuti dependency FK:
  //   Jadwal  →  BebanMengajar  →  PiketGuru  →  Guru
  // Kelas dan Ekskul tidak dihapus, hanya dilepas (set null).
  //
  // CATATAN PENTING: Jadwal.guruId BISA TIDAK SAMA dengan BebanMengajar.guruId
  // milik guru ini — data lama bisa "nyangkut" akibat riwayat generate/edit
  // manual sebelumnya (mis. guru pengampu pernah diganti setelah jadwal
  // sempat digenerate). Maka penghapusan Jadwal HARUS mencakup KEDUA jalur:
  //   a) jadwal.guruId = guru ini, DAN
  //   b) jadwal.bebanMengajarId termasuk salah satu BebanMengajar guru ini
  // Kalau hanya (a), baris Jadwal yang nyangkut lewat (b) akan tertinggal
  // dan menyebabkan FK constraint gagal saat tx.guru.delete() dijalankan.
  await prisma.$transaction(async (tx) => {
    // 0. Kumpulkan semua bebanMengajarId milik guru ini lebih dulu
    const bebanMilikGuru = await tx.bebanMengajar.findMany({
      where: { guruId: id },
      select: { id: true },
    });
    const bebanIds = bebanMilikGuru.map((b) => b.id);

    // 1. Hapus SEMUA jadwal yang terkait guru ini — baik lewat guruId
    //    langsung, maupun lewat bebanMengajarId (jaga-jaga data nyangkut)
    await tx.jadwal.deleteMany({
      where: {
        OR: [
          { guruId: id },
          ...(bebanIds.length > 0 ? [{ bebanMengajarId: { in: bebanIds } }] : []),
        ],
      },
    });

    // 2. Hapus beban mengajar milik guru ini
    await tx.bebanMengajar.deleteMany({ where: { guruId: id } });

    // 3. Hapus piket guru ini
    await tx.piketGuru.deleteMany({ where: { guruId: id } });

    // 4. Lepas wali kelas (kelas tetap ada, walinya dikosongkan)
    await tx.kelas.updateMany({
      where: { waliKelasId: id },
      data: { waliKelasId: null },
    });

    // 5. Lepas pembina ekskul (ekskul tetap ada, pembinannya dikosongkan)
    await tx.ekstrakurikuler.updateMany({
      where: { pembinaId: id },
      data: { pembinaId: null },
    });

    // 6. Hapus guru
    try {
      await tx.guru.delete({ where: { id } });
    } catch (err) {
      // DEBUG SEMENTARA: cek sisa baris yang masih nyangkut tepat sebelum gagal.
      // Hapus blok try/catch ini setelah bug ketemu.
      const [bm, jg, jb, pg, kw, ek] = await Promise.all([
        tx.bebanMengajar.count({ where: { guruId: id } }),
        tx.jadwal.count({ where: { guruId: id } }),
        tx.jadwal.count({ where: { bebanMengajar: { guruId: id } } }),
        tx.piketGuru.count({ where: { guruId: id } }),
        tx.kelas.count({ where: { waliKelasId: id } }),
        tx.ekstrakurikuler.count({ where: { pembinaId: id } }),
      ]);
      console.error("[deleteGuru DEBUG] gagal hapus guru id:", id);
      console.error("[deleteGuru DEBUG] sisa relasi tepat sebelum delete gagal ->", {
        bebanMengajar: bm,
        jadwalGuruId: jg,
        jadwalLewatBeban: jb,
        piketGuru: pg,
        kelasWali: kw,
        ekstrakurikuler: ek,
      });
      throw err;
    }
  });

  revalidatePath("/admin/master/guru");
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
  revalidatePath("/admin/beban-mengajar");
  revalidatePath("/admin/piket");
}
