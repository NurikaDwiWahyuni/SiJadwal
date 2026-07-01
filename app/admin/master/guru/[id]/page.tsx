import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuruForm from "../GuruForm";
import { updateGuru } from "../actions";
import type { HariType } from "@/lib/constants";

export default async function GuruEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const guru = await prisma.guru.findUnique({ where: { id } });

  if (!guru) {
    notFound();
  }

  const boundUpdateGuru = updateGuru.bind(null, id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Edit Guru</h1>
        <p className="text-sm text-zinc-500">
          Perbarui data guru &quot;{guru.nama}&quot;. Penugasan mapel &amp; kelas diatur di Master Data &gt; Mata Pelajaran.
        </p>
      </div>
      <GuruForm
        action={boundUpdateGuru}
        submitLabel="Simpan Perubahan"
        defaultValues={{
          kodeGuru: guru.kodeGuru,
          nama: guru.nama,
          status: guru.status,
          hariTidakTersedia: (guru.hariTidakTersedia as HariType[] | null) ?? [],
          maksJp: guru.maksJp ?? null,
        }}
      />
    </div>
  );
}
