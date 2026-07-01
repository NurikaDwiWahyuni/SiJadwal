"use client";

import { useState, useTransition } from "react";
import { updateJamSlot, deleteSlot } from "./actions";

type Props = {
  id: string;
  urutan: number;
  namaSlot: string;
  jenisSlot: "PELAJARAN" | "NON_PELAJARAN";
  jamMulai: string | null;
  jamSelesai: string | null;
};

export default function SlotRow({ id, urutan, namaSlot, jenisSlot, jamMulai, jamSelesai }: Props) {
  const [mulai,    setMulai]    = useState(jamMulai ?? "");
  const [selesai,  setSelesai]  = useState(jamSelesai ?? "");
  const [saved,    setSaved]    = useState(false);
  const [pending,  startTransition] = useTransition();

  function simpanJam(nextMulai: string, nextSelesai: string) {
    if (nextMulai === (jamMulai ?? "") && nextSelesai === (jamSelesai ?? "")) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("jamMulai", nextMulai);
    fd.set("jamSelesai", nextSelesai);
    startTransition(async () => {
      await updateJamSlot(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  const isNP = jenisSlot === "NON_PELAJARAN";

  return (
    <div className={`flex items-center gap-3 px-4 py-2 text-sm ${isNP ? "bg-amber-50" : ""}`}>
      <span className="w-6 shrink-0 text-center text-xs text-zinc-300 font-mono">{urutan}</span>
      <span className={`w-2 h-2 rounded-full shrink-0 ${isNP ? "bg-amber-400" : "bg-blue-400"}`} />
      <span className="flex-1 font-medium text-zinc-800">{namaSlot}</span>

      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${isNP ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
        {isNP ? "Non-JP" : "JP"}
      </span>

      <div className="flex items-center gap-1 shrink-0">
        <input
          type="time" value={mulai}
          onChange={(e) => setMulai(e.target.value)}
          onBlur={() => simpanJam(mulai, selesai)}
          disabled={pending}
          className="w-[5.5rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-xs tabular-nums text-zinc-500 hover:border-zinc-200 focus:border-zinc-400 focus:bg-white focus:outline-none disabled:opacity-50"
        />
        <span className="text-xs text-zinc-300">–</span>
        <input
          type="time" value={selesai}
          onChange={(e) => setSelesai(e.target.value)}
          onBlur={() => simpanJam(mulai, selesai)}
          disabled={pending}
          className="w-[5.5rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-xs tabular-nums text-zinc-500 hover:border-zinc-200 focus:border-zinc-400 focus:bg-white focus:outline-none disabled:opacity-50"
        />
        <span className="w-3 text-xs shrink-0">{saved && <span className="text-green-500">✓</span>}</span>
      </div>

      <form action={deleteSlot}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="shrink-0 w-6 text-center text-sm text-zinc-300 hover:text-red-500">×</button>
      </form>
    </div>
  );
}
