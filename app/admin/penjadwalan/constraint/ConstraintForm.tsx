"use client";

import { useActionState, useState } from "react";
import { addConstraint, type ConstraintFormState } from "./actions";
import { HARI_LIST, HARI_LABEL, type HariType } from "@/lib/constants";

type KelasOpt = { id: string; namaKelas: string };

/**
 * Slot JP yang sudah terjadwal — dikirim dari server (per kelas+hari).
 * key: `${kelasId}__${hari}` → array slot
 */
type SlotInfo = {
  slotWaktuId: string;
  namaSlot: string;
  namaMapel: string;
  kodeMapel: string;
  namaGuru: string;
  isLocked: boolean;
};

type Props = {
  kelasList: KelasOpt[];
  /**
   * Semua slot JP terjadwal untuk periode aktif.
   * Map key: `${kelasId}__${hari}`
   */
  slotMap: Record<string, SlotInfo[]>;
};

export default function ConstraintForm({ kelasList, slotMap }: Props) {
  const [state, formAction, pending] = useActionState<ConstraintFormState, FormData>(
    addConstraint,
    {}
  );

  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedHari, setSelectedHari] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  const mapKey = selectedKelas && selectedHari ? `${selectedKelas}__${selectedHari}` : "";
  const availableSlots: SlotInfo[] = mapKey ? (slotMap[mapKey] ?? []) : [];
  // Hanya tampilkan slot yang belum terkunci (yang sudah terkunci tidak perlu dikunci lagi)
  const freeSlots = availableSlots.filter((s) => !s.isLocked);
  const selectedSlotInfo = availableSlots.find((s) => s.slotWaktuId === selectedSlot);

  // Reset downstream saat upstream berubah
  function handleKelasChange(val: string) {
    setSelectedKelas(val);
    setSelectedHari("");
    setSelectedSlot("");
  }

  function handleHariChange(val: string) {
    setSelectedHari(val);
    setSelectedSlot("");
  }

  // Hari yang punya jadwal untuk kelas ini
  const availableHari = selectedKelas
    ? HARI_LIST.filter((h) => {
        const key = `${selectedKelas}__${h}`;
        return (slotMap[key]?.length ?? 0) > 0;
      })
    : [];

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Kelas */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Kelas <span className="text-red-500">*</span>
          </label>
          <select
            name="kelasId"
            value={selectedKelas}
            onChange={(e) => handleKelasChange(e.target.value)}
            required
            className="w-full rounded-md border border-zinc-300 px-2.5 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          >
            <option value="">— Pilih kelas —</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namaKelas}
              </option>
            ))}
          </select>
        </div>

        {/* Hari */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Hari <span className="text-red-500">*</span>
          </label>
          <select
            name="hari"
            value={selectedHari}
            onChange={(e) => handleHariChange(e.target.value)}
            required
            disabled={!selectedKelas}
            className="w-full rounded-md border border-zinc-300 px-2.5 py-2 text-sm focus:border-zinc-500 focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-400"
          >
            <option value="">— Pilih hari —</option>
            {availableHari.map((h) => (
              <option key={h} value={h}>
                {HARI_LABEL[h]}
              </option>
            ))}
          </select>
          {selectedKelas && availableHari.length === 0 && (
            <p className="mt-1 text-[11px] text-zinc-400">
              Belum ada jadwal untuk kelas ini.
            </p>
          )}
        </div>

        {/* JP / Slot */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Slot JP <span className="text-red-500">*</span>
          </label>
          <select
            name="slotWaktuId"
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            required
            disabled={!selectedHari || freeSlots.length === 0}
            className="w-full rounded-md border border-zinc-300 px-2.5 py-2 text-sm focus:border-zinc-500 focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-400"
          >
            <option value="">— Pilih JP —</option>
            {freeSlots.map((s) => (
              <option key={s.slotWaktuId} value={s.slotWaktuId}>
                {s.namaSlot} — {s.kodeMapel} ({s.namaGuru})
              </option>
            ))}
          </select>
          {selectedHari && freeSlots.length === 0 && availableSlots.length > 0 && (
            <p className="mt-1 text-[11px] text-amber-600">
              Semua slot hari ini sudah terkunci.
            </p>
          )}
        </div>
      </div>

      {/* Preview slot yang dipilih */}
      {selectedSlotInfo && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <p className="font-medium text-amber-900 mb-1">Preview constraint yang akan dikunci:</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-amber-800 sm:grid-cols-4">
            <div><span className="text-amber-500">Kelas</span><br />{kelasList.find((k) => k.id === selectedKelas)?.namaKelas}</div>
            <div><span className="text-amber-500">Hari</span><br />{HARI_LABEL[selectedHari as HariType]}</div>
            <div><span className="text-amber-500">JP</span><br />{selectedSlotInfo.namaSlot}</div>
            <div><span className="text-amber-500">Mapel / Guru</span><br />{selectedSlotInfo.namaMapel} · {selectedSlotInfo.namaGuru}</div>
          </div>
          <p className="mt-2 text-[11px] text-amber-600">
            Setelah dikunci, generator tidak akan mengubah slot ini berapa kali pun Generate dijalankan.
          </p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={pending || !selectedSlot}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Mengunci..." : "🔒 Kunci Slot Ini"}
        </button>
      </div>
    </form>
  );
}
