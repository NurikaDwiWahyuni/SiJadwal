import { prisma } from "@/lib/prisma";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import type { HariType } from "@/lib/constants";
import JadwalReviewClient from "./JadwalReviewClient";
import { sortKelas } from "@/lib/kelas-sort";

export default async function LaporanJadwalPage() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });

  if (!periode) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-900">Tabel Jadwal</h1>
        <p className="text-base text-zinc-500">Belum ada periode akademik aktif.</p>
      </div>
    );
  }

  const [jadwalRaw, kelasList, slotAll] = await Promise.all([
    prisma.jadwal.findMany({
      where: { periodeAkademikId: periode.id },
      orderBy: [{ hari: "asc" }, { slotWaktu: { urutan: "asc" } }, { kelas: { namaKelas: "asc" } }],
      include: {
        slotWaktu: true,
        guru: true,
        kelas: true,
        bebanMengajar: { include: { mapel: true } },
      },
    }),
    sortKelas(await prisma.kelas.findMany({})),
    prisma.slotWaktu.findMany({ orderBy: [{ hari: "asc" }, { urutan: "asc" }] }),
  ]);

  const jadwalList = jadwalRaw.map((j) => ({
    id:          j.id,
    isLocked:    j.isLocked,
    isPecah11:   (j as Record<string, unknown>).isPecah11 === true, // field opsional
    hari:        j.hari as HariType,
    hariLabel:   HARI_LABEL[j.hari as HariType],
    slotId:      j.slotWaktuId,
    slotNama:    j.slotWaktu.namaSlot,
    slotUrutan:  j.slotWaktu.urutan,
    jamMulai:    j.slotWaktu.jamMulai ?? "",
    jamSelesai:  j.slotWaktu.jamSelesai ?? "",
    jenisSlot:   j.slotWaktu.jenisSlot,
    mapelNama:   j.bebanMengajar.mapel.namaMapel,
    kodeMapel:   j.bebanMengajar.mapel.kodeMapel,
    guruNama:    j.guru.nama,
    kodeGuru:    j.guru.kodeGuru,
    guruId:      j.guru.id,
    kelasId:     j.kelasId,
    kelasNama:   j.kelas.namaKelas,
  }));

  const slotPerHari = HARI_LIST.map((hari) => ({
    hari,
    hariLabel: HARI_LABEL[hari],
    slots: slotAll
      .filter((s) => s.hari === hari)
      .map((s) => ({
        id:        s.id,
        namaSlot:  s.namaSlot,
        jamMulai:  s.jamMulai ?? "",
        jamSelesai: s.jamSelesai ?? "",
        urutan:    s.urutan,
        jenisSlot: s.jenisSlot,
      })),
  })).filter((h) => h.slots.length > 0);

  const totalPecah11 = jadwalList.filter((j) => j.isPecah11).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">📅 Tabel Jadwal</h1>
        <p className="text-base text-zinc-500 mt-1">
          Tinjau hasil generate. Klik 🔒/🔓 di tiap sel untuk mengunci slot.
          {totalPecah11 > 0 && (
            <span className="ml-1">
              Sel berwarna{" "}
              <span className="inline-block rounded px-1.5 py-0.5 text-xs font-bold"
                style={{ background: "#fef08a", color: "#713f12", border: "1px solid #ca8a04" }}>
                kuning
              </span>{" "}
              = {totalPecah11} slot yang dipecah 1+1 (2JP jadi dua hari terpisah).
            </span>
          )}
        </p>
      </div>

      {jadwalList.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-10 text-center text-base text-zinc-400">
          Belum ada jadwal. Jalankan{" "}
          <a href="/admin/penjadwalan/generate" className="underline text-zinc-600 font-semibold">
            Generate Jadwal
          </a>{" "}
          terlebih dahulu.
        </div>
      ) : (
        <JadwalReviewClient
          jadwalList={jadwalList}
          periodeId={periode.id}
          kelasList={kelasList}
          slotPerHari={slotPerHari}
        />
      )}
    </div>
  );
}
