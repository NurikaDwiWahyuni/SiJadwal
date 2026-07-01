"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { KelasFormState } from "./actions";
import type { KelasMapelMode, MapelRingkas } from "@/lib/kelas-mapel";

type Props = {
  action: (state: KelasFormState, formData: FormData) => Promise<KelasFormState>;
  guruList: { id: string; nama: string; kodeGuru: string }[];
  mapelList: MapelRingkas[];
  defaultValues?: {
    namaKelas: string;
    waliKelasId: string | null;
    mapelMode: KelasMapelMode;
    mapelIds: string[];
  };
  submitLabel: string;
};

export default function KelasForm({
  action,
  guruList,
  mapelList,
  defaultValues,
  submitLabel,
}: Props) {
  const [state, formAction, pending] = useActionState<KelasFormState, FormData>(
    action,
    {}
  );

  const [mode, setMode] = useState<KelasMapelMode>(
    defaultValues?.mapelMode ?? "ALL"
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(defaultValues?.mapelIds ?? [])
  );

  function toggleMapel(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const showPicker = mode === "CUSTOM" || mode === "EXCLUDE";
  const pickerLabel =
    mode === "CUSTOM"
      ? "Pilih mapel yang DIIKUTKAN untuk kelas ini:"
      : "Pilih mapel yang DIKECUALIKAN dari kelas ini:";

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* ── Nama Kelas ──────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Nama Kelas
        </label>
        <input
          name="namaKelas"
          defaultValue={defaultValues?.namaKelas}
          placeholder="Contoh: VII-1"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {/* ── Wali Kelas ──────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Wali Kelas (Opsional)
        </label>
        <select
          name="waliKelasId"
          defaultValue={defaultValues?.waliKelasId ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        >
          <option value="">- Belum ditentukan -</option>
          {guruList.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nama} ({g.kodeGuru})
            </option>
          ))}
        </select>
      </div>

      {/* ── Konfigurasi Mapel ───────────────────────────────── */}
      <div className="rounded-lg border border-zinc-200 p-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-zinc-700 mb-2">
            Konfigurasi Mata Pelajaran
          </p>
          <p className="text-xs text-zinc-500 mb-3">
            Tentukan mapel apa saja yang berlaku untuk kelas ini.
          </p>

          <div className="space-y-2">
            {/* ALL */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="mapelMode"
                value="ALL"
                checked={mode === "ALL"}
                onChange={() => { setMode("ALL"); setSelectedIds(new Set()); }}
                className="mt-0.5"
              />
              <span className="text-sm text-zinc-800">
                <span className="font-medium">Gunakan semua mapel aktif</span>
                <span className="block text-xs text-zinc-500">
                  Default — kelas ini akan mendapatkan seluruh {mapelList.length} mapel yang aktif.
                </span>
              </span>
            </label>

            {/* CUSTOM */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="mapelMode"
                value="CUSTOM"
                checked={mode === "CUSTOM"}
                onChange={() => { setMode("CUSTOM"); setSelectedIds(new Set()); }}
                className="mt-0.5"
              />
              <span className="text-sm text-zinc-800">
                <span className="font-medium">Pilih hanya mapel tertentu</span>
                <span className="block text-xs text-zinc-500">
                  Hanya mapel yang Anda centang yang berlaku untuk kelas ini.
                </span>
              </span>
            </label>

            {/* EXCLUDE */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="mapelMode"
                value="EXCLUDE"
                checked={mode === "EXCLUDE"}
                onChange={() => { setMode("EXCLUDE"); setSelectedIds(new Set()); }}
                className="mt-0.5"
              />
              <span className="text-sm text-zinc-800">
                <span className="font-medium">Kecualikan mapel tertentu</span>
                <span className="block text-xs text-zinc-500">
                  Semua mapel aktif digunakan, kecuali yang Anda centang.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* ── Picker mapel (muncul untuk CUSTOM / EXCLUDE) ── */}
        {showPicker && (
          <div>
            <p className="text-xs font-medium text-zinc-600 mb-2">{pickerLabel}</p>
            <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto pr-1 border border-zinc-200 rounded-md p-2">
              {mapelList.length === 0 && (
                <p className="text-xs text-zinc-400 py-2 text-center">
                  Belum ada mapel aktif.
                </p>
              )}
              {mapelList.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name="mapelIds"
                    value={m.id}
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleMapel(m.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-zinc-800">
                    {m.namaMapel}
                    <span className="ml-1.5 text-xs text-zinc-400">[{m.kodeMapel}]</span>
                  </span>
                </label>
              ))}
            </div>
            {selectedIds.size > 0 && (
              <p className="mt-1.5 text-xs text-zinc-500">
                {selectedIds.size} mapel dipilih.
              </p>
            )}
          </div>
        )}

        {/* Ringkasan saat mode ALL */}
        {mode === "ALL" && (
          <p className="text-xs text-zinc-400">
            ✓ Kelas ini akan otomatis mendapatkan semua mapel aktif saat ini dan
            yang ditambahkan di masa depan.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Menyimpan..." : submitLabel}
        </button>
        <Link
          href="/admin/master/kelas"
          className="text-sm text-zinc-600 hover:underline"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
