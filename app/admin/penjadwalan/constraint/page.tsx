import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HARI_LABEL } from "@/lib/constants";
import { MapelBadge } from "@/lib/mapel-color";
import ConstraintForm from "./ConstraintForm";
import { UnlockButton, UnlockAllButton } from "./UnlockButton";
import { sortKelas } from "@/lib/kelas-sort";

export default async function ConstraintPage({
  searchParams,
}: {
  searchParams: Promise<{ kelasId?: string }>;
}) {
  const { kelasId } = await searchParams;

  const periode = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });

  const kelasList = sortKelas(await prisma.kelas.findMany({}));

  // Semua jadwal JP terjadwal (bukan NON_PELAJARAN) untuk periode aktif
  // Dipakai untuk mengisi slotMap di ConstraintForm
  const allJadwal = periode
    ? await prisma.jadwal.findMany({
        where: {
          periodeAkademikId: periode.id,
          slotWaktu: { jenisSlot: "PELAJARAN" },
        },
        include: {
          slotWaktu: true,
          kelas: true,
          guru: true,
          bebanMengajar: { include: { mapel: true } },
        },
        orderBy: [{ hari: "asc" }, { slotWaktu: { urutan: "asc" } }],
      })
    : [];

  // Bangun slotMap untuk ConstraintForm — key: `${kelasId}__${hari}`
  type SlotInfo = {
    slotWaktuId: string;
    namaSlot: string;
    namaMapel: string;
    kodeMapel: string;
    namaGuru: string;
    isLocked: boolean;
  };
  const slotMap: Record<string, SlotInfo[]> = {};
  for (const j of allJadwal) {
    const key = `${j.kelasId}__${j.hari}`;
    if (!slotMap[key]) slotMap[key] = [];
    slotMap[key].push({
      slotWaktuId: j.slotWaktuId,
      namaSlot: j.slotWaktu.namaSlot,
      namaMapel: j.bebanMengajar.mapel.namaMapel,
      kodeMapel: j.bebanMengajar.mapel.kodeMapel,
      namaGuru: j.guru.nama,
      isLocked: j.isLocked,
    });
  }

  // Daftar constraint aktif (isLocked = true)
  const lockedJadwal = allJadwal.filter((j) => j.isLocked);

  // Filter per kelas jika ada
  const selectedKelasId = kelasId ?? "ALL";
  const filteredLocked =
    selectedKelasId === "ALL"
      ? lockedJadwal
      : lockedJadwal.filter((j) => j.kelasId === selectedKelasId);

  // Group by kelas untuk tampilan
  const byKelas = new Map<
    string,
    { namaKelas: string; items: typeof filteredLocked }
  >();
  for (const j of filteredLocked) {
    if (!byKelas.has(j.kelasId)) {
      byKelas.set(j.kelasId, { namaKelas: j.kelas.namaKelas, items: [] });
    }
    byKelas.get(j.kelasId)!.items.push(j);
  }

  const totalLocked = lockedJadwal.length;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Penguncian Jadwal</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tentukan slot jadwal yang tidak boleh diubah oleh generator. Slot terkunci
          bersifat <strong>final</strong> — mapel, guru, dan posisinya tidak akan
          berubah berapa kali pun Generate dijalankan.
        </p>
      </div>

      {!periode && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Belum ada Periode Akademik aktif.{" "}
          <Link href="/admin/master/periode-akademik" className="underline">
            Atur di sini
          </Link>
          .
        </div>
      )}

      {periode && allJadwal.length === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Belum ada jadwal yang digenerate.{" "}
          <Link href="/admin/penjadwalan/generate" className="underline">
            Generate jadwal dulu
          </Link>{" "}
          sebelum mengunci slot.
        </div>
      )}

      {/* Cara kerja */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800 space-y-1">
        <p className="font-semibold text-blue-900">Cara kerja penguncian:</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-700">
          <li>Pilih kelas, hari, dan slot JP yang ingin dikunci.</li>
          <li>Slot terkunci tidak akan dipindah, diganti mapel, atau diganti guru oleh generator.</li>
          <li>Slot Non-JP (Upacara, Istirahat, dll) otomatis terkunci — tidak perlu dikunci manual.</li>
          <li>Untuk mengubah isi slot terkunci, unlock dulu, edit Beban Mengajar, lalu generate ulang.</li>
        </ul>
      </div>

      {/* Form tambah constraint */}
      {periode && allJadwal.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-900 mb-4">
            Tambah Penguncian Slot
          </p>
          <ConstraintForm kelasList={kelasList} slotMap={slotMap} />
        </div>
      )}

      {/* Daftar constraint aktif */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold text-zinc-900">
            Slot Terkunci Aktif{" "}
            {totalLocked > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {totalLocked}
              </span>
            )}
          </p>

          {/* Filter kelas */}
          {kelasList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Link
                href="/admin/penjadwalan/constraint"
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedKelasId === "ALL"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                Semua Kelas
              </Link>
              {kelasList.map((k) => {
                const count = lockedJadwal.filter((j) => j.kelasId === k.id).length;
                return (
                  <Link
                    key={k.id}
                    href={`/admin/penjadwalan/constraint?kelasId=${k.id}`}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedKelasId === k.id
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {k.namaKelas}
                    {count > 0 && (
                      <span
                        className={`ml-1 ${
                          selectedKelasId === k.id ? "text-amber-300" : "text-amber-600"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {filteredLocked.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
            {totalLocked === 0
              ? "Belum ada slot yang dikunci. Tambahkan penguncian di atas."
              : "Tidak ada slot terkunci untuk kelas ini."}
          </div>
        ) : (
          Array.from(byKelas.entries()).map(([kId, { namaKelas, items }]) => (
            <div key={kId} className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
              {/* Header kelas */}
              <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">{namaKelas}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    🔒 {items.length} slot terkunci
                  </span>
                </div>
                {periode && items.length > 0 && (
                  <UnlockAllButton
                    kelasId={kId}
                    periodeId={periode.id}
                    count={items.length}
                  />
                )}
              </div>

              {/* Daftar slot */}
              <div className="divide-y divide-zinc-50">
                {items.map((j) => (
                  <div
                    key={j.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors"
                  >
                    {/* Hari */}
                    <span className="w-16 shrink-0 text-xs font-medium text-zinc-500">
                      {HARI_LABEL[j.hari]}
                    </span>
                    {/* JP */}
                    <span className="w-14 shrink-0 text-xs font-mono text-zinc-400">
                      {j.slotWaktu.namaSlot}
                    </span>
                    {/* Mapel */}
                    <MapelBadge
                      nama={j.bebanMengajar.mapel.namaMapel}
                      kode={j.bebanMengajar.mapel.kodeMapel}
                    />
                    {/* Guru */}
                    <span className="ml-auto shrink-0 text-xs text-zinc-500">
                      {j.guru.nama}
                    </span>
                    {/* Status */}
                    <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      🔒 Terkunci
                    </span>
                    {/* Unlock */}
                    <UnlockButton jadwalId={j.id} />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Link ke halaman terkait */}
      <div className="border-t border-zinc-100 pt-4 flex flex-wrap gap-4 text-sm text-zinc-500">
        <Link href="/admin/penjadwalan/generate" className="hover:text-zinc-800 hover:underline">
          Generate Jadwal →
        </Link>
        <Link href="/admin/penjadwalan/kelas" className="hover:text-zinc-800 hover:underline">
          Lihat Jadwal Kelas →
        </Link>
        <Link href="/admin/penjadwalan/slot-terkunci" className="hover:text-zinc-800 hover:underline">
          Slot Non-JP Terkunci (Upacara, dll) →
        </Link>
      </div>
    </div>
  );
}
