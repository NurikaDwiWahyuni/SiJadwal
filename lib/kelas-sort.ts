/**
 * lib/kelas-sort.ts
 *
 * Sorting kelas berdasarkan urutan tingkat (VII → VIII → IX)
 * lalu nomor kelas (1, 2, 3, ...).
 *
 * Tanpa ini, sort alfabet memberi urutan salah: IX-1, VII-1, VIII-1.
 */

const ROMAN: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5,
  VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
};

/** Urai "VIII-3 Unggulan" → { tingkat: 8, nomor: 3, suffix: "Unggulan" } */
function parseNamaKelas(nama: string): { tingkat: number; nomor: number; suffix: string } {
  // Cocokkan: opsional spasi, angka romawi, opsional pemisah (- / spasi), opsional nomor, sisa
  const m = nama.trim().match(/^(IX|VIII|VII|VI|V|IV|III|II|I)[\s\-_]?(\d*)(.*)/i);
  if (!m) return { tingkat: 0, nomor: 0, suffix: nama };
  const tingkat = ROMAN[m[1].toUpperCase()] ?? 0;
  const nomor   = m[2] ? parseInt(m[2], 10) : 0;
  const suffix  = m[3].trim();
  return { tingkat, nomor, suffix };
}

/**
 * Sort array of objects yang punya field `namaKelas`.
 * Mengembalikan array baru (tidak mutate original).
 */
export function sortKelas<T extends { namaKelas: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const pa = parseNamaKelas(a.namaKelas);
    const pb = parseNamaKelas(b.namaKelas);
    if (pa.tingkat !== pb.tingkat) return pa.tingkat - pb.tingkat;
    if (pa.nomor   !== pb.nomor)   return pa.nomor   - pb.nomor;
    return pa.suffix.localeCompare(pb.suffix);
  });
}
