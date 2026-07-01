"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { MapelFormState } from "./actions";
import PengampuFieldset from "./PengampuFieldset";

type KelasOpt = { id: string; namaKelas: string };
type GuruOpt = { id: string; nama: string; kodeGuru: string; maksJp: number | null; totalJp: number };

type Props = {
  action: (state: MapelFormState, formData: FormData) => Promise<MapelFormState>;
  defaultValues?: {
    namaMapel: string;
    kodeMapel: string;
    jpMaksBerurutan: number;
    jumlahPertemuanMaks: number;
    aktif: boolean;
  };
  submitLabel: string;
  /** Data utk fieldset "Guru Pengampu per Kelas". Kalau tidak dikirim, fieldset disembunyikan. */
  kelasList?: KelasOpt[];
  guruList?: GuruOpt[];
  existingPengampu?: Record<string, { guruId: string; jp: number }>;
  /** JP dari mapel ini per guru (untuk koreksi penghitungan sisa saat edit) */
  jpDariMapelIni?: Record<string, number>;
  periodeAktif?: boolean;
};

export default function MapelForm({
  action,
  defaultValues,
  submitLabel,
  kelasList,
  guruList,
  existingPengampu,
  jpDariMapelIni,
  periodeAktif,
}: Props) {
  const [state, formAction, pending] = useActionState<MapelFormState, FormData>(
    action,
    {}
  );

  const showPengampu = kelasList !== undefined && guruList !== undefined;

  return (
    <form
      action={formAction}
      className={`space-y-6 ${showPengampu ? "max-w-3xl" : "max-w-xl"}`}
    >
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="max-w-xl space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Kode Mapel
          </label>
          <input
            name="kodeMapel"
            defaultValue={defaultValues?.kodeMapel}
            placeholder="Contoh: MTK"
            maxLength={15}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Nama Mapel
          </label>
          <input
            name="namaMapel"
            defaultValue={defaultValues?.namaMapel}
            placeholder="Contoh: Matematika"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              name="aktif"
              value="1"
              defaultChecked={defaultValues?.aktif ?? true}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            <span className="text-sm font-medium text-zinc-700">
              Mapel aktif
            </span>
          </label>
          <p className="mt-1 ml-6 text-xs text-zinc-500">
            Mapel non-aktif tidak akan muncul dalam daftar efektif kelas manapun
            dan tidak akan dijadwalkan.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              JP Maks Berurutan
            </label>
            <input
              name="jpMaksBerurutan"
              type="number"
              min={1}
              defaultValue={defaultValues?.jpMaksBerurutan ?? 2}
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Maks JP berturut-turut dalam 1 hari
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Jumlah Pertemuan Maks
            </label>
            <input
              name="jumlahPertemuanMaks"
              type="number"
              min={1}
              defaultValue={defaultValues?.jumlahPertemuanMaks ?? 3}
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Maks pertemuan per minggu per kelas
            </p>
          </div>
        </div>
      </div>

      {showPengampu && (
        <PengampuFieldset
          kelasList={kelasList!}
          guruList={guruList!}
          existing={existingPengampu ?? {}}
          jpDariMapelIni={jpDariMapelIni ?? {}}
          periodeAktif={periodeAktif ?? false}
        />
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Menyimpan..." : submitLabel}
        </button>
        <Link
          href="/admin/master/mapel"
          className="text-sm text-zinc-600 hover:underline"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
