import MapelForm from "../MapelForm";
import { createMapel } from "../actions";
import { prisma } from "@/lib/prisma";
import { getActivePeriode } from "@/lib/periode";
import { sortKelas } from "@/lib/kelas-sort";

export default async function MapelBaruPage() {
  const periode = await getActivePeriode();

  const [_kelasList, guruList, jpPerGuru] = await Promise.all([
    prisma.kelas.findMany({
      orderBy: { namaKelas: "asc" },
      select: { id: true, namaKelas: true },
    }),
    prisma.guru.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, kodeGuru: true, maksJp: true },
    }),
    periode
      ? prisma.bebanMengajar.groupBy({
          by: ["guruId"],
          where: { periodeAkademikId: periode.id },
          _sum: { jp: true },
        })
      : Promise.resolve([]),
  ]);

  const kelasList = sortKelas(_kelasList);
  const jpMap = new Map<string, number>();
  for (const g of jpPerGuru) jpMap.set(g.guruId, g._sum.jp ?? 0);

  const guruListWithJp = guruList.map((g) => ({
    ...g,
    totalJp: jpMap.get(g.id) ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Tambah Mapel</h1>
        <p className="text-sm text-zinc-500">
          Isi data mata pelajaran, lalu langsung pilih guru pengampu tiap kelas
          (opsional, bisa diisi belakangan juga).
        </p>
      </div>
      <MapelForm
        action={createMapel}
        submitLabel="Simpan Mapel"
        kelasList={kelasList}
        guruList={guruListWithJp}
        existingPengampu={{}}
        periodeAktif={!!periode}
      />
    </div>
  );
}
