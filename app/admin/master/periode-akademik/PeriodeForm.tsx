"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { PeriodeFormState } from "./actions";

type Props = {
  action: (state: PeriodeFormState, formData: FormData) => Promise<PeriodeFormState>;
  defaultValues?: { tahun: string; semester: string };
  submitLabel: string;
};

export default function PeriodeForm({ action, defaultValues, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<PeriodeFormState, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Tahun Ajaran
        </label>
        <input
          name="tahun"
          defaultValue={defaultValues?.tahun}
          placeholder="Contoh: 2026/2027"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Semester
        </label>
        <select
          name="semester"
          defaultValue={defaultValues?.semester ?? "GANJIL"}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        >
          <option value="GANJIL">Ganjil</option>
          <option value="GENAP">Genap</option>
        </select>
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
          href="/admin/master/periode-akademik"
          className="text-sm text-zinc-600 hover:underline"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
