import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MapelForm from "../MapelForm";
import { updateMapel } from "../actions";
import { getActivePeriode } from "@/lib/periode";
import { sortKelas } from "@/lib/kelas-sort";

export default async function MapelEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mapel = await prisma.mapel.findUnique({ where: { id } });

  if (!mapel) {
    notFound();
  }

  const boundUpdateMapel = updateMapel.bind(null, id);

  const periode = await getActivePeriode();

  const [guruList, _kelasList, existingBeban, jpPerGuru] = await Promise.all([
    prisma.guru.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, kodeGuru: true, maksJp: true },
    }),
    prisma.kelas.findMany({
      orderBy: { namaKelas: "asc" },
      select: { id: true, namaKelas: true },
    }),
    periode
      ? prisma.bebanMengajar.findMany({
          where: { mapelId: id, periodeAkademikId: periode.id },
          select: { kelasId: true, guruId: true, jp: true },
        })
      : Promise.resolve([]),
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

  // JP yang berasal dari mapel INI sendiri per guru (agar tidak dihitung dua kali saat disable check)
  const jpDariMapelIni = new Map<string, number>();
  for (const b of existingBeban) {
    jpDariMapelIni.set(b.guruId, (jpDariMapelIni.get(b.guruId) ?? 0) + b.jp);
  }

  const existingMap: Record<string, { guruId: string; jp: number }> = {};
  for (const b of existingBeban) {
    existingMap[b.kelasId] = { guruId: b.guruId, jp: b.jp };
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Edit Mapel</h1>
        <p className="text-sm text-zinc-500">
          Perbarui data mapel &quot;{mapel.namaMapel}&quot; serta guru
          pengampunya per kelas.
        </p>
      </div>
      <MapelForm
        action={boundUpdateMapel}
        submitLabel="Simpan Perubahan"
        defaultValues={{
          namaMapel: mapel.namaMapel,
          kodeMapel: mapel.kodeMapel,
          jpMaksBerurutan: mapel.jpMaksBerurutan,
          jumlahPertemuanMaks: mapel.jumlahPertemuanMaks,
          aktif: mapel.aktif,
        }}
        kelasList={kelasList}
        guruList={guruListWithJp}
        jpDariMapelIni={Object.fromEntries(jpDariMapelIni)}
        existingPengampu={existingMap}
        periodeAktif={!!periode}
      />
    </div>
  );
}
