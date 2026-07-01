import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HARI_LABEL } from "@/lib/constants";
import { deleteEkskul } from "./actions";

export default async function EkskulListPage() {
  const ekskulList = await prisma.ekstrakurikuler.findMany({
    orderBy: [{ hari: "asc" }, { jamMulai: "asc" }],
    include: { pembina: true },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Ekstrakurikuler</h1>
          <p className="text-sm text-zinc-500">
            Kelola data ekstrakurikuler, pembina, dan jadwalnya.
          </p>
        </div>
        <Link
          href="/admin/master/ekstrakurikuler/baru"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Tambah Ekskul
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Pembina</th>
              <th className="px-4 py-3">Hari</th>
              <th className="px-4 py-3">Jam</th>
              <th className="px-4 py-3">Lokasi</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {ekskulList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  Belum ada data ekstrakurikuler.
                </td>
              </tr>
            )}
            {ekskulList.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 font-medium text-zinc-900">{e.nama}</td>
                <td className="px-4 py-3 text-zinc-700">
                  {e.pembina ? `${e.pembina.nama} (${e.pembina.kodeGuru})` : "-"}
                </td>
                <td className="px-4 py-3 text-zinc-700">{HARI_LABEL[e.hari]}</td>
                <td className="px-4 py-3 text-zinc-700">
                  {e.jamMulai} - {e.jamSelesai}
                </td>
                <td className="px-4 py-3 text-zinc-700">{e.lokasi ?? "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/master/ekstrakurikuler/${e.id}`}
                      className="text-zinc-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <form action={deleteEkskul}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="text-red-600 hover:underline">
                        Hapus
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
