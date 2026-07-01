"use client";

import { useTransition } from "react";
import { setPiketGuru } from "./actions";
import { HARI_LIST, HARI_LABEL, type HariType } from "@/lib/constants";

type Props = {
  guruId:              string;
  kodeGuru:            string;
  nama:                string;
  status:              string;
  harianHari:          string | null;
  karakterHari:        string | null;
  /** Hari yang TIDAK tersedia untuk guru ini — tombol hari ini akan disabled */
  hariTidakTersedia:   HariType[];
};

const HARI_AKTIF = [...HARI_LIST] as HariType[];

export default function PiketGrid({
  guruId,
  kodeGuru,
  nama,
  status,
  harianHari,
  karakterHari,
  hariTidakTersedia,
}: Props) {
  const [pending, startTransition] = useTransition();

  function handle(jenis: "HARIAN" | "KARAKTER", hari: HariType, aktif: boolean) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("guruId",     guruId);
      fd.set("jenisPiket", jenis);
      fd.set("hari",       aktif ? "" : hari); // kosong = hapus
      await setPiketGuru(fd);
    });
  }

  return (
    <tr className={`transition-opacity ${pending ? "opacity-40 pointer-events-none" : ""}`}>
      {/* Kode */}
      <td className="px-4 py-3 align-middle">
        <span className="font-mono text-xs font-bold text-zinc-500">{kodeGuru}</span>
      </td>

      {/* Nama */}
      <td className="px-4 py-3 align-middle">
        <div className="text-sm font-medium text-zinc-800">{nama}</div>
        <div className="text-[10px] text-zinc-400">{status}</div>
        {hariTidakTersedia.length > 0 && (
          <div className="mt-0.5 text-[10px] text-red-400">
            Tidak tersedia: {hariTidakTersedia.map((h) => HARI_LABEL[h]).join(", ")}
          </div>
        )}
      </td>

      {/* Satu sel per hari */}
      {HARI_AKTIF.map((hari) => {
        const isH      = harianHari   === hari;
        const isK      = karakterHari === hari;
        const blocked  = hariTidakTersedia.includes(hari);

        return (
          <td key={hari} className="px-3 py-2 align-middle">
            {blocked ? (
              /* Hari tidak tersedia — tampilkan penanda, semua tombol disabled */
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium bg-red-50 border border-red-100 text-red-300 cursor-not-allowed select-none">
                  <span className="inline-block h-2 w-2 rounded-full shrink-0 bg-red-200" />
                  Tidak tersedia
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {/* Tombol Harian */}
                <button
                  type="button"
                  onClick={() => handle("HARIAN", hari, isH)}
                  className={`
                    flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold
                    transition-all border
                    ${isH
                      ? "bg-amber-100 border-amber-300 text-amber-800 shadow-sm"
                      : "bg-zinc-50 border-zinc-200 text-zinc-400 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600"}
                  `}
                >
                  <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${isH ? "bg-amber-500" : "bg-zinc-300"}`} />
                  Harian
                </button>

                {/* Tombol Karakter */}
                <button
                  type="button"
                  onClick={() => handle("KARAKTER", hari, isK)}
                  className={`
                    flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold
                    transition-all border
                    ${isK
                      ? "bg-purple-100 border-purple-300 text-purple-800 shadow-sm"
                      : "bg-zinc-50 border-zinc-200 text-zinc-400 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600"}
                  `}
                >
                  <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${isK ? "bg-purple-500" : "bg-zinc-300"}`} />
                  Karakter
                </button>
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}
