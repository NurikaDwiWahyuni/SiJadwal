import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteMapel } from "./actions";
import { MapelBadge } from "@/lib/mapel-color";

export default async function MapelListPage({
  searchParams,
}: {
  searchParams: Promise<{ warning?: string }>;
}) {
  const { warning } = await searchParams;

  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });

  const mapelList = await prisma.mapel.findMany({
    orderBy: { kodeMapel: "asc" },
    include: periode
      ? {
          bebanMengajar: {
            where: { periodeAkademikId: periode.id },
            select: { kelasId: true, guruId: true, jp: true, guru: { select: { kodeGuru: true } } },
          },
        }
      : { bebanMengajar: false },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Mata Pelajaran</h1>
          <p className="text-sm text-zinc-500">
            Kelola mapel beserta guru pengampu per kelas. Klik Edit untuk mengatur sekaligus.
          </p>
        </div>
        <Link
          href="/admin/master/mapel/baru"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Tambah Mapel
        </Link>
      </div>

      {warning && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Sebagian guru pengampu tidak diubah: {warning}
        </div>
      )}

      {!periode && (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
          Kolom pengampu tidak ditampilkan — belum ada Periode Akademik aktif.
        </div>
      )}

      {/*
        Wrapper rounded+border TIDAK boleh pakai overflow-hidden — itu akan
        MEMOTONG konten tabel saat layar sempit/split-screen, bukan membuat
        scroll. Scroll horizontal harus terjadi di wrapper overflow-x-auto
        ini, sedangkan <table> diberi min-w-max agar kolom tidak diperas.
      */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Kode</th>
              <th className="px-4 py-3 whitespace-nowrap">Nama Mapel</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap">JP Maks</th>
              <th className="px-4 py-3 whitespace-nowrap">Pertemuan Maks</th>
              {periode && <th className="px-4 py-3 whitespace-nowrap">Pengampu</th>}
              <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {mapelList.length === 0 && (
              <tr>
                <td colSpan={periode ? 7 : 6} className="px-4 py-8 text-center text-zinc-400">
                  Belum ada data mapel.
                </td>
              </tr>
            )}
            {mapelList.map((m) => {
              const beban = (m as typeof m & { bebanMengajar?: { kelasId: string; guruId: string; jp: number; guru: { kodeGuru: string } }[] }).bebanMengajar ?? [];
              const jumlahKelas = new Set(beban.map((b) => b.kelasId)).size;
              const guruUnik = new Set(beban.map((b) => b.guruId));
              const jumlahGuru = guruUnik.size;
              const totalJp = beban.reduce((s, b) => s + b.jp, 0);
              const guruKode = jumlahGuru === 1
                ? beban[0]?.guru.kodeGuru
                : null;

              return (
                <tr key={m.id} className="hover:bg-zinc-50/50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{m.kodeMapel}</td>
                  <td className="px-4 py-3">
                    <MapelBadge nama={m.namaMapel} kode={m.kodeMapel} />
                  </td>
                  <td className="px-4 py-3">
                    {m.aktif ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 ring-1 ring-zinc-500/20">
                        Non-aktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{m.jpMaksBerurutan}</td>
                  <td className="px-4 py-3 text-zinc-700">{m.jumlahPertemuanMaks}</td>
                  {periode && (
                    <td className="px-4 py-3">
                      {jumlahKelas === 0 ? (
                        <span className="text-xs text-zinc-400">Belum ada</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-zinc-700">
                            {jumlahKelas} kelas · {totalJp} JP/mgg
                          </span>
                          <span className="text-xs text-zinc-400">
                            {jumlahGuru === 1
                              ? guruKode
                              : `${jumlahGuru} guru berbeda`}
                          </span>
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/master/mapel/${m.id}`}
                        className="text-zinc-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteMapel}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="text-red-600 hover:underline">
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
