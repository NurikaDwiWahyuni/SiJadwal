import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import { MapelBadge } from "@/lib/mapel-color";

/**
 * Halaman Review semua slot jadwal periode aktif.
 * Sort: Hari ASC → urutan slot (JP) ASC → Kelas ASC
 * Memudahkan inspeksi setelah Generate Ulang.
 */
export default async function ReviewJadwalPage() {
  const periode = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });

  if (!periode) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900">Review Jadwal</h1>
        <p className="text-sm text-zinc-500">Belum ada Periode Akademik aktif.</p>
      </div>
    );
  }

  // Ambil semua jadwal periode aktif, sort Hari → urutan slot → nama kelas
  const jadwalList = await prisma.jadwal.findMany({
    where: { periodeAkademikId: periode.id },
    orderBy: [
      { hari: "asc" },
      { slotWaktu: { urutan: "asc" } },
      { kelas: { namaKelas: "asc" } },
    ],
    include: {
      slotWaktu: true,
      kelas: true,
      guru: { select: { nama: true, kodeGuru: true } },
      bebanMengajar: { include: { mapel: true } },
    },
  });

  const total = jadwalList.length;
  const lockedCount = jadwalList.filter((j) => j.isLocked).length;
  const unlockedCount = total - lockedCount;

  // Group per hari untuk tampilan
  const byHari = new Map<string, typeof jadwalList>();
  for (const hari of HARI_LIST) byHari.set(hari, []);
  for (const j of jadwalList) {
    byHari.get(j.hari)?.push(j);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Review Jadwal</h1>
          <p className="text-sm text-zinc-500">
            Semua slot periode aktif — urutan: Hari → JP → Kelas
          </p>
        </div>
        <Link
          href="/admin/penjadwalan/generate"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          ← Kembali ke Generate
        </Link>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs text-zinc-500">Total slot</p>
          <p className="text-xl font-semibold text-zinc-900">{total}</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-600">🔒 Locked</p>
          <p className="text-xl font-semibold text-amber-800">{lockedCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs text-zinc-500">🔓 Unlocked</p>
          <p className="text-xl font-semibold text-zinc-900">{unlockedCount}</p>
        </div>
      </div>

      {total === 0 && (
        <div className="rounded-md border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
          Belum ada jadwal.{" "}
          <Link href="/admin/penjadwalan/generate" className="underline text-zinc-600">
            Generate dulu →
          </Link>
        </div>
      )}

      {/* Tabel per hari */}
      {HARI_LIST.map((hari) => {
        const rows = byHari.get(hari) ?? [];
        if (rows.length === 0) return null;
        return (
          <div key={hari} className="space-y-1">
            <p className="text-sm font-semibold text-zinc-700 px-1">{HARI_LABEL[hari]}</p>
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">JP</th>
                    <th className="px-3 py-2">Kelas</th>
                    <th className="px-3 py-2">Mapel</th>
                    <th className="px-3 py-2">Guru</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((j) => (
                    <tr
                      key={j.id}
                      className={j.isLocked ? "bg-amber-50" : "hover:bg-zinc-50/50"}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                        {j.slotWaktu.namaSlot}
                        <span className="ml-1 text-zinc-300">#{j.slotWaktu.urutan}</span>
                      </td>
                      <td className="px-3 py-2 font-medium text-zinc-800">
                        {j.kelas.namaKelas}
                      </td>
                      <td className="px-3 py-2">
                        <MapelBadge
                          nama={j.bebanMengajar.mapel.namaMapel}
                          kode={j.bebanMengajar.mapel.kodeMapel}
                          size="sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-zinc-600 text-xs">
                        {j.guru.nama}
                        <span className="ml-1 text-zinc-400">({j.guru.kodeGuru})</span>
                      </td>
                      <td className="px-3 py-2 text-center text-sm">
                        {j.isLocked ? (
                          <span title="Locked — tidak akan berubah saat generate ulang">🔒</span>
                        ) : (
                          <span title="Unlocked" className="text-zinc-300">🔓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
