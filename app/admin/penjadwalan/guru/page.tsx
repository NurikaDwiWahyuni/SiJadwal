import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import { MapelBadge } from "@/lib/mapel-color";
import LockToggle from "../LockToggle";

export default async function JadwalGuruPage({
  searchParams,
}: {
  searchParams: Promise<{ guruId?: string }>;
}) {
  const { guruId } = await searchParams;

  const periode = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });

  const guruList = await prisma.guru.findMany({
    orderBy: { nama: "asc" },
    include: {
      bebanMengajar: periode
        ? { where: { periodeAkademikId: periode.id }, select: { jp: true } }
        : false,
    },
  });

  const selectedGuruId = guruId ?? guruList[0]?.id;
  const selectedIndex = guruList.findIndex((g) => g.id === selectedGuruId);
  const selectedGuru = guruList[selectedIndex];
  const prevGuru = selectedIndex > 0 ? guruList[selectedIndex - 1] : null;
  const nextGuru = selectedIndex < guruList.length - 1 ? guruList[selectedIndex + 1] : null;

  const totalJp = selectedGuru?.bebanMengajar
    ? (selectedGuru.bebanMengajar as { jp: number }[]).reduce((s, b) => s + b.jp, 0)
    : 0;

  const bebanGuru =
    periode && selectedGuruId
      ? await prisma.bebanMengajar.findMany({
          where: { periodeAkademikId: periode.id, guruId: selectedGuruId },
          include: { mapel: true, kelas: true },
        })
      : [];

  const ringkasanMapel = Array.from(
    new Map(bebanGuru.map((b) => [b.mapel.id, b.mapel])).values()
  );
  const distinctKelasCount = new Set(bebanGuru.map((b) => b.kelasId)).size;

  const jadwalList =
    periode && selectedGuruId
      ? await prisma.jadwal.findMany({
          where: { periodeAkademikId: periode.id, guruId: selectedGuruId },
          orderBy: [{ hari: "asc" }, { slotWaktu: { urutan: "asc" } }],
          include: {
            slotWaktu: true,
            kelas: true,
            bebanMengajar: { include: { mapel: true } },
          },
        })
      : [];

  const totalMengajar = jadwalList.length;
  const lockedCount = jadwalList.filter((j) => j.isLocked).length;

  return (
    <div className="flex gap-6 h-full">
      {/* ── Sidebar kiri: daftar guru ── */}
      <aside className="w-56 shrink-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 px-1">
          Daftar Guru
        </p>
        <div className="space-y-0.5 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
          {guruList.map((g) => {
            const jp = (g.bebanMengajar as { jp: number }[]).reduce(
              (s, b) => s + b.jp,
              0
            );
            const isActive = g.id === selectedGuruId;
            return (
              <Link
                key={g.id}
                href={`/admin/penjadwalan/guru?guruId=${g.id}`}
                className={`flex items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <span className="truncate font-medium">{g.nama}</span>
                <span
                  className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {jp} JP
                </span>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* ── Konten utama ── */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Jadwal Guru</h1>
            {selectedGuru ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                <span className="font-medium text-zinc-700">{selectedGuru.nama}</span>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-600">
                  {selectedGuru.kodeGuru}
                </span>
                <span>{totalJp} JP / minggu</span>
                <span>·</span>
                <span>{totalMengajar} slot terjadwal</span>
                {distinctKelasCount > 0 && (
                  <>
                    <span>·</span>
                    <span>{distinctKelasCount} kelas</span>
                  </>
                )}
                {lockedCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-amber-600">🔒 {lockedCount} terkunci</span>
                  </>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm text-zinc-400">Pilih guru dari daftar</p>
            )}

            {ringkasanMapel.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {ringkasanMapel.map((m) => (
                  <MapelBadge key={m.id} nama={m.namaMapel} kode={m.kodeMapel} size="sm" />
                ))}
                {ringkasanMapel.length > 1 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    mengampu {ringkasanMapel.length} mapel berbeda
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={prevGuru ? `/admin/penjadwalan/guru?guruId=${prevGuru.id}` : "#"}
              aria-disabled={!prevGuru}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                prevGuru
                  ? "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                  : "border-zinc-200 text-zinc-300 pointer-events-none"
              }`}
            >
              ← Prev
            </Link>
            <span className="text-xs text-zinc-400">
              {selectedIndex + 1} / {guruList.length}
            </span>
            <Link
              href={nextGuru ? `/admin/penjadwalan/guru?guruId=${nextGuru.id}` : "#"}
              aria-disabled={!nextGuru}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                nextGuru
                  ? "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                  : "border-zinc-200 text-zinc-300 pointer-events-none"
              }`}
            >
              Next →
            </Link>
          </div>
        </div>

        {!periode && (
          <p className="text-sm text-zinc-500">Belum ada periode akademik aktif.</p>
        )}

        {selectedGuru && periode && (
          <div className="space-y-3">
            {HARI_LIST.map((hari) => {
              const items = jadwalList.filter((j) => j.hari === hari);
              if (items.length === 0) return null;
              const lockedHari = items.filter((j) => j.isLocked).length;
              return (
                <div
                  key={hari}
                  className="rounded-lg border border-zinc-200 bg-white p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {HARI_LABEL[hari]}
                    </p>
                    {lockedHari > 0 && (
                      <span className="text-[11px] text-amber-600">
                        🔒 {lockedHari}/{items.length} terkunci
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {items.map((j) => (
                      <div
                        key={j.id}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                          j.isLocked
                            ? "bg-amber-50 border border-amber-100"
                            : "bg-zinc-50 border border-transparent"
                        }`}
                      >
                        <span className="w-20 shrink-0 text-xs font-mono text-zinc-400">
                          {j.slotWaktu.namaSlot}
                        </span>
                        <MapelBadge
                          nama={j.bebanMengajar.mapel.namaMapel}
                          kode={j.bebanMengajar.mapel.kodeMapel}
                        />
                        <span className="ml-auto shrink-0 rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
                          {j.kelas.namaKelas}
                        </span>
                        <LockToggle jadwalId={j.id} isLocked={j.isLocked} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {jadwalList.length === 0 && (
              <div className="rounded-md border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
                Belum ada jadwal untuk guru ini.{" "}
                <Link href="/admin/penjadwalan/generate" className="underline text-zinc-600">
                  Generate jadwal dulu →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
