/**
 * lib/kelas-mapel.ts
 *
 * Helper untuk menghitung daftar mapel efektif per kelas berdasarkan
 * konfigurasi KelasMapelConfig.
 *
 * ATURAN:
 *   - Tidak ada config (atau mode ALL) → semua mapel aktif
 *   - mode CUSTOM  → hanya mapelIds yang terdaftar (dari yang aktif)
 *   - mode EXCLUDE → semua mapel aktif dikurangi mapelIds yang dikecualikan
 *
 * Formula: efektif = (semua mapel aktif) - (dikecualikan) + (khusus kelas)
 * Dalam implementasi:
 *   ALL    = semua aktif
 *   CUSTOM = semua aktif ∩ daftar = "hanya yang dipilih" (subset aktif)
 *   EXCLUDE= semua aktif − daftar
 */

import { prisma } from "@/lib/prisma";

export type KelasMapelMode = "ALL" | "CUSTOM" | "EXCLUDE";

export type MapelRingkas = {
  id: string;
  namaMapel: string;
  kodeMapel: string;
};

/**
 * Hitung daftar mapelId efektif untuk satu kelas.
 * Jika tidak ada konfigurasi, default ke ALL (semua mapel aktif).
 */
export async function getEfektifMapelIds(kelasId: string): Promise<string[]> {
  const [config, semuaAktif] = await Promise.all([
    prisma.kelasMapelConfig.findUnique({ where: { kelasId } }),
    prisma.mapel.findMany({ where: { aktif: true }, select: { id: true } }),
  ]);

  const semuaAktifIds = semuaAktif.map((m) => m.id);
  return hitungEfektif(semuaAktifIds, config);
}

/**
 * Batch version: hitung efektif mapelId untuk banyak kelas sekaligus.
 * Lebih efisien — hanya query sekali untuk semua config dan mapel aktif.
 */
export async function getEfektifMapelIdsBatch(
  kelasIds: string[]
): Promise<Map<string, Set<string>>> {
  if (kelasIds.length === 0) return new Map();

  const [configs, semuaAktif] = await Promise.all([
    prisma.kelasMapelConfig.findMany({
      where: { kelasId: { in: kelasIds } },
    }),
    prisma.mapel.findMany({ where: { aktif: true }, select: { id: true } }),
  ]);

  const semuaAktifIds = semuaAktif.map((m) => m.id);
  const configMap = new Map(configs.map((c) => [c.kelasId, c]));
  const result = new Map<string, Set<string>>();

  for (const kelasId of kelasIds) {
    const config = configMap.get(kelasId) ?? null;
    const efektif = hitungEfektif(semuaAktifIds, config);
    result.set(kelasId, new Set(efektif));
  }

  return result;
}

/**
 * Internal: terapkan logika mode ke daftar semua mapel aktif.
 */
function hitungEfektif(
  semuaAktifIds: string[],
  config: { mode: string; mapelIds: unknown } | null
): string[] {
  if (!config || config.mode === "ALL") {
    return semuaAktifIds;
  }

  const daftar = (config.mapelIds as string[] | null) ?? [];

  if (config.mode === "CUSTOM") {
    // Hanya yang ada di daftar DAN masih aktif
    const daftarSet = new Set(daftar);
    return semuaAktifIds.filter((id) => daftarSet.has(id));
  }

  // EXCLUDE: semua aktif kecuali yang ada di daftar
  const excludeSet = new Set(daftar);
  return semuaAktifIds.filter((id) => !excludeSet.has(id));
}

/**
 * Ambil semua mapel aktif sebagai daftar ringkas (untuk UI picker).
 */
export async function getSemuaMapelAktif(): Promise<MapelRingkas[]> {
  return prisma.mapel.findMany({
    where: { aktif: true },
    orderBy: { namaMapel: "asc" },
    select: { id: true, namaMapel: true, kodeMapel: true },
  });
}

/**
 * Upsert KelasMapelConfig.
 * Jika mode = ALL dan tidak ada mapelIds, hapus config (kembali ke default).
 */
export async function upsertKelasMapelConfig(
  kelasId: string,
  mode: KelasMapelMode,
  mapelIds: string[]
): Promise<void> {
  // Mode ALL tanpa data khusus = default → hapus record jika ada
  if (mode === "ALL") {
    await prisma.kelasMapelConfig.deleteMany({ where: { kelasId } });
    return;
  }

  await prisma.kelasMapelConfig.upsert({
    where: { kelasId },
    update: { mode, mapelIds, updatedAt: new Date() },
    create: { kelasId, mode, mapelIds, updatedAt: new Date() },
  });
}
