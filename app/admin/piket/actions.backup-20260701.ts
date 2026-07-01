"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { HARI_LIST, type HariType } from "@/lib/constants";

const HARI_AKTIF = [...HARI_LIST] as HariType[];

// ─── Set hari piket manual 1 guru ────────────────────────────────────────────
export async function setPiketGuru(formData: FormData) {
  const guruId     = formData.get("guruId") as string;
  const hari       = (formData.get("hari") as string) || null;
  const jenisPiket = (formData.get("jenisPiket") as "HARIAN" | "KARAKTER") ?? "HARIAN";

  if (!guruId) return;

  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) throw new Error("Belum ada Periode Akademik aktif");

  if (!hari) {
    await prisma.piketGuru.deleteMany({
      where: { guruId, periodeAkademikId: periode.id, jenisPiket },
    });
  } else {
    await prisma.piketGuru.upsert({
      where: { guruId_periodeAkademikId_jenisPiket: { guruId, periodeAkademikId: periode.id, jenisPiket } },
      update: { hari: hari as HariType },
      create: { guruId, periodeAkademikId: periode.id, hari: hari as HariType, jenisPiket },
    });
  }

  revalidatePath("/admin/piket");
}

// ─── Generate piket otomatis ─────────────────────────────────────────────────
export type GeneratePiketState = {
  success?: boolean;
  error?: string;
  hasil?: {
    guru: string;
    kode: string;
    harianHari: string;
    karakterHari: string;
  }[];
};

export async function generatePiket(
  _prev: GeneratePiketState,
  formData: FormData
): Promise<GeneratePiketState> {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) return { error: "Belum ada Periode Akademik aktif" };

  const guruIds = formData.getAll("guruDipilih") as string[];
  if (guruIds.length === 0) return { error: "Pilih minimal 1 guru untuk di-generate" };

  const guruList = await prisma.guru.findMany({
    where: { id: { in: guruIds } },
    select: { id: true, nama: true, kodeGuru: true },
  });

  /**
   * Distribusi:
   * - Setiap guru dapat TEPAT 1 hari Harian + 1 hari Karakter
   * - Harian ≠ Karakter untuk guru yang sama
   * - Distribusi merata: hari dengan beban paling sedikit diprioritaskan
   * - Shuffle dulu supaya tidak bias urutan
   */
  const shuffled = [...guruList].sort(() => Math.random() - 0.5);

  // Beban per hari per jenis
  const bebanH = new Map<HariType, number>(HARI_AKTIF.map((h) => [h, 0]));
  const bebanK = new Map<HariType, number>(HARI_AKTIF.map((h) => [h, 0]));

  // Hasil assign per guru
  const assign = new Map<string, { harian: HariType; karakter: HariType }>();

  for (const g of shuffled) {
    // Pilih hari Harian: beban paling sedikit
    const sortedH = [...HARI_AKTIF].sort(
      (a, b) => (bebanH.get(a) ?? 0) - (bebanH.get(b) ?? 0)
    );
    const hariH = sortedH[0];

    // Pilih hari Karakter: beban paling sedikit, TAPI bukan hari Harian yang sama
    const sortedK = [...HARI_AKTIF]
      .filter((h) => h !== hariH)
      .sort((a, b) => (bebanK.get(a) ?? 0) - (bebanK.get(b) ?? 0));
    const hariK = sortedK[0];

    assign.set(g.id, { harian: hariH, karakter: hariK });
    bebanH.set(hariH, (bebanH.get(hariH) ?? 0) + 1);
    bebanK.set(hariK, (bebanK.get(hariK) ?? 0) + 1);
  }

  // Simpan ke DB dalam satu transaksi
  await prisma.$transaction(async (tx) => {
    // Hapus semua piket lama untuk guru-guru yang dipilih
    await tx.piketGuru.deleteMany({
      where: { periodeAkademikId: periode.id, guruId: { in: guruIds } },
    });

    for (const [guruId, { harian, karakter }] of assign) {
      await tx.piketGuru.createMany({
        data: [
          { guruId, periodeAkademikId: periode.id, hari: harian,  jenisPiket: "HARIAN"   },
          { guruId, periodeAkademikId: periode.id, hari: karakter, jenisPiket: "KARAKTER" },
        ],
      });
    }
  });

  revalidatePath("/admin/piket");

  const hasil = guruList.map((g) => {
    const { harian, karakter } = assign.get(g.id)!;
    return {
      guru:         g.nama,
      kode:         g.kodeGuru,
      harianHari:   harian,
      karakterHari: karakter,
    };
  }).sort((a, b) => a.kode.localeCompare(b.kode));

  return { success: true, hasil };
}

// ─── Hapus semua piket ────────────────────────────────────────────────────────
export async function hapusSemuaPiket() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) throw new Error("Belum ada Periode Akademik aktif");

  await prisma.piketGuru.deleteMany({ where: { periodeAkademikId: periode.id } });

  revalidatePath("/admin/piket");
}
