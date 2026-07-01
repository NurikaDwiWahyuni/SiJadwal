import { prisma } from "@/lib/prisma";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import type { SlotWaktuSimpan } from "@/lib/slotUtils";
import SlotGeneratorForm from "./SlotGeneratorForm";
import SlotRow from "./SlotRow";

type Props = {
  searchParams: Promise<{ hari?: string }>;
};

export default async function SlotWaktuPage({ searchParams }: Props) {
  const { hari: hariParam } = await searchParams;
  // Validasi hari dari URL, fallback ke SENIN
  const hariAktif = (HARI_LIST as readonly string[]).includes(hariParam ?? "")
    ? (hariParam as string)
    : "SENIN";

  const slotList = await prisma.slotWaktu.findMany({
    orderBy: [{ hari: "asc" }, { urutan: "asc" }],
  });

  // Kelompokkan slot per hari untuk hydrate editor
  const slotsByHari: Record<string, SlotWaktuSimpan[]> = {};
  for (const s of slotList) {
    if (!slotsByHari[s.hari]) slotsByHari[s.hari] = [];
    slotsByHari[s.hari].push({
      namaSlot:   s.namaSlot,
      jenisSlot:  s.jenisSlot as "PELAJARAN" | "NON_PELAJARAN",
      jamMulai:   s.jamMulai,
      jamSelesai: s.jamSelesai,
    });
  }

  const grouped = HARI_LIST.map((hari) => ({
    hari,
    slots: slotList.filter((s) => s.hari === hari),
  }));

  const totalJP = slotList.filter((s) => s.jenisSlot === "PELAJARAN").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Slot Waktu</h1>
        <p className="text-sm text-zinc-500">
          Builder adalah sumber kebenaran. Hasil generate bersifat sementara —
          jika slot diubah, hasil generate lama akan dihapus dan dibuat ulang.
        </p>
      </div>

      {/*
        key={hariAktif} → React me-remount SlotGeneratorForm setiap kali hari berubah.
        Ini membuat init state selalu fresh dari slotsByHari[hariAktif]
        tanpa perlu useEffect yang bisa menyebabkan race condition.
      */}
      <SlotGeneratorForm
        key={hariAktif}
        slotsByHari={slotsByHari}
        hariAktif={hariAktif}
      />

      {slotList.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-800">Slot Tersimpan</h2>
            <span className="text-xs text-zinc-400">
              {slotList.length} slot · {totalJP} JP
            </span>
          </div>

          {grouped.map(({ hari, slots }) => {
            if (slots.length === 0) return null;
            return (
              <div key={hari} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
                  <p className="text-sm font-semibold text-zinc-700">
                    {HARI_LABEL[hari]}
                    <span className="ml-2 text-xs font-normal text-zinc-400">
                      {slots.filter((s) => s.jenisSlot === "PELAJARAN").length} JP ·{" "}
                      {slots.filter((s) => s.jenisSlot === "NON_PELAJARAN").length} non-JP
                    </span>
                  </p>
                </div>
                <div className="divide-y divide-zinc-50">
                  {slots.map((s) => (
                    <SlotRow
                      key={s.id}
                      id={s.id}
                      urutan={s.urutan}
                      namaSlot={s.namaSlot}
                      jenisSlot={s.jenisSlot as "PELAJARAN" | "NON_PELAJARAN"}
                      jamMulai={s.jamMulai}
                      jamSelesai={s.jamSelesai}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
