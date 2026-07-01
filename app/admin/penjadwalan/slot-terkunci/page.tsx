import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import SlotCell from "./SlotCell";
import { sortKelas } from "@/lib/kelas-sort";

export default async function SlotTerkunciPage({
  searchParams,
}: {
  searchParams: Promise<{ kelasId?: string }>;
}) {
  const { kelasId } = await searchParams;
  const selectedKelasId = kelasId ?? "ALL";

  const periode = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });

  const [kelasList, slotList, mapelList, ekskulList] = await Promise.all([
    sortKelas(await prisma.kelas.findMany({})),
    prisma.slotWaktu.findMany({ orderBy: [{ hari: "asc" }, { urutan: "asc" }] }),
    prisma.mapel.findMany({
      orderBy: { kodeMapel: "asc" },
      select: { id: true, kodeMapel: true, namaMapel: true },
    }),
    prisma.ekstrakurikuler.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
  ]);

  const globalLocks = periode
    ? await prisma.slotTerkunci.findMany({
        where: { periodeAkademikId: periode.id, kelasId: null },
      })
    : [];

  const kelasLocks =
    periode && selectedKelasId !== "ALL"
      ? await prisma.slotTerkunci.findMany({
          where: { periodeAkademikId: periode.id, kelasId: selectedKelasId },
        })
      : [];

  const locksToShow = selectedKelasId === "ALL" ? globalLocks : kelasLocks;

  function findLock(hari: string, slotWaktuId: string, list: typeof globalLocks) {
    const lock = list.find(
      (l) => l.hari === hari && l.slotWaktuMulaiId === slotWaktuId
    );
    return lock
      ? {
          id: lock.id,
          label: lock.label,
          mapelId: lock.mapelId,
          ekstrakurikulerId: lock.ekstrakurikulerId,
        }
      : null;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Slot Terkunci</h1>
        <p className="text-sm text-zinc-500">
          Kunci slot waktu tertentu agar tidak bisa diisi oleh generator jadwal otomatis.
          Slot terkunci <strong>tetap dihitung dalam urutan jam</strong> — generator
          akan melewatinya dan menempatkan pelajaran di slot berikutnya.
        </p>
      </div>

      {!periode && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Belum ada Periode Akademik aktif. Aktifkan dulu di menu Periode Akademik.
        </div>
      )}

      {/* ── Info cara kerja ── */}
      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 space-y-1">
        <p className="font-semibold">Cara kerja slot terkunci:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>
            <strong>🚫 Blokir</strong> — slot dikunci untuk acara tertentu (Upacara, Sholat Jumat, dll).
            Generator melewati slot ini; pelajaran ditempatkan di slot berikutnya.
          </li>
          <li>
            <strong>📘 Mapel</strong> — slot dikunci untuk mapel tertentu (sudah dijadwalkan manual).
            Generator tidak akan mengisi slot ini dengan mapel lain.
          </li>
          <li>
            <strong>🏃 Ekskul</strong> — slot dikunci untuk ekstrakurikuler tertentu.
            Pembina ekskul juga otomatis diblokir di slot tersebut.
          </li>
          <li>
            Slot <span className="font-medium">Non-Pelajaran</span> (mis. Istirahat) sudah otomatis
            dilewati oleh generator tanpa perlu dikunci manual.
          </li>
        </ul>
      </div>

      {/* ── Tab pilih kelas ── */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        <Link
          href="/admin/penjadwalan/slot-terkunci?kelasId=ALL"
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            selectedKelasId === "ALL"
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          Semua Kelas (acara serentak)
        </Link>
        {kelasList.map((k) => (
          <Link
            key={k.id}
            href={`/admin/penjadwalan/slot-terkunci?kelasId=${k.id}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedKelasId === k.id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {k.namaKelas}
          </Link>
        ))}
      </div>

      {selectedKelasId === "ALL" ? (
        <p className="text-xs text-zinc-500">
          Mode <strong>Semua Kelas</strong> untuk acara yang berlaku serentak di seluruh kelas
          (mis. Upacara Senin, Sholat Jumat). Pilih kelas tertentu di atas untuk mengunci slot
          khusus kelas itu saja.
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Slot dengan badge kuning <em>&quot;Dikelola di Semua Kelas&quot;</em> sudah dikunci lewat
          mode Semua Kelas dan tidak bisa diubah dari tampilan per-kelas.
        </p>
      )}

      {/* ── Grid slot per hari ── */}
      <div className="space-y-4">
        {HARI_LIST.map((hari) => {
          const slotsForHari = slotList.filter((s) => s.hari === hari);
          if (slotsForHari.length === 0) return null;

          return (
            <div key={hari} className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-zinc-900">
                {HARI_LABEL[hari]}
              </p>
              <div className="flex flex-wrap gap-2">
                {slotsForHari.map((s) => (
                  <SlotCell
                    key={s.id}
                    kelasId={selectedKelasId === "ALL" ? undefined : selectedKelasId}
                    hari={hari}
                    slotWaktuId={s.id}
                    namaSlot={s.namaSlot}
                    jenisSlot={s.jenisSlot}
                    current={findLock(hari, s.id, locksToShow)}
                    globalLock={
                      selectedKelasId === "ALL"
                        ? null
                        : findLock(hari, s.id, globalLocks)
                    }
                    mapelOptions={mapelList}
                    ekskulOptions={ekskulList}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
