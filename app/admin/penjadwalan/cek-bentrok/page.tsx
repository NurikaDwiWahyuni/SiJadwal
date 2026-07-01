import { prisma } from "@/lib/prisma";
import { HARI_LABEL } from "@/lib/constants";
import type { HariType } from "@/lib/constants";

type BentrokItem = {
  tipe: "guru" | "kelas";
  nama: string;
  hari: string;
  slot: string;
  konflik: string[];
};

export default async function CekBentrokPage() {
  const periode = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });

  if (!periode) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900">Cek Bentrok</h1>
        <p className="text-sm text-zinc-500">Belum ada periode akademik aktif.</p>
      </div>
    );
  }

  const semua = await prisma.jadwal.findMany({
    where: { periodeAkademikId: periode.id },
    include: {
      guru: { select: { id: true, nama: true, kodeGuru: true } },
      kelas: { select: { id: true, namaKelas: true } },
      slotWaktu: { select: { id: true, namaSlot: true, urutan: true } },
      bebanMengajar: { include: { mapel: { select: { namaMapel: true } } } },
    },
  });

  const bentrokList: BentrokItem[] = [];

  // ── Deteksi bentrok guru (satu guru di >1 kelas pada slot yang sama) ──
  const guruSlotMap = new Map<string, typeof semua>();
  for (const j of semua) {
    const k = `${j.guruId}__${j.hari}__${j.slotWaktuId}`;
    if (!guruSlotMap.has(k)) guruSlotMap.set(k, []);
    guruSlotMap.get(k)!.push(j);
  }
  for (const [, items] of guruSlotMap) {
    if (items.length > 1) {
      bentrokList.push({
        tipe: "guru",
        nama: `${items[0].guru.nama} (${items[0].guru.kodeGuru})`,
        hari: HARI_LABEL[items[0].hari as HariType],
        slot: items[0].slotWaktu.namaSlot,
        konflik: items.map(
          (i) => `${i.kelas.namaKelas} — ${i.bebanMengajar.mapel.namaMapel}`
        ),
      });
    }
  }

  // ── Deteksi bentrok kelas (satu kelas ada >1 mapel di slot yang sama) ──
  const kelasSlotMap = new Map<string, typeof semua>();
  for (const j of semua) {
    const k = `${j.kelasId}__${j.hari}__${j.slotWaktuId}`;
    if (!kelasSlotMap.has(k)) kelasSlotMap.set(k, []);
    kelasSlotMap.get(k)!.push(j);
  }
  for (const [, items] of kelasSlotMap) {
    if (items.length > 1) {
      bentrokList.push({
        tipe: "kelas",
        nama: items[0].kelas.namaKelas,
        hari: HARI_LABEL[items[0].hari as HariType],
        slot: items[0].slotWaktu.namaSlot,
        konflik: items.map(
          (i) => `${i.bebanMengajar.mapel.namaMapel} — ${i.guru.nama}`
        ),
      });
    }
  }

  // ── Rekap JP per guru ──────────────────────────────────────────────────────
  const guruStats = await prisma.guru.findMany({
    orderBy: { nama: "asc" },
    include: {
      bebanMengajar: {
        where: { periodeAkademikId: periode.id },
        select: { jp: true },
      },
      jadwal: {
        where: { periodeAkademikId: periode.id },
        select: { id: true },
      },
    },
  });

  const kurangSlot = guruStats.filter((g) => {
    const targetJp = g.bebanMengajar.reduce((s, b) => s + b.jp, 0);
    return targetJp > 0 && g.jadwal.length < targetJp;
  });

  const totalBentrok = bentrokList.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Cek Bentrok</h1>
        <p className="text-sm text-zinc-500">
          Deteksi manual konflik jadwal: guru mengajar di dua tempat sekaligus,
          atau kelas mendapat dua mapel di slot yang sama.
        </p>
      </div>

      {/* ── Ringkasan ── */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className={`rounded-lg border p-4 ${
            totalBentrok > 0
              ? "border-red-200 bg-red-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <p className="text-xs text-zinc-500">Bentrok Ditemukan</p>
          <p
            className={`mt-1 text-3xl font-bold ${
              totalBentrok > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {totalBentrok}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {totalBentrok === 0 ? "Jadwal aman" : "Perlu diperbaiki"}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Total Slot Terjadwal</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{semua.length}</p>
        </div>
        <div
          className={`rounded-lg border p-4 ${
            kurangSlot.length > 0
              ? "border-amber-200 bg-amber-50"
              : "border-zinc-200 bg-white"
          }`}
        >
          <p className="text-xs text-zinc-500">Guru JP Belum Terpenuhi</p>
          <p
            className={`mt-1 text-3xl font-bold ${
              kurangSlot.length > 0 ? "text-amber-600" : "text-zinc-900"
            }`}
          >
            {kurangSlot.length}
          </p>
          <p className="mt-1 text-xs text-zinc-400">dari {guruStats.length} guru</p>
        </div>
      </div>

      {/* ── Daftar bentrok ── */}
      {totalBentrok === 0 ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-8 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm font-medium text-green-800">
            Tidak ada bentrok terdeteksi
          </p>
          <p className="text-xs text-green-600 mt-1">
            Semua guru dan kelas terjadwal tanpa konflik slot waktu.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-red-700">
            ⚠️ {totalBentrok} konflik ditemukan
          </p>
          {bentrokList.map((b, i) => (
            <div key={i} className="rounded-lg border border-red-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    b.tipe === "guru"
                      ? "bg-red-100 text-red-600"
                      : "bg-orange-100 text-orange-600"
                  }`}
                >
                  {b.tipe}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{b.nama}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {b.hari} · {b.slot}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {b.konflik.map((k, j) => (
                      <li
                        key={j}
                        className="rounded bg-red-50 px-2 py-1.5 text-xs text-red-700"
                      >
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Guru JP kurang ── */}
      {kurangSlot.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-amber-700">
            ⚠️ {kurangSlot.length} guru dengan JP belum terpenuhi
          </p>
          <div className="rounded-lg border border-amber-200 bg-white divide-y divide-zinc-100 overflow-hidden">
            {kurangSlot.map((g) => {
              const target = g.bebanMengajar.reduce((s, b) => s + b.jp, 0);
              const aktual = g.jadwal.length;
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-4 px-4 py-3 text-sm"
                >
                  <span className="w-44 truncate font-medium text-zinc-800">
                    {g.nama}
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {g.kodeGuru}
                  </span>
                  <span className="ml-auto text-xs text-zinc-500">
                    Target <strong>{target} JP</strong>
                  </span>
                  <span className="text-xs text-zinc-500">
                    Terjadwal <strong>{aktual}</strong>
                  </span>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    -{target - aktual} JP
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-zinc-400">
            JP kurang biasanya karena slot waktu tidak cukup, hari tidak tersedia
            guru, atau terlalu banyak slot terkunci. Coba tambah slot waktu atau
            kurangi beban JP.
          </p>
        </div>
      )}

      {/* ── Rekap semua guru ── */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-700">Rekap JP Semua Guru</p>
        <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs text-zinc-500">
                <th className="px-4 py-2.5 font-medium">Nama Guru</th>
                <th className="px-3 py-2.5 font-medium">Kode</th>
                <th className="px-3 py-2.5 font-medium text-right">Target JP</th>
                <th className="px-3 py-2.5 font-medium text-right">Terjadwal</th>
                <th className="px-4 py-2.5 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {guruStats.map((g) => {
                const target = g.bebanMengajar.reduce((s, b) => s + b.jp, 0);
                const aktual = g.jadwal.length;
                const noBeban = target === 0;
                const ok = aktual >= target;
                return (
                  <tr key={g.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5 font-medium text-zinc-800">
                      {g.nama}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">
                      {g.kodeGuru}
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-600">
                      {target}
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-600">
                      {aktual}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {noBeban ? (
                        <span className="text-xs text-zinc-300">—</span>
                      ) : ok ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                          ✓ OK
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          -{target - aktual} JP
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
