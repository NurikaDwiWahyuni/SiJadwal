"use server";

import { prisma } from "@/lib/prisma";
import { generateJadwal } from "@/lib/scheduler";
import { revalidatePath } from "next/cache";

export type AutoFixResult = {
  totalBeban:  number;
  berhasil:    number;
  gagal:       number;
  runsUsed:    number;
  selesai:     boolean;
  gagalDetail: { kelas: string; guru: string; mapel: string; alasan: string }[];
};

function revalidateAll() {
  revalidatePath("/admin/penjadwalan/generate");
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
  revalidatePath("/admin/laporan/jadwal");
}

export async function autoFixAndRegenerate(): Promise<AutoFixResult> {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) throw new Error("Belum ada periode aktif");

  // Fase autofix: 120 runs, split lebih longgar, backtracking aktif
  const result = await generateJadwal(periode.id, "autofix");
  revalidateAll();

  // Deduplikasi gagal per beban unik
  const gagalMap = new Map<string, (typeof result.gagal)[0]>();
  for (const g of result.gagal) {
    const key = `${g.guruId}|${g.kelasId}|${g.mapelId}`;
    if (!gagalMap.has(key)) gagalMap.set(key, g);
  }

  const totalBeban = await prisma.bebanMengajar.count({
    where: { periodeAkademikId: periode.id },
  });

  return {
    totalBeban,
    berhasil:    totalBeban - gagalMap.size,
    gagal:       gagalMap.size,
    runsUsed:    result.runsUsed,
    selesai:     gagalMap.size === 0,
    gagalDetail: [...gagalMap.values()].map(g => ({
      kelas: g.kelas, guru: g.guru, mapel: g.mapel, alasan: g.alasan,
    })),
  };
}
