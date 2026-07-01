import { prisma } from "@/lib/prisma";
import KelasForm from "../KelasForm";
import { createKelas } from "../actions";
import { getSemuaMapelAktif } from "@/lib/kelas-mapel";

export default async function KelasBaruPage() {
  const [guruList, mapelList] = await Promise.all([
    prisma.guru.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, kodeGuru: true },
    }),
    getSemuaMapelAktif(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Tambah Kelas</h1>
        <p className="text-sm text-zinc-500">Isi data kelas baru di bawah ini.</p>
      </div>
      <KelasForm
        action={createKelas}
        guruList={guruList}
        mapelList={mapelList}
        submitLabel="Simpan Kelas"
      />
    </div>
  );
}
