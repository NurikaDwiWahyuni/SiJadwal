"use client";

import { useActionState, useState } from "react";
import { generatePiket, type GeneratePiketState } from "./actions";
import { HARI_LABEL, type HariType } from "@/lib/constants";

type Guru = {
  id:                string;
  nama:              string;
  kodeGuru:          string;
  /** Hari yang tidak tersedia — ditampilkan di checklist agar admin tahu */
  hariTidakTersedia: HariType[];
};

export default function GeneratePiketForm({ guruList }: { guruList: Guru[] }) {
  const [state, formAction, pending] = useActionState<GeneratePiketState, FormData>(
    generatePiket,
    {}
  );

  const [dipilih, setDipilih] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setDipilih((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll(val: boolean) {
    setDipilih(val ? new Set(guruList.map((g) => g.id)) : new Set());
  }

  const allChecked = dipilih.size === guruList.length && guruList.length > 0;

  return (
    <div className="space-y-6">

      {/* Info */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <p className="font-semibold">Setiap guru yang dipilih mendapat:</p>
        <ul className="mt-1 space-y-0.5 text-xs text-blue-700 list-disc pl-4">
          <li>
            <span className="font-semibold text-amber-700">1 hari Piket Harian</span> — distribusi merata, hanya dari hari yang tersedia
          </li>
          <li>
            <span className="font-semibold text-purple-700">1 hari Piket Karakter</span> — hari <em>berbeda</em> dari Harian, hanya dari hari yang tersedia
          </li>
          <li className="text-red-600 font-medium">
            Guru tidak akan mendapat piket di hari yang ditandai <em>tidak tersedia</em>
          </li>
        </ul>
      </div>

      <form action={formAction} className="space-y-5">
        {/* Tabel pilih guru */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Pilih Guru ({dipilih.size} dipilih)
            </span>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => toggleAll(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-zinc-700"
              />
              Pilih Semua
            </label>
          </div>

          <div className="divide-y divide-zinc-100">
            {guruList.map((g) => {
              const blocked = g.hariTidakTersedia;
              const hariTersediaCount = 6 - blocked.length; // SENIN–SABTU = 6

              return (
                <label
                  key={g.id}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                    dipilih.has(g.id) ? "bg-zinc-50" : "hover:bg-zinc-50/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="guruDipilih"
                    value={g.id}
                    checked={dipilih.has(g.id)}
                    onChange={() => toggle(g.id)}
                    className="h-4 w-4 rounded accent-zinc-800 shrink-0"
                  />
                  <span className="font-mono text-xs font-bold text-zinc-400 w-8 shrink-0">
                    {g.kodeGuru}
                  </span>
                  <span className="text-sm text-zinc-800 flex-1">{g.nama}</span>

                  {/* Info hari tidak tersedia */}
                  {blocked.length > 0 && (
                    <span className="shrink-0 text-[10px] text-red-400 flex items-center gap-1">
                      <span>🚫</span>
                      <span>{blocked.map((h) => HARI_LABEL[h]).join(", ")}</span>
                      {hariTersediaCount < 2 && (
                        <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600 uppercase">
                          {hariTersediaCount === 0 ? "Tidak bisa piket" : "Piket parsial"}
                        </span>
                      )}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || dipilih.size === 0}
          className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Menggenerate…" : `Generate Piket (${dipilih.size} guru)`}
        </button>
      </form>

      {/* Peringatan guru yang tidak bisa dapat piket penuh */}
      {state.peringatan && state.peringatan.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">⚠️ {state.peringatan.length} guru tidak bisa di-assign penuh:</p>
          <ul className="mt-1.5 space-y-1 text-xs list-disc pl-4">
            {state.peringatan.map((p, i) => (
              <li key={i}>
                <span className="font-mono font-bold">{p.kode}</span> {p.guru} — {p.pesan}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hasil generate */}
      {state.success && state.hasil && state.hasil.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-800">
            ✅ Berhasil — {state.hasil.length} guru telah dijadwalkan
          </p>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 w-12">
                    Kode
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Nama Guru
                  </th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                    Piket Harian
                  </th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                    Piket Karakter
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {state.hasil.map((h) => (
                  <tr key={h.kode} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs font-bold text-zinc-500">{h.kode}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-zinc-800">{h.guru}</td>
                    <td className="px-4 py-2.5 text-center">
                      {h.harianHari ? (
                        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          {HARI_LABEL[h.harianHari as HariType]}
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-400">
                          Tidak bisa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {h.karakterHari ? (
                        <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                          {HARI_LABEL[h.karakterHari as HariType]}
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-400">
                          Tidak bisa
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-zinc-400">
            Jadwal sudah tersimpan dan langsung terlihat di papan piket di atas.
          </p>
        </div>
      )}
    </div>
  );
}
