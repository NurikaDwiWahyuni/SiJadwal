import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BebanForm from "../BebanForm";
import { updateBeban } from "../actions";

export default async function BebanEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [beban, guruList, kelasList, mapelList] = await Promise.all([
    prisma.bebanMengajar.findUnique({ where: { id } }),
    prisma.guru.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, kodeGuru: true, maksJp: true },
    }),
    prisma.kelas.findMany({ orderBy: { namaKelas: "asc" }, select: { id: true, namaKelas: true } }),
    prisma.mapel.findMany({
      orderBy: { kodeMapel: "asc" },
      select: { id: true, namaMapel: true, kodeMapel: true },
    }),
  ]);

  if (!beban) {
    notFound();
  }

  const allBeban = await prisma.bebanMengajar.findMany({
    where: { periodeAkademikId: beban.periodeAkademikId },
    select: {
      id: true,
      guruId: true,
      kelasId: true,
      mapelId: true,
      jp: true,
      kelas: { select: { namaKelas: true } },
      mapel: { select: { namaMapel: true, kodeMapel: true } },
    },
  });

  const jpPerGuru = await prisma.bebanMengajar.groupBy({
    by: ["guruId"],
    where: { periodeAkademikId: beban.periodeAkademikId },
    _sum: { jp: true },
  });
  const jpMap = new Map<string, number>();
  for (const g of jpPerGuru) jpMap.set(g.guruId, g._sum.jp ?? 0);

  const guruListWithJp = guruList.map((g) => ({
    ...g,
    totalJp: jpMap.get(g.id) ?? 0,
  }));

  const boundUpdateBeban = updateBeban.bind(null, id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Edit Beban Mengajar</h1>
        <p className="text-sm text-zinc-500">Perbarui data beban mengajar.</p>
      </div>
      <BebanForm
        action={boundUpdateBeban}
        guruList={guruListWithJp}
        kelasList={kelasList}
        mapelList={mapelList}
        allBeban={allBeban}
        editingId={id}
        submitLabel="Simpan Perubahan"
        defaultValues={{
          guruId: beban.guruId,
          kelasId: beban.kelasId,
          mapelId: beban.mapelId,
          jp: beban.jp,
        }}
      />
    </div>
  );
}
