import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EkskulForm from "../EkskulForm";
import { updateEkskul } from "../actions";

export default async function EkskulEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ekskul, guruList] = await Promise.all([
    prisma.ekstrakurikuler.findUnique({ where: { id } }),
    prisma.guru.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, kodeGuru: true },
    }),
  ]);

  if (!ekskul) {
    notFound();
  }

  const boundUpdateEkskul = updateEkskul.bind(null, id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Edit Ekstrakurikuler</h1>
        <p className="text-sm text-zinc-500">
          Perbarui data ekstrakurikuler &quot;{ekskul.nama}&quot;.
        </p>
      </div>
      <EkskulForm
        action={boundUpdateEkskul}
        guruList={guruList}
        submitLabel="Simpan Perubahan"
        defaultValues={{
          nama: ekskul.nama,
          pembinaId: ekskul.pembinaId,
          hari: ekskul.hari,
          jamMulai: ekskul.jamMulai,
          jamSelesai: ekskul.jamSelesai,
          lokasi: ekskul.lokasi,
        }}
      />
    </div>
  );
}
