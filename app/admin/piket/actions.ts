"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { HARI_LIST, type HariType } from "@/lib/constants";

const HARI_AKTIF = [...HARI_LIST] as HariType[];

/** Ambil daftar hari yang TIDAK tersedia untuk guru (dari field Json di DB). */
function hariTidakGuru(hariTidakTersedia: unknown): HariType[] {
  return Array.isArray(hariTidakTersedia) ? (hariTidakTersedia as HariType[]) : [];
}

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
    harianHari: string | null;
    karakterHari: string | null;
  }[];
  /** Guru yang TIDAK bisa di-assign penuh karena hari tersedianya terbatas/kosong */
  peringatan?: { guru: string; kode: string; pesan: string }[];
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
    select: { id: true, nama: true, kodeGuru: true, hariTidakTersedia: true },
  });

  /**
   * Distribusi:
   * - Setiap guru dapat TEPAT 1 hari Harian + 1 hari Karakter
   * - Harian ≠ Karakter untuk guru yang sama
   * - WAJIB: kedua hari HARUS di luar `hariTidakTersedia` guru — guru TIDAK BOLEH
   *   dapat piket di hari yang sudah ditandai tidak tersedia untuknya.
   * - Distribusi merata: di antara hari yang TERSEDIA, prioritaskan yang beban paling sedikit
   * - Shuffle dulu supaya tidak bias urutan
   */
  const shuffled = [...guruList].sort(() => Math.random() - 0.5);

  // Beban per hari per jenis
  const bebanH = new Map<HariType, number>(HARI_AKTIF.map((h) => [h, 0]));
  const bebanK = new Map<HariType, number>(HARI_AKTIF.map((h) => [h, 0]));

  // Hasil assign per guru (karakter bisa null kalau tidak ada hari tersisa yang valid)
  const assign = new Map<string, { harian: HariType | null; karakter: HariType | null }>();
  const peringatan: { guru: string; kode: string; pesan: string }[] = [];

  for (const g of shuffled) {
    const blocked = hariTidakGuru(g.hariTidakTersedia);
    const hariTersedia = HARI_AKTIF.filter((h) => !blocked.includes(h));

    if (hariTersedia.length === 0) {
      // Semua hari diblokir untuk guru ini — tidak bisa dapat piket sama sekali
      assign.set(g.id, { harian: null, karakter: null });
      peringatan.push({
        guru: g.nama, kode: g.kodeGuru,
        pesan: `Semua hari ditandai tidak tersedia — TIDAK di-assign piket (Harian & Karakter kosong)`,
      });
      continue;
    }

    // Pilih hari Harian: dari hari yang TERSEDIA, beban paling sedikit diprioritaskan
    const sortedH = [...hariTersedia].sort(
      (a, b) => (bebanH.get(a) ?? 0) - (bebanH.get(b) ?? 0)
    );
    const hariH = sortedH[0];

    // Pilih hari Karakter: dari hari yang TERSEDIA & bukan hari Harian, beban paling sedikit
    const sisaUntukK = hariTersedia.filter((h) => h !== hariH);
    if (sisaUntukK.length === 0) {
      // Guru ini cuma punya 1 hari tersedia total → Karakter tidak bisa diisi hari lain
      assign.set(g.id, { harian: hariH, karakter: null });
      bebanH.set(hariH, (bebanH.get(hariH) ?? 0) + 1);
      peringatan.push({
        guru: g.nama, kode: g.kodeGuru,
        pesan: `Hanya 1 hari tersedia (${hariH}) — piket Karakter TIDAK di-assign (bukan hari yang sama dengan Harian)`,
      });
      continue;
    }
    const sortedK = [...sisaUntukK].sort((a, b) => (bebanK.get(a) ?? 0) - (bebanK.get(b) ?? 0));
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
      const data: { guruId: string; periodeAkademikId: string; hari: HariType; jenisPiket: "HARIAN" | "KARAKTER" }[] = [];
      if (harian)   data.push({ guruId, periodeAkademikId: periode.id, hari: harian,   jenisPiket: "HARIAN"   });
      if (karakter) data.push({ guruId, periodeAkademikId: periode.id, hari: karakter, jenisPiket: "KARAKTER" });
      if (data.length > 0) await tx.piketGuru.createMany({ data });
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

  return { success: true, hasil, peringatan: peringatan.length > 0 ? peringatan : undefined };
}

// ─── Hapus semua piket ────────────────────────────────────────────────────────
export async function hapusSemuaPiket() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) throw new Error("Belum ada Periode Akademik aktif");

  await prisma.piketGuru.deleteMany({ where: { periodeAkademikId: periode.id } });

  revalidatePath("/admin/piket");
}
