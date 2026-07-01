"use client";

import { useActionState } from "react";
import Link from "next/link";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import type { GuruFormState } from "./actions";

type Props = {
  action: (state: GuruFormState, formData: FormData) => Promise<GuruFormState>;
  defaultValues?: {
    kodeGuru: string;
    nama: string;
    status: "PNS" | "HONOR";
    hariTidakTersedia: string[];
    maksJp?: number | null;
  };
  submitLabel: string;
};

export default function GuruForm({
  action,
  defaultValues,
  submitLabel,
}: Props) {
  const [state, formAction, pending] = useActionState<GuruFormState, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Kode Guru
        </label>
        <input
          name="kodeGuru"
          defaultValue={defaultValues?.kodeGuru}
          placeholder="Contoh: AAS"
          maxLength={10}
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase focus:border-zinc-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Muncul di roster jadwal, mis. &quot;MTK (AAS)&quot;
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Nama Guru
        </label>
        <input
          name="nama"
          defaultValue={defaultValues?.nama}
          placeholder="Contoh: Ahmad Arifin"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Status
        </label>
        <select
          name="status"
          defaultValue={defaultValues?.status ?? "PNS"}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        >
          <option value="PNS">PNS</option>
          <option value="HONOR">Honor</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Maks JP / Minggu
        </label>
        <input
          name="maksJp"
          type="number"
          min={1}
          defaultValue={defaultValues?.maksJp ?? ""}
          placeholder="Contoh: 24"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Batas maksimum jam pelajaran per minggu untuk guru ini. Kosongkan jika tidak dibatasi.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Hari Tidak Tersedia (Opsional)
        </label>
        <div className="flex flex-wrap gap-3">
          {HARI_LIST.map((hari) => (
            <label
              key={hari}
              className="flex items-center gap-1.5 text-sm text-zinc-700"
            >
              <input
                type="checkbox"
                name="hariTidakTersedia"
                value={hari}
                defaultChecked={defaultValues?.hariTidakTersedia.includes(hari)}
                className="rounded border-zinc-300"
              />
              {HARI_LABEL[hari]}
            </label>
          ))}
        </div>
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
          href="/admin/master/guru"
          className="text-sm text-zinc-600 hover:underline"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
