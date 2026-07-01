"use client";

import { setPiketGuru } from "./actions";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";

export default function PiketRow({
  guruId,
  harianHari,
  karakterHari,
}: {
  guruId: string;
  harianHari: string | null;
  karakterHari: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Piket Harian */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-amber-700 uppercase">Harian</span>
        <form action={setPiketGuru}>
          <input type="hidden" name="guruId" value={guruId} />
          <input type="hidden" name="jenisPiket" value="HARIAN" />
          <select
            name="hari"
            defaultValue={harianHari ?? ""}
            onChange={(e) => {
              const form = e.target.closest("form") as HTMLFormElement;
              const fd = new FormData(form);
              fd.set("hari", e.target.value);
              setPiketGuru(fd);
            }}
            className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900 focus:outline-none focus:border-amber-400"
          >
            <option value="">— Tidak piket —</option>
            {HARI_LIST.map((h) => (
              <option key={h} value={h}>{HARI_LABEL[h]}</option>
            ))}
          </select>
        </form>
      </div>

      {/* Piket Karakter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-purple-700 uppercase">Karakter</span>
        <form action={setPiketGuru}>
          <input type="hidden" name="guruId" value={guruId} />
          <input type="hidden" name="jenisPiket" value="KARAKTER" />
          <select
            name="hari"
            defaultValue={karakterHari ?? ""}
            onChange={(e) => {
              const form = e.target.closest("form") as HTMLFormElement;
              const fd = new FormData(form);
              fd.set("hari", e.target.value);
              setPiketGuru(fd);
            }}
            className="rounded border border-purple-200 bg-purple-50 px-2 py-1 text-xs text-purple-900 focus:outline-none focus:border-purple-400"
          >
            <option value="">— Tidak piket —</option>
            {HARI_LIST.map((h) => (
              <option key={h} value={h}>{HARI_LABEL[h]}</option>
            ))}
          </select>
        </form>
      </div>
    </div>
  );
}
