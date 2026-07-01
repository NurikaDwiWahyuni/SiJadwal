import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BebanMengajarView from "./BebanMengajarView";
import HapusSemuaBebanButton from "./HapusSemuaBebanButton";
import { sortKelas } from "@/lib/kelas-sort";

export default async function BebanMengajarListPage({
  searchParams,
}: {
  searchParams: Promise<{ guruId?: string }>;
}) {
  const { guruId } = await searchParams;

  const periode = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });

  const [bebanList, guruStats] = await Promise.all([
    periode
      ? prisma.bebanMengajar.findMany({
          where: { periodeAkademikId: periode.id },
          orderBy: [{ guru: { kodeGuru: "asc" } }, { mapel: { kodeMapel: "asc" } }],
          include: { guru: true, kelas: true, mapel: true },
        })
      : Promise.resolve([]),
    // Total JP per guru dihitung dari aggregate beban (bukan field manual)
    periode
      ? prisma.bebanMengajar.groupBy({
          by: ["guruId"],
          where: { periodeAkademikId: periode.id },
          _sum: { jp: true },
        })
      : Promise.resolve([]),
  ]);

  // Map guruId → total JP
  const jpPerGuru = new Map<string, number>();
  for (const g of guruStats) {
    jpPerGuru.set(g.guruId, g._sum.jp ?? 0);
  }

  // Sort kelas dengan urutan romawi yang benar (VII→VIII→IX)
  const data = bebanList
    .slice()
    .sort((a, b) => {
      if (a.guru.kodeGuru !== b.guru.kodeGuru)
        return a.guru.kodeGuru.localeCompare(b.guru.kodeGuru);
      const ka = sortKelas([a.kelas, b.kelas]);
      if (ka[0].id !== a.kelas.id) return 1;
      if (ka[0].id !== b.kelas.id) return -1;
      return a.mapel.kodeMapel.localeCompare(b.mapel.kodeMapel);
    })
    .map((b) => ({
    id: b.id,
    jp: b.jp,
    guru: {
      id: b.guru.id,
      nama: b.guru.nama,
      kodeGuru: b.guru.kodeGuru,
      totalJp: jpPerGuru.get(b.guru.id) ?? 0,
    },
    kelas: { id: b.kelas.id, namaKelas: b.kelas.namaKelas },
    mapel: { id: b.mapel.id, namaMapel: b.mapel.namaMapel, kodeMapel: b.mapel.kodeMapel },
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Beban Mengajar</h1>
          <p className="text-sm text-zinc-500">
            {periode
              ? `Periode aktif: ${periode.tahun} — ${periode.semester === "GANJIL" ? "Ganjil" : "Genap"} · Total JP guru dihitung otomatis dari beban`
              : "Belum ada periode aktif"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/master/mapel"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Edit lewat Mapel
          </Link>
          <Link
            href="/admin/master/guru"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Edit lewat Guru
          </Link>
          {periode && <HapusSemuaBebanButton />}
        </div>
      </div>

      {!periode && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Aktifkan Periode Akademik dulu sebelum menambah beban mengajar.
        </div>
      )}

      <BebanMengajarView data={data} initialQuery={""} />
    </div>
  );
}
