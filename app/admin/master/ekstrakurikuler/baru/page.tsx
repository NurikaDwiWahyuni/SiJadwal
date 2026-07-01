import { prisma } from "@/lib/prisma";
import EkskulForm from "../EkskulForm";
import { createEkskul } from "../actions";

export default async function EkskulBaruPage() {
  const guruList = await prisma.guru.findMany({
    orderBy: { nama: "asc" },
    select: { id: true, nama: true, kodeGuru: true },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Tambah Ekstrakurikuler</h1>
        <p className="text-sm text-zinc-500">Isi data ekstrakurikuler baru.</p>
      </div>
      <EkskulForm action={createEkskul} guruList={guruList} submitLabel="Simpan Ekskul" />
    </div>
  );
}
