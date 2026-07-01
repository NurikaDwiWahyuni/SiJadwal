import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteKelas } from "./actions";
import { sortKelas } from "@/lib/kelas-sort";

export default async function KelasListPage() {
  const kelasList = sortKelas(await prisma.kelas.findMany({
    include: { waliKelas: true },
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Data Kelas</h1>
          <p className="text-sm text-zinc-500">Kelola data kelas dan wali kelas.</p>
        </div>
        <Link
          href="/admin/master/kelas/baru"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Tambah Kelas
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Kelas</th>
              <th className="px-4 py-3">Wali Kelas</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {kelasList.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-400">
                  Belum ada data kelas.
                </td>
              </tr>
            )}
            {kelasList.map((k) => (
              <tr key={k.id}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {k.namaKelas}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {k.waliKelas ? `${k.waliKelas.nama} (${k.waliKelas.kodeGuru})` : "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/master/kelas/${k.id}`}
                      className="text-zinc-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <form action={deleteKelas}>
                      <input type="hidden" name="id" value={k.id} />
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
