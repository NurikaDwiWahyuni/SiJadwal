import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HARI_LABEL, STATUS_GURU_LABEL, type HariType } from "@/lib/constants";
import { deleteGuru } from "./actions";

export default async function GuruListPage({
  searchParams,
}: {
  searchParams: Promise<{ warning?: string }>;
}) {
  const { warning } = await searchParams;

  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });

  const guruList = await prisma.guru.findMany({
    orderBy: { kodeGuru: "asc" },
    include: {
      bebanMengajar: {
        where: { periodeAkademikId: periode?.id ?? "__tidak_ada_periode__" },
        select: { jp: true, mapel: { select: { kodeMapel: true } }, kelas: { select: { namaKelas: true } } },
      },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Data Guru</h1>
          <p className="text-sm text-zinc-500">
            Kelola data guru sekaligus kelas &amp; mapel yang diampu.
          </p>
        </div>
        <Link
          href="/admin/master/guru/baru"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Tambah Guru
        </Link>
      </div>

      {warning && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Sebagian penugasan mengajar tidak diubah: {warning}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Status</th>
              {periode && <th className="px-4 py-3">Beban Mengajar</th>}
              <th className="px-4 py-3">Hari Libur</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {guruList.length === 0 && (
              <tr>
                <td colSpan={periode ? 6 : 5} className="px-4 py-8 text-center text-zinc-400">
                  Belum ada data guru.
                </td>
              </tr>
            )}
            {guruList.map((g) => {
              const hari = (g.hariTidakTersedia as HariType[] | null) ?? [];
              const beban = g.bebanMengajar;
              const totalJp = beban.reduce((s, b) => s + b.jp, 0);
              const mapelUnik = new Set(beban.map((b) => b.mapel.kodeMapel));
              const jumlahKelas = beban.length;
              const maks = g.maksJp ?? null;
              const jpStatus =
                maks === null
                  ? "no-limit"
                  : totalJp > maks
                  ? "over"
                  : totalJp < maks
                  ? "under"
                  : "ok";

              return (
                <tr key={g.id} className="hover:bg-zinc-50/50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{g.kodeGuru}</td>
                  <td className="px-4 py-3 text-zinc-700">{g.nama}</td>
                  <td className="px-4 py-3 text-zinc-700">{STATUS_GURU_LABEL[g.status]}</td>
                    {periode && (
                    <td className="px-4 py-3">
                      {beban.length === 0 ? (
                        <span className="text-xs text-zinc-400">Belum ada</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`text-xs font-medium ${
                              jpStatus === "over"
                                ? "text-red-600"
                                : jpStatus === "under"
                                ? "text-amber-600"
                                : jpStatus === "ok"
                                ? "text-green-600"
                                : "text-zinc-700"
                            }`}
                          >
                            {jumlahKelas} kelas · {totalJp} JP/mgg
                            {maks !== null && (
                              <span className="ml-1 font-normal text-zinc-400">
                                {jpStatus === "over" && `(⚠️ +${totalJp - maks} melebihi batas ${maks})`}
                                {jpStatus === "under" && `(kurang ${maks - totalJp} dari maks ${maks})`}
                                {jpStatus === "ok" && `(✅ maks ${maks})`}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {Array.from(mapelUnik).join(", ")}
                          </span>
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-zinc-700">
                    {hari.length > 0 ? hari.map((h) => HARI_LABEL[h]).join(", ") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/master/guru/${g.id}`}
                        className="text-zinc-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteGuru}>
                        <input type="hidden" name="id" value={g.id} />
                        <button
                          type="submit"
                          className="text-red-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
