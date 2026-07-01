import { prisma } from "@/lib/prisma";
import { HARI_LIST, HARI_LABEL, STATUS_GURU_LABEL, type HariType } from "@/lib/constants";
import PiketGrid from "./PiketGrid";
import GeneratePiketForm from "./GeneratePiketForm";
import HapusPiketButton from "./HapusPiketButton";

const HARI_AKTIF = [...HARI_LIST] as HariType[];

export default async function PiketGuruPage() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });

  const guruList = await prisma.guru.findMany({
    orderBy: { kodeGuru: "asc" },
    include: periode
      ? { piket: { where: { periodeAkademikId: periode.id } } }
      : { piket: false },
  });

  if (!periode) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-zinc-900">Piket Guru</h1>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Belum ada Periode Akademik aktif.
        </div>
      </div>
    );
  }

  // ── Summary per hari ────────────────────────────────────────────────────
  const harianPerHari   = new Map<HariType, { kode: string; nama: string }[]>(
    HARI_AKTIF.map((h) => [h, []])
  );
  const karakterPerHari = new Map<HariType, { kode: string; nama: string }[]>(
    HARI_AKTIF.map((h) => [h, []])
  );

  for (const g of guruList) {
    const piketList = Array.isArray(g.piket) ? g.piket : [];
    for (const p of piketList) {
      const hari = p.hari as HariType;
      if (!HARI_AKTIF.includes(hari)) continue;
      if (p.jenisPiket === "HARIAN")
        harianPerHari.get(hari)?.push({ kode: g.kodeGuru, nama: g.nama });
      if (p.jenisPiket === "KARAKTER")
        karakterPerHari.get(hari)?.push({ kode: g.kodeGuru, nama: g.nama });
    }
  }

  return (
    <div className="space-y-10">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Piket Guru</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {periode.tahun} · Semester {periode.semester === "GANJIL" ? "Ganjil" : "Genap"}
          </p>
        </div>
        <HapusPiketButton />
      </div>

      {/* ══ PAPAN PIKET PER HARI ════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          Jadwal Piket Per Hari
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          {HARI_AKTIF.map((hari) => {
            const hGuru = harianPerHari.get(hari)   ?? [];
            const kGuru = karakterPerHari.get(hari) ?? [];
            const total = hGuru.length + kGuru.length;

            return (
              <div
                key={hari}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm"
              >
                {/* Kepala hari */}
                <div className="bg-zinc-900 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-white tracking-wide">
                    {HARI_LABEL[hari]}
                  </span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {total} guru
                  </span>
                </div>

                <div className="flex flex-col gap-3 p-3 flex-1">
                  {/* Piket Harian */}
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                        Harian
                      </span>
                      <span className="ml-auto text-[10px] text-zinc-400">{hGuru.length}</span>
                    </div>
                    {hGuru.length === 0 ? (
                      <p className="text-[11px] text-zinc-300 italic pl-3.5">Belum ada</p>
                    ) : (
                      <ul className="space-y-1 pl-3.5">
                        {hGuru.map((g) => (
                          <li key={g.kode} className="flex items-baseline gap-1.5">
                            <span className="shrink-0 font-mono text-[10px] font-bold text-amber-600 bg-amber-50 rounded px-1">
                              {g.kode}
                            </span>
                            <span className="text-[12px] text-zinc-700 leading-snug">{g.nama}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-zinc-100" />

                  {/* Piket Karakter */}
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-700">
                        Karakter
                      </span>
                      <span className="ml-auto text-[10px] text-zinc-400">{kGuru.length}</span>
                    </div>
                    {kGuru.length === 0 ? (
                      <p className="text-[11px] text-zinc-300 italic pl-3.5">Belum ada</p>
                    ) : (
                      <ul className="space-y-1 pl-3.5">
                        {kGuru.map((g) => (
                          <li key={g.kode} className="flex items-baseline gap-1.5">
                            <span className="shrink-0 font-mono text-[10px] font-bold text-purple-600 bg-purple-50 rounded px-1">
                              {g.kode}
                            </span>
                            <span className="text-[12px] text-zinc-700 leading-snug">{g.nama}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ TABEL EDIT PIKET PER GURU ═══════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Edit Piket Per Guru
          </h2>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />
              Harian
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-purple-400" />
              Karakter
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-14">
                  Kode
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Nama Guru
                </th>
                {HARI_AKTIF.map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400 min-w-[90px]"
                  >
                    {HARI_LABEL[h]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {guruList.map((g) => {
                const piketList    = Array.isArray(g.piket) ? g.piket : [];
                const harianHari   = piketList.find((p) => p.jenisPiket === "HARIAN")?.hari   ?? null;
                const karakterHari = piketList.find((p) => p.jenisPiket === "KARAKTER")?.hari ?? null;
                return (
                  <PiketGrid
                    key={g.id}
                    guruId={g.id}
                    kodeGuru={g.kodeGuru}
                    nama={g.nama}
                    status={STATUS_GURU_LABEL[g.status]}
                    harianHari={harianHari}
                    karakterHari={karakterHari}
                    hariTidakTersedia={
                      Array.isArray(g.hariTidakTersedia)
                        ? (g.hariTidakTersedia as HariType[])
                        : []
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ══ GENERATE OTOMATIS ════════════════════════════════════════════════ */}
      <section className="space-y-4 border-t border-zinc-100 pt-8">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Generate Piket Otomatis
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Distribusi merata Senin–Jumat. Centang guru yang akan di-generate, lalu klik Generate.
          </p>
        </div>
        <GeneratePiketForm
          guruList={guruList.map((g) => ({
            id:                g.id,
            nama:              g.nama,
            kodeGuru:          g.kodeGuru,
            hariTidakTersedia: Array.isArray(g.hariTidakTersedia)
              ? (g.hariTidakTersedia as HariType[])
              : [],
          }))}
        />
      </section>
    </div>
  );
}
