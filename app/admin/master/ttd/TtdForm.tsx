"use client";

import { useActionState } from "react";
import { updateTtd, type TtdFormState } from "./actions";

type Props = {
  defaultValues: {
    namaKepsek: string;
    nipKepsek: string | null;
    namaWaka: string;
    nipWaka: string | null;
  };
};

export default function TtdForm({ defaultValues }: Props) {
  const [state, formAction, pending] = useActionState<TtdFormState, FormData>(
    updateTtd,
    {}
  );

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Pengaturan tanda tangan berhasil disimpan.
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-zinc-900">Kepala Sekolah</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Nama
            </label>
            <input
              name="namaKepsek"
              defaultValue={defaultValues.namaKepsek}
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              NIP (Opsional)
            </label>
            <input
              name="nipKepsek"
              defaultValue={defaultValues.nipKepsek ?? ""}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-zinc-900">Waka Kurikulum</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Nama
            </label>
            <input
              name="namaWaka"
              defaultValue={defaultValues.namaWaka}
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              NIP (Opsional)
            </label>
            <input
              name="nipWaka"
              defaultValue={defaultValues.nipWaka ?? ""}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}
