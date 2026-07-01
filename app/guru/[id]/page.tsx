import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HARI_LIST, HARI_LABEL, STATUS_GURU_LABEL } from "@/lib/constants";

export default async function GuruDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const guru = await prisma.guru.findUnique({ where: { id } });
  if (!guru) {
    notFound();
  }

  const periode = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });

  const [jadwalList, piket, ekskulDibina] = await Promise.all([
    periode
      ? prisma.jadwal.findMany({
          where: { guruId: id, periodeAkademikId: periode.id },
          orderBy: [{ hari: "asc" }, { slotWaktu: { urutan: "asc" } }],
          include: {
            slotWaktu: true,
            kelas: true,
            bebanMengajar: { include: { mapel: true } },
          },
        })
      : Promise.resolve([]),
    periode
      ? prisma.piketGuru.findFirst({
          where: { guruId: id, periodeAkademikId: periode.id },
        })
      : Promise.resolve(null),
    prisma.ekstrakurikuler.findMany({ where: { pembinaId: id } }),
  ]);

  const jadwalPerHari = HARI_LIST.map((hari) => ({
    hari,
    items: jadwalList.filter((j) => j.hari === hari),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← Kembali ke pencarian
        </Link>

        <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-5">
          <h1 className="text-xl font-semibold text-zinc-900">{guru.nama}</h1>
          <p className="text-sm text-zinc-500">
            {guru.kodeGuru} · {STATUS_GURU_LABEL[guru.status]}
          </p>
          {piket && (
            <p className="mt-2 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Piket: {HARI_LABEL[piket.hari]}
            </p>
          )}
        </div>

        {!periode && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Belum ada periode akademik aktif, jadwal belum tersedia.
          </div>
        )}

        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">
            Jadwal Mengajar
          </h2>
          {jadwalPerHari.length === 0 && periode && (
            <p className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
              Belum ada jadwal mengajar untuk periode ini.
            </p>
          )}
          <div className="space-y-3">
            {jadwalPerHari.map(({ hari, items }) => (
              <div key={hari} className="rounded-lg border border-zinc-200 bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-zinc-900">
                  {HARI_LABEL[hari]}
                </p>
                <ul className="space-y-1.5">
                  {items.map((j) => (
                    <li
                      key={j.id}
                      className="flex items-center justify-between text-sm text-zinc-700"
                    >
                      <span>
                        {j.bebanMengajar.mapel.namaMapel} — {j.kelas.namaKelas}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {j.slotWaktu.namaSlot}
                        {j.slotWaktu.jamMulai ? ` (${j.slotWaktu.jamMulai})` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {ekskulDibina.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-zinc-900">
              Ekstrakurikuler yang Dibina
            </h2>
            <div className="space-y-2">
              {ekskulDibina.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3 text-sm"
                >
                  <p className="font-medium text-zinc-900">{e.nama}</p>
                  <p className="text-xs text-zinc-500">
                    {HARI_LABEL[e.hari]}, {e.jamMulai} - {e.jamSelesai}
                    {e.lokasi ? ` · ${e.lokasi}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
