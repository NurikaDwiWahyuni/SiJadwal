import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import KelasForm from "../KelasForm";
import { updateKelas } from "../actions";
import { getSemuaMapelAktif } from "@/lib/kelas-mapel";
import type { KelasMapelMode } from "@/lib/kelas-mapel";

export default async function KelasEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [kelas, guruList, mapelList] = await Promise.all([
    prisma.kelas.findUnique({
      where: { id },
      include: { mapelConfig: true },
    }),
    prisma.guru.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, kodeGuru: true },
    }),
    getSemuaMapelAktif(),
  ]);

  if (!kelas) {
    notFound();
  }

  const boundUpdateKelas = updateKelas.bind(null, id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Edit Kelas</h1>
        <p className="text-sm text-zinc-500">
          Perbarui data kelas &quot;{kelas.namaKelas}&quot;.
        </p>
      </div>
      <KelasForm
        action={boundUpdateKelas}
        guruList={guruList}
        mapelList={mapelList}
        submitLabel="Simpan Perubahan"
        defaultValues={{
          namaKelas: kelas.namaKelas,
          waliKelasId: kelas.waliKelasId,
          mapelMode: (kelas.mapelConfig?.mode ?? "ALL") as KelasMapelMode,
          mapelIds: (kelas.mapelConfig?.mapelIds as string[] | null) ?? [],
        }}
      />
    </div>
  );
}
