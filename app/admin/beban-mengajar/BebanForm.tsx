"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { MapelBadge } from "@/lib/mapel-color";
import type { BebanFormState } from "./actions";

type ExistingBeban = {
  id: string;
  kelasNama: string;
  mapelNama: string;
  mapelKode: string;
  jp: number;
};

type Props = {
  action: (state: BebanFormState, formData: FormData) => Promise<BebanFormState>;
  guruList: { id: string; nama: string; kodeGuru: string; maksJp: number | null; totalJp: number }[];
  kelasList: { id: string; namaKelas: string }[];
  mapelList: { id: string; namaMapel: string; kodeMapel: string }[];
  /** Semua beban mengajar yang sudah ada di periode aktif, untuk konteks per-guru. */
  allBeban: {
    guruId: string;
    kelasId: string;
    mapelId: string;
    kelas: { namaKelas: string };
    mapel: { namaMapel: string; kodeMapel: string };
    jp: number;
    id: string;
  }[];
  defaultValues?: { guruId: string; kelasId: string; mapelId: string; jp: number };
  /** id record yang sedang diedit, supaya tidak dianggap "sudah ada" terhadap dirinya sendiri */
  editingId?: string;
  submitLabel: string;
};

export default function BebanForm({
  action,
  guruList,
  kelasList,
  mapelList,
  allBeban,
  defaultValues,
  editingId,
  submitLabel,
}: Props) {
  const [state, formAction, pending] = useActionState<BebanFormState, FormData>(
    action,
    {}
  );

  const [guruId, setGuruId] = useState(defaultValues?.guruId ?? "");
  const [kelasId, setKelasId] = useState(defaultValues?.kelasId ?? "");
  const [mapelId, setMapelId] = useState(defaultValues?.mapelId ?? "");

  const selectedGuru = guruList.find((g) => g.id === guruId);
  const jpSisa = selectedGuru?.maksJp != null
    ? selectedGuru.maksJp - selectedGuru.totalJp
    : null;

  const existingForGuru: ExistingBeban[] = useMemo(() => {
    return allBeban
      .filter((b) => b.guruId === guruId && b.id !== editingId)
      .map((b) => ({
        id: b.id,
        kelasNama: b.kelas.namaKelas,
        mapelNama: b.mapel.namaMapel,
        mapelKode: b.mapel.kodeMapel,
        jp: b.jp,
      }))
      .sort((a, b) => a.kelasNama.localeCompare(b.kelasNama));
  }, [allBeban, guruId, editingId]);

  const distinctMapelCount = new Set(existingForGuru.map((e) => e.mapelKode)).size;

  const isDuplicate = useMemo(() => {
    if (!guruId || !kelasId || !mapelId) return false;
    return allBeban.some(
      (b) =>
        b.id !== editingId &&
        b.guruId === guruId &&
        b.kelasId === kelasId &&
        b.mapelId === mapelId
    );
  }, [allBeban, guruId, kelasId, mapelId, editingId]);

  return (
    <div className="flex max-w-3xl flex-col gap-6 lg:flex-row">
      <form action={formAction} className="flex-1 space-y-5">
        {state.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {isDuplicate && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Kombinasi guru, kelas, dan mapel ini sudah tercatat sebelumnya.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Guru</label>
          <select
            name="guruId"
            value={guruId}
            onChange={(e) => setGuruId(e.target.value)}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            <option value="" disabled>
              - Pilih Guru -
            </option>
            {guruList.map((g) => {
              const penuh = g.maksJp != null && g.totalJp >= g.maksJp;
              return (
                <option key={g.id} value={g.id} disabled={penuh}>
                  {g.nama} ({g.kodeGuru}){penuh ? ` — JP penuh (${g.totalJp}/${g.maksJp})` : g.maksJp != null ? ` — ${g.totalJp}/${g.maksJp} JP` : ""}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-xs text-zinc-400">
            Guru dengan JP penuh (sesuai maks JP) tidak dapat dipilih.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Kelas</label>
          <select
            name="kelasId"
            value={kelasId}
            onChange={(e) => setKelasId(e.target.value)}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            <option value="" disabled>
              - Pilih Kelas -
            </option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namaKelas}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Mata Pelajaran
          </label>
          <select
            name="mapelId"
            value={mapelId}
            onChange={(e) => setMapelId(e.target.value)}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            <option value="" disabled>
              - Pilih Mapel -
            </option>
            {mapelList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.namaMapel} ({m.kodeMapel})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-400">
            Satu mapel boleh diajar oleh lebih dari satu guru, di kelas yang
            berbeda-beda.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Jumlah JP per Minggu
          </label>
          <input
            name="jp"
            type="number"
            min={1}
            defaultValue={defaultValues?.jp ?? 2}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
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
            href="/admin/beban-mengajar"
            className="text-sm text-zinc-600 hover:underline"
          >
            Batal
          </Link>
        </div>
      </form>

      {/* Panel konteks: apa saja yang sudah diajar guru terpilih */}
      <div className="w-full shrink-0 lg:w-64">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          {!selectedGuru ? (
            <p className="text-sm text-zinc-400">
              Pilih guru untuk melihat penugasan yang sudah ada.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-zinc-900">
                {selectedGuru.nama}
              </p>

              {/* Progress JP */}
              {selectedGuru.maksJp != null && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500">JP terpakai</span>
                    <span className={jpSisa != null && jpSisa <= 0 ? "font-semibold text-red-600" : "font-semibold text-zinc-700"}>
                      {selectedGuru.totalJp} / {selectedGuru.maksJp} JP
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-200">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        jpSisa != null && jpSisa <= 0
                          ? "bg-red-500"
                          : jpSisa != null && jpSisa <= 4
                          ? "bg-amber-400"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, (selectedGuru.totalJp / selectedGuru.maksJp) * 100)}%` }}
                    />
                  </div>
                  {jpSisa != null && jpSisa <= 0 ? (
                    <p className="mt-1 text-xs text-red-600 font-medium">JP sudah penuh — guru ini tidak bisa ditambah beban lagi.</p>
                  ) : jpSisa != null && jpSisa <= 4 ? (
                    <p className="mt-1 text-xs text-amber-600">Sisa {jpSisa} JP lagi.</p>
                  ) : jpSisa != null ? (
                    <p className="mt-1 text-xs text-zinc-400">Sisa {jpSisa} JP.</p>
                  ) : null}
                </div>
              )}

              <p className="mb-3 text-xs text-zinc-500">
                {existingForGuru.length === 0
                  ? "Belum ada penugasan tercatat."
                  : `Mengajar ${distinctMapelCount} mapel berbeda di ${
                      new Set(existingForGuru.map((e) => e.kelasNama)).size
                    } kelas.`}
              </p>
              <ul className="space-y-1.5">
                {existingForGuru.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1.5 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <MapelBadge nama={e.mapelNama} kode={e.mapelKode} size="sm" />
                      <span className="truncate text-zinc-600">{e.kelasNama}</span>
                    </div>
                    <span className="shrink-0 text-zinc-400">{e.jp} JP</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
