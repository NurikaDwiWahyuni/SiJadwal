"use client";

import { useTransition, useState } from "react";
import { setSlotTerkunci, clearSlotTerkunci } from "./actions";

type LockInfo = {
  id: string;
  label: string | null;
  mapelId: string | null;
  ekstrakurikulerId: string | null;
} | null;

type Props = {
  kelasId?: string;          // undefined = mode "Semua Kelas" (global)
  hari: string;
  slotWaktuId: string;
  namaSlot: string;
  jenisSlot: string;         // "PELAJARAN" | "NON_PELAJARAN"
  current: LockInfo;
  globalLock: LockInfo;      // null kalau bukan mode per-kelas
  mapelOptions: { id: string; kodeMapel: string; namaMapel: string }[];
  ekskulOptions: { id: string; nama: string }[];
};

/**
 * Nilai di <select>:
 *   ""             → tidak terkunci (bebas)
 *   "blocked"      → dikunci untuk acara tertentu (Upacara, Sholat Jumat, dll)
 *   "mapel:<id>"   → dikunci ke mapel tertentu
 *   "ekskul:<id>"  → dikunci ke ekstrakurikuler tertentu
 */
function lockValue(lock: LockInfo): string {
  if (!lock) return "";
  if (!lock.mapelId && !lock.ekstrakurikulerId) return "blocked";
  if (lock.mapelId) return `mapel:${lock.mapelId}`;
  if (lock.ekstrakurikulerId) return `ekskul:${lock.ekstrakurikulerId}`;
  return "";
}

export default function SlotCell({
  kelasId,
  hari,
  slotWaktuId,
  namaSlot,
  jenisSlot,
  current,
  globalLock,
  mapelOptions,
  ekskulOptions,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [localLabel, setLocalLabel] = useState(current?.label ?? "");
  const [labelError, setLabelError] = useState("");
  const [localValue, setLocalValue] = useState(lockValue(current));

  // ── Slot NON_PELAJARAN (Istirahat, dll) selalu terkunci sistem ─────────────
  if (jenisSlot === "NON_PELAJARAN") {
    return (
      <div className="w-40 shrink-0 rounded-md border border-zinc-200 bg-zinc-100 p-2 text-xs">
        <p className="font-medium text-zinc-600">{namaSlot}</p>
        <p className="mt-0.5 text-[10px] text-zinc-400">Non-pelajaran (sistem)</p>
      </div>
    );
  }

  // ── Slot dikunci global (dari mode "Semua Kelas") ──────────────────────────
  if (globalLock) {
    const glLabel = globalLock.label;
    const glDisplay = !globalLock.mapelId && !globalLock.ekstrakurikulerId
      ? (glLabel ? `🚫 ${glLabel}` : "🚫 Diblokir global")
      : "🔒 Terkunci global";

    return (
      <div className="w-40 shrink-0 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">
        <p className="mb-1 font-medium text-zinc-700">{namaSlot}</p>
        <p className="text-amber-700 font-medium">{glDisplay}</p>
        <p className="mt-0.5 text-[10px] text-amber-500">Dikelola di &quot;Semua Kelas&quot;</p>
      </div>
    );
  }

  const value = localValue;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setLocalValue(val);
    setLabelError("");

    // Jika pindah dari blocked ke lain, kosongkan label lokal
    if (val !== "blocked") {
      setLocalLabel("");
    }

    // Untuk mapel/ekskul, langsung simpan. Untuk blocked, tunggu user isi label.
    if (!val) {
      startTransition(async () => {
        if (current) await clearSlotTerkunci(current.id);
      });
      return;
    }

    if (val === "blocked") {
      // Tidak langsung simpan — tunggu user isi label lalu tekan Simpan
      return;
    }

    const [type, refId] = val.split(":");
    startTransition(async () => {
      try {
        await setSlotTerkunci({
          id: current?.id,
          kelasId,
          hari,
          slotWaktuId,
          type: type as "mapel" | "ekskul",
          refId,
        });
      } catch {
        // reset ke nilai sebelumnya jika gagal
        setLocalValue(lockValue(current));
      }
    });
  }

  function handleSaveBlocked() {
    if (!localLabel.trim()) {
      setLabelError("Nama acara wajib diisi");
      return;
    }
    setLabelError("");
    startTransition(async () => {
      try {
        await setSlotTerkunci({
          id: current?.id,
          kelasId,
          hari,
          slotWaktuId,
          type: "blocked",
          label: localLabel.trim(),
        });
      } catch {
        setLocalValue(lockValue(current));
      }
    });
  }

  // Warna border berdasarkan status
  let borderClass = "border-zinc-200 bg-white";
  if (value === "blocked") borderClass = "border-red-300 bg-red-50";
  else if (value) borderClass = "border-blue-200 bg-blue-50";

  // Label status di bawah
  let statusLabel = "";
  if (value === "blocked") {
    statusLabel = current?.label ? `🚫 ${current.label}` : "🚫 Diblokir";
  } else if (value.startsWith("mapel:")) {
    const m = mapelOptions.find((x) => `mapel:${x.id}` === value);
    statusLabel = m ? `📘 ${m.kodeMapel} – ${m.namaMapel}` : "📘 Mapel terkunci";
  } else if (value.startsWith("ekskul:")) {
    const e = ekskulOptions.find((x) => `ekskul:${x.id}` === value);
    statusLabel = e ? `🏃 ${e.nama}` : "🏃 Ekskul terkunci";
  }

  return (
    <div className={`w-40 shrink-0 rounded-md border p-2 text-xs ${borderClass} transition-colors`}>
      <p className="mb-1 font-medium text-zinc-700">{namaSlot}</p>

      <select
        value={value}
        onChange={handleChange}
        disabled={isPending}
        className="w-full rounded border border-zinc-300 bg-white px-1 py-1 text-xs focus:border-zinc-500 focus:outline-none disabled:opacity-50"
      >
        <option value="">— Bebas —</option>
        <option value="blocked">🚫 Blokir (Upacara/Ekskul/dll)</option>
        {mapelOptions.length > 0 && (
          <optgroup label="📘 Mapel">
            {mapelOptions.map((m) => (
              <option key={m.id} value={`mapel:${m.id}`}>
                {m.kodeMapel}
              </option>
            ))}
          </optgroup>
        )}
        {ekskulOptions.length > 0 && (
          <optgroup label="🏃 Ekstrakurikuler">
            {ekskulOptions.map((e) => (
              <option key={e.id} value={`ekskul:${e.id}`}>
                {e.nama}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* ── Input label untuk tipe blocked ── */}
      {value === "blocked" && (
        <div className="mt-1.5 space-y-1">
          <input
            type="text"
            placeholder="Nama acara, mis. Upacara"
            value={localLabel}
            onChange={(e) => {
              setLocalLabel(e.target.value);
              if (e.target.value.trim()) setLabelError("");
            }}
            disabled={isPending}
            maxLength={60}
            className={`w-full rounded border px-1.5 py-1 text-xs focus:outline-none disabled:opacity-50 ${
              labelError
                ? "border-red-400 bg-red-50 focus:border-red-500"
                : "border-zinc-300 bg-white focus:border-zinc-500"
            }`}
          />
          {labelError && (
            <p className="text-[10px] text-red-500">{labelError}</p>
          )}
          <button
            onClick={handleSaveBlocked}
            disabled={isPending || !localLabel.trim()}
            className="w-full rounded bg-red-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Menyimpan..." : "Kunci Slot"}
          </button>
        </div>
      )}

      {/* ── Status label ── */}
      {!isPending && statusLabel && value !== "blocked" && (
        <p className="mt-1 text-[10px] text-zinc-500 truncate" title={statusLabel}>
          {statusLabel}
        </p>
      )}
      {isPending && value !== "blocked" && (
        <p className="mt-1 text-[10px] text-zinc-400">Menyimpan...</p>
      )}

      {/* Label tersimpan untuk blocked yang sudah disimpan */}
      {value === "blocked" && current?.label && !isPending && (
        <p className="mt-1 text-[10px] text-red-600 font-medium truncate" title={current.label}>
          Tersimpan: {current.label}
        </p>
      )}
    </div>
  );
}
