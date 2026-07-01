import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BebanForm from "../BebanForm";
import { createBeban } from "../actions";
import { sortKelas } from "@/lib/kelas-sort";

export default async function BebanBaruPage() {
  const periode = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });

  if (!periode) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900">Tambah Beban Mengajar</h1>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Belum ada Periode Akademik aktif.{" "}
          <Link href="/admin/master/periode-akademik" className="underline">
            Atur di sini
          </Link>
          .
        </div>
      </div>
    );
  }

  const [guruList, kelasList, mapelList, allBeban, jpPerGuru] = await Promise.all([
    prisma.guru.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, kodeGuru: true, maksJp: true },
    }),
    sortKelas(await prisma.kelas.findMany({ select: { id: true, namaKelas: true } })),
    prisma.mapel.findMany({
      orderBy: { kodeMapel: "asc" },
      select: { id: true, namaMapel: true, kodeMapel: true },
    }),
    prisma.bebanMengajar.findMany({
      where: { periodeAkademikId: periode.id },
      select: {
        id: true,
        guruId: true,
        kelasId: true,
        mapelId: true,
        jp: true,
        kelas: { select: { namaKelas: true } },
        mapel: { select: { namaMapel: true, kodeMapel: true } },
      },
    }),
    prisma.bebanMengajar.groupBy({
      by: ["guruId"],
      where: { periodeAkademikId: periode.id },
      _sum: { jp: true },
    }),
  ]);

  // Map guruId → total JP terpakai
  const jpMap = new Map<string, number>();
  for (const g of jpPerGuru) jpMap.set(g.guruId, g._sum.jp ?? 0);

  const guruListWithJp = guruList.map((g) => ({
    ...g,
    totalJp: jpMap.get(g.id) ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Tambah Beban Mengajar</h1>
        <p className="text-sm text-zinc-500">
          Tentukan guru pengampu mapel di kelas tertentu beserta JP/minggu.
        </p>
      </div>
      <BebanForm
        action={createBeban}
        guruList={guruListWithJp}
        kelasList={kelasList}
        mapelList={mapelList}
        allBeban={allBeban}
        submitLabel="Simpan Beban Mengajar"
      />
    </div>
  );
}
