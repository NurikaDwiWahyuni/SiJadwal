"use client";

import { useActionState } from "react";
import Link from "next/link";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import type { EkskulFormState } from "./actions";

type Props = {
  action: (state: EkskulFormState, formData: FormData) => Promise<EkskulFormState>;
  guruList: { id: string; nama: string; kodeGuru: string }[];
  defaultValues?: {
    nama: string;
    pembinaId: string | null;
    hari: string;
    jamMulai: string;
    jamSelesai: string;
    lokasi: string | null;
  };
  submitLabel: string;
};

export default function EkskulForm({
  action,
  guruList,
  defaultValues,
  submitLabel,
}: Props) {
  const [state, formAction, pending] = useActionState<EkskulFormState, FormData>(
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
          Nama Ekstrakurikuler
        </label>
        <input
          name="nama"
          defaultValue={defaultValues?.nama}
          placeholder="Contoh: Pramuka"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Pembina (Opsional)
        </label>
        <select
          name="pembinaId"
          defaultValue={defaultValues?.pembinaId ?? ""}
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

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Hari</label>
        <select
          name="hari"
          defaultValue={defaultValues?.hari ?? "SENIN"}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        >
          {HARI_LIST.map((h) => (
            <option key={h} value={h}>
              {HARI_LABEL[h]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Jam Mulai
          </label>
          <input
            name="jamMulai"
            type="time"
            defaultValue={defaultValues?.jamMulai}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Jam Selesai
          </label>
          <input
            name="jamSelesai"
            type="time"
            defaultValue={defaultValues?.jamSelesai}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Lokasi (Opsional)
        </label>
        <input
          name="lokasi"
          defaultValue={defaultValues?.lokasi ?? ""}
          placeholder="Contoh: Lapangan Sekolah"
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
          href="/admin/master/ekstrakurikuler"
          className="text-sm text-zinc-600 hover:underline"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
