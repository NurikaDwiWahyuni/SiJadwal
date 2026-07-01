import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";

export default async function JadwalEkstrakurikulerPage() {
  const ekskulList = await prisma.ekstrakurikuler.findMany({
    orderBy: [{ hari: "asc" }, { jamMulai: "asc" }],
    include: { pembina: true },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            Jadwal Ekstrakurikuler
          </h1>
          <p className="text-sm text-zinc-500">
            Rekap jadwal ekstrakurikuler mingguan.
          </p>
        </div>
        <Link
          href="/admin/master/ekstrakurikuler"
          className="text-sm text-zinc-600 hover:underline"
        >
          Kelola Data →
        </Link>
      </div>

      <div className="space-y-4">
        {HARI_LIST.map((hari) => {
          const items = ekskulList.filter((e) => e.hari === hari);
          if (items.length === 0) return null;
          return (
            <div key={hari} className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-zinc-900">
                {HARI_LABEL[hari]}
              </p>
              <ul className="space-y-1.5">
                {items.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between text-sm text-zinc-700"
                  >
                    <span>
                      {e.nama}
                      {e.pembina ? ` — Pembina: ${e.pembina.nama}` : ""}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {e.jamMulai} - {e.jamSelesai}
                      {e.lokasi ? ` · ${e.lokasi}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {ekskulList.length === 0 && (
          <p className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
            Belum ada data ekstrakurikuler.
          </p>
        )}
      </div>
    </div>
  );
}
