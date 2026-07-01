"use client";

import { useState, useTransition } from "react";
import { tambahJadwalManual } from "@/app/admin/penjadwalan/actions";

type BebanOpt = {
  id: string;
  guruId: string;
  guruNama: string;
  mapelNama: string;
  mapelKode: string;
  jp: number;
};

type Props = {
  periodeAkademikId: string;
  kelasId: string;
  slotWaktuId: string;
  hari: string;
  bebanList: BebanOpt[];
};

export default function SlotKosongInput({
  periodeAkademikId,
  kelasId,
  slotWaktuId,
  hari,
  bebanList,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [pesan, setPesan] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSimpan() {
    const beban = bebanList.find((b) => b.id === selected);
    if (!beban) return;

    startTransition(async () => {
      const res = await tambahJadwalManual({
        periodeAkademikId,
        kelasId,
        slotWaktuId,
        hari,
        bebanMengajarId: beban.id,
        guruId: beban.guruId,
      });
      if (res.ok) {
        setOpen(false);
        setSelected("");
        setPesan(null);
      } else {
        setPesan({ ok: false, text: res.pesan ?? "Gagal menyimpan." });
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-colors"
      >
        + Isi manual…
      </button>
    );
  }

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 space-y-2">
      <p className="text-xs font-medium text-blue-800">Pilih mapel untuk slot ini:</p>

      <select
        value={selected}
        onChange={(e) => { setSelected(e.target.value); setPesan(null); }}
        className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
      >
        <option value="">— Pilih mapel / guru —</option>
        {bebanList.map((b) => (
          <option key={b.id} value={b.id}>
            {b.mapelNama} ({b.mapelKode}) — {b.guruNama} · {b.jp} JP
          </option>
        ))}
      </select>

      {pesan && (
        <p className={`text-xs ${pesan.ok ? "text-green-700" : "text-red-600"}`}>
          {pesan.text}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSimpan}
          disabled={!selected || isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {isPending ? "Menyimpan…" : "Simpan"}
        </button>
        <button
          onClick={() => { setOpen(false); setSelected(""); setPesan(null); }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
