import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import { MapelBadge, TingkatLegend } from "@/lib/mapel-color";
import { sortKelas } from "@/lib/kelas-sort";
import InputManualSlot from "./InputManualSlot";

export default async function JadwalKelasPage({
  searchParams,
}: {
  searchParams: Promise<{ kelasId?: string }>;
}) {
  const { kelasId } = await searchParams;

  const periode = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });

  const kelasList = sortKelas(await prisma.kelas.findMany({}));
  const selectedKelasId   = kelasId ?? kelasList[0]?.id;
  const selectedIndex     = kelasList.findIndex((k) => k.id === selectedKelasId);
  const selectedKelas     = kelasList[selectedIndex];
  const prevKelas         = selectedIndex > 0 ? kelasList[selectedIndex - 1] : null;
  const nextKelas         = selectedIndex < kelasList.length - 1 ? kelasList[selectedIndex + 1] : null;
  const namaKelas         = selectedKelas?.namaKelas ?? "";

  const bebanKelas = periode && selectedKelasId
    ? await prisma.bebanMengajar.findMany({
        where:   { periodeAkademikId: periode.id, kelasId: selectedKelasId },
        include: { mapel: true, guru: true },
      })
    : [];

  const ringkasanMapel    = Array.from(new Map(bebanKelas.map((b) => [b.mapel.id, b.mapel])).values());
  const totalJpBeban      = bebanKelas.reduce((s, b) => s + b.jp, 0);
  const distinctGuruCount = new Set(bebanKelas.map((b) => b.guruId)).size;

  const jadwalList = periode && selectedKelasId
    ? await prisma.jadwal.findMany({
        where:   { periodeAkademikId: periode.id, kelasId: selectedKelasId },
        orderBy: [{ hari: "asc" }, { slotWaktu: { urutan: "asc" } }],
        include: {
          slotWaktu:    true,
          guru:         true,
          bebanMengajar: { include: { mapel: true } },
        },
      })
    : [];

  const slotTerkunciList = periode && selectedKelasId
    ? await prisma.slotTerkunci.findMany({
        where: {
          periodeAkademikId: periode.id,
          OR: [{ kelasId: null }, { kelasId: selectedKelasId }],
        },
        include: {
          slotWaktuMulai:  true,
          mapel:           { select: { namaMapel: true, kodeMapel: true } },
          ekstrakurikuler: { select: { nama: true } },
        },
      })
    : [];

  const allSlots = await prisma.slotWaktu.findMany({
    orderBy: [{ hari: "asc" }, { urutan: "asc" }],
  });

  const totalSlot   = jadwalList.length;
  const lockedCount = jadwalList.filter((j) => j.isLocked).length;

  const bebanKosong = periode && selectedKelasId
    ? await Promise.all(
        bebanKelas.map(async (b) => {
          const terjadwal = await prisma.jadwal.count({
            where: { periodeAkademikId: periode.id, bebanMengajarId: b.id },
          });
          return {
            id: b.id, jp: b.jp, terjadwal,
            guru:  { nama: b.guru.nama, kodeGuru: b.guru.kodeGuru },
            mapel: { namaMapel: b.mapel.namaMapel, kodeMapel: b.mapel.kodeMapel },
          };
        })
      ).then((list) => list.filter((b) => b.terjadwal < b.jp))
    : [];

  const slotPelajaran = periode
    ? await prisma.slotWaktu.findMany({
        where:   { jenisSlot: "PELAJARAN" },
        orderBy: [{ hari: "asc" }, { urutan: "asc" }],
        select:  { id: true, namaSlot: true, hari: true, urutan: true, jamMulai: true },
      })
    : [];

  const jadwalAdaRaw = jadwalList.map((j) => ({
    hari:            j.hari,
    slotWaktuId:     j.slotWaktuId,
    bebanMengajarId: j.bebanMengajarId,
  }));

  // ── buildHariRows ────────────────────────────────────────────────────────
  function buildHariRows(hari: string) {
    const jadwalHari   = jadwalList.filter((j) => j.hari === hari);
    const terkunciHari = slotTerkunciList.filter((t) => t.hari === hari);
    const slotsHari    = allSlots.filter((s) => s.hari === hari);

    type Row =
      | { type: "jadwal";       urutan: number; data: (typeof jadwalHari)[number] }
      | { type: "terkunci";     urutan: number; data: (typeof terkunciHari)[number] }
      | { type: "nonpelajaran"; urutan: number; namaSlot: string };

    const rows: Row[] = [];
    const jadwalSlotIds   = new Set(jadwalHari.map((j) => j.slotWaktuId));
    const terkunciSlotIds = new Set(
      terkunciHari.flatMap((t) => {
        const mulai = slotsHari.find((s) => s.id === t.slotWaktuMulaiId);
        if (!mulai) return [];
        return slotsHari
          .filter((s) => s.urutan >= mulai.urutan && s.urutan < mulai.urutan + t.durasiSlot)
          .map((s) => s.id);
      })
    );

    for (const j of jadwalHari)
      rows.push({ type: "jadwal", urutan: j.slotWaktu.urutan, data: j });

    for (const s of slotsHari) {
      if (s.jenisSlot === "NON_PELAJARAN" && !jadwalSlotIds.has(s.id) && !terkunciSlotIds.has(s.id))
        rows.push({ type: "nonpelajaran", urutan: s.urutan, namaSlot: s.namaSlot });
    }

    for (const t of terkunciHari) {
      if (!jadwalSlotIds.has(t.slotWaktuMulaiId)) {
        const slot = slotsHari.find((s) => s.id === t.slotWaktuMulaiId);
        rows.push({ type: "terkunci", urutan: slot?.urutan ?? 0, data: t });
      }
    }

    rows.sort((a, b) => a.urutan - b.urutan);
    return rows;
  }

  return (
    <div className="flex gap-6 h-full">
      {/* ── Sidebar kelas ── */}
      <aside className="w-44 shrink-0">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 px-1">
          Daftar Kelas
        </p>
        <div className="space-y-0.5">
          {kelasList.map((k) => {
            const isActive = k.id === selectedKelasId;
            return (
              <Link
                key={k.id}
                href={`/admin/penjadwalan/kelas?kelasId=${k.id}`}
                className={`flex items-center rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {k.namaKelas}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* ── Konten utama ── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-zinc-900">Jadwal Kelas</h1>
            {selectedKelas ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                <span className="font-medium text-zinc-700">{namaKelas}</span>
                <span>·</span>
                <span>{totalSlot} slot</span>
                {totalJpBeban > 0  && <><span>·</span><span>{totalJpBeban} JP/minggu</span></>}
                {distinctGuruCount > 0 && <><span>·</span><span>{distinctGuruCount} guru</span></>}
                {lockedCount > 0 && (
                  <><span>·</span><span className="text-amber-600">🔒 {lockedCount} terkunci</span></>
                )}
                {bebanKosong.length > 0 && (
                  <><span>·</span>
                  <span className="text-red-600 font-medium">
                    ⚠ {bebanKosong.reduce((s, b) => s + (b.jp - b.terjadwal), 0)} JP belum terjadwal
                  </span>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Pilih kelas dari daftar</p>
            )}

            {/* Legend tingkat + badge mapel */}
            {ringkasanMapel.length > 0 && (
              <div className="space-y-1.5 pt-0.5">
                <TingkatLegend />
                <div className="flex flex-wrap gap-1.5">
                  {ringkasanMapel.map((m) => (
                    <MapelBadge
                      key={m.id}
                      nama={m.namaMapel}
                      kode={m.kodeMapel}
                      namaKelas={namaKelas}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigasi prev/next */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={prevKelas ? `/admin/penjadwalan/kelas?kelasId=${prevKelas.id}` : "#"}
              aria-disabled={!prevKelas}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                prevKelas
                  ? "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                  : "border-zinc-200 text-zinc-300 pointer-events-none"
              }`}
            >
              ← Prev
            </Link>
            <span className="text-xs text-zinc-400">
              {selectedIndex + 1} / {kelasList.length}
            </span>
            <Link
              href={nextKelas ? `/admin/penjadwalan/kelas?kelasId=${nextKelas.id}` : "#"}
              aria-disabled={!nextKelas}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                nextKelas
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

        {selectedKelas && periode && (
          <div className="space-y-3">
            {bebanKosong.length > 0 && (
              <InputManualSlot
                periodeId={periode.id}
                kelasId={selectedKelasId!}
                namaKelas={namaKelas}
                bebanKosong={bebanKosong}
                slotPelajaran={slotPelajaran}
                jadwalAda={jadwalAdaRaw}
              />
            )}

            {HARI_LIST.map((hari) => {
              const rows = buildHariRows(hari);
              if (rows.length === 0) return null;
              return (
                <div key={hari} className="rounded-lg border border-zinc-200 bg-white p-4">
                  <p className="mb-2 text-sm font-semibold text-zinc-900">{HARI_LABEL[hari]}</p>
                  <div className="space-y-1">
                    {rows.map((row, i) => {
                      /* ── Slot pelajaran (jadwal) ── */
                      if (row.type === "jadwal") {
                        const j = row.data;
                        return (
                          <div
                            key={j.id}
                            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                              j.isLocked ? "border border-amber-200 bg-amber-50" : "bg-zinc-50"
                            }`}
                          >
                            <span className="w-14 shrink-0 text-xs font-mono text-zinc-400">
                              {j.slotWaktu.namaSlot}
                            </span>
                            {/* ← warna berdasarkan namaKelas */}
                            <MapelBadge
                              nama={j.bebanMengajar.mapel.namaMapel}
                              kode={j.bebanMengajar.mapel.kodeMapel}
                              namaKelas={namaKelas}
                            />
                            <span className="ml-auto shrink-0 text-xs text-zinc-500">
                              {j.guru.nama}
                            </span>
                            {j.isLocked && <span title="Terkunci" className="shrink-0 text-sm">🔒</span>}
                          </div>
                        );
                      }

                      /* ── Slot non-pelajaran (istirahat, upacara, dll) ── */
                      if (row.type === "nonpelajaran") {
                        return (
                          <div
                            key={`np-${i}`}
                            className="flex items-center gap-3 rounded-md bg-zinc-100 px-3 py-1.5 text-sm"
                          >
                            <span className="w-14 shrink-0 text-xs font-mono text-zinc-400">
                              {row.namaSlot}
                            </span>
                            <span className="text-xs text-zinc-400 italic">{row.namaSlot}</span>
                          </div>
                        );
                      }

                      /* ── Slot terkunci manual ── */
                      const t     = row.data;
                      const label = t.label ?? t.mapel?.namaMapel ?? t.ekstrakurikuler?.nama ?? "Terkunci";
                      const kode  = t.mapel?.kodeMapel ?? (t.ekstrakurikuler ? "EKSKUL" : "LOCK");
                      return (
                        <div
                          key={`terkunci-${i}`}
                          className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                        >
                          <span className="w-14 shrink-0 text-xs font-mono text-zinc-400">
                            {t.slotWaktuMulai.namaSlot}
                          </span>
                          <MapelBadge nama={label} kode={kode} namaKelas={namaKelas} />
                          <span className="ml-auto text-[10px] text-amber-600">
                            🔒 {!t.kelasId ? "semua kelas" : "kelas ini"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {jadwalList.length === 0 && (
              <div className="rounded-md border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">
                Belum ada jadwal.{" "}
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
