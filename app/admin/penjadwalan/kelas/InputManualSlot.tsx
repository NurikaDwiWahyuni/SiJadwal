"use client";

import { useActionState, useState } from "react";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";
import { inputManualJadwal, type InputManualState } from "./actions";

type BebanKosong = {
  id: string;
  jp: number;
  terjadwal: number;
  guru: { nama: string; kodeGuru: string };
  mapel: { namaMapel: string; kodeMapel: string };
};

type SlotPelajaran = {
  id: string;
  namaSlot: string;
  hari: string;
  urutan: number;
  jamMulai: string | null;
};

type JadwalAda = {
  hari: string;
  slotWaktuId: string;
  bebanMengajarId: string;
};

type Props = {
  periodeId: string;
  kelasId: string;
  namaKelas: string;
  bebanKosong: BebanKosong[];   // beban yang JP-nya belum penuh
  slotPelajaran: SlotPelajaran[]; // semua slot PELAJARAN kelas ini
  jadwalAda: JadwalAda[];        // jadwal yang sudah ada (untuk disable slot)
};

export default function InputManualSlot({
  periodeId, kelasId, namaKelas, bebanKosong, slotPelajaran, jadwalAda,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedBebanId, setSelectedBebanId] = useState<string>("");
  const [selectedHari, setSelectedHari]       = useState<string>("");

  const [state, formAction, pending] = useActionState<InputManualState, FormData>(
    inputManualJadwal,
    {},
  );

  if (bebanKosong.length === 0) return null;

  const selectedBeban = bebanKosong.find(b => b.id === selectedBebanId);

  // Slot yang sudah dipakai kelas ini (semua mapel) di hari yang dipilih
  const slotTerpakai = new Set(
    jadwalAda
      .filter(j => j.hari === selectedHari)
      .map(j => j.slotWaktuId)
  );

  // Hari yang sudah punya jadwal mapel ini (untuk block same-day)
  const hariSudahAdaMapelIni = new Set(
    jadwalAda
      .filter(j => j.bebanMengajarId === selectedBebanId)
      .map(j => j.hari)
  );

  // JP mapel ini yang sudah ada di hari yang dipilih (untuk validasi berurutan)
  const jpMapelDiHariIni = slotPelajaran.filter(
    s => s.hari === selectedHari &&
    jadwalAda.some(j => j.bebanMengajarId === selectedBebanId && j.slotWaktuId === s.id)
  );
  const urutanAda = jpMapelDiHariIni.map(s => s.urutan).sort((a, b) => a - b);
  const minUrutan = urutanAda[0];
  const maxUrutan = urutanAda[urutanAda.length - 1];

  // Slot tersedia: kosong + berurutan dengan blok yang ada (jika ada)
  const slotTersedia = slotPelajaran
    .filter(s => {
      if (s.hari !== selectedHari) return false;
      if (slotTerpakai.has(s.id)) return false;
      // Kalau sudah ada JP mapel ini di hari ini → harus berurutan langsung
      if (urutanAda.length > 0) {
        return s.urutan === minUrutan - 1 || s.urutan === maxUrutan + 1;
      }
      return true;
    });

  const infoSameDayBlok = urutanAda.length > 0
    ? `JP ${selectedBeban?.mapel.namaMapel} sudah ada di urutan ${minUrutan}–${maxUrutan}. Slot baru harus langsung berurutan.`
    : null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
      >
        <span>{open ? "▲" : "▼"}</span>
        Input Manual Jadwal Kosong — {namaKelas}
        <span className="ml-1 rounded-full bg-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
          {bebanKosong.reduce((s, b) => s + (b.jp - b.terjadwal), 0)} JP sisa
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-blue-200 bg-white p-4 space-y-4 shadow-sm">
          <p className="text-xs text-zinc-500">
            Input di sini untuk JP yang gagal digenerate otomatis.{" "}
            <span className="font-semibold text-red-600">
              1 mapel tidak boleh muncul 2× di hari yang sama.
            </span>{" "}
            Slot yang diinput manual otomatis terkunci 🔒.
          </p>

          {/* Daftar beban kosong */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Pilih Mapel yang Belum Penuh
            </p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {bebanKosong.map(b => {
                const sisa = b.jp - b.terjadwal;
                const isSelected = selectedBebanId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setSelectedBebanId(b.id); setSelectedHari(""); }}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? "border-blue-400 bg-blue-50 text-blue-900"
                        : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <span>
                      <span className="font-medium">{b.mapel.namaMapel}</span>
                      <span className="ml-1.5 text-xs text-zinc-400">[{b.guru.kodeGuru}]</span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      isSelected ? "bg-blue-200 text-blue-800" : "bg-red-100 text-red-700"
                    }`}>
                      {b.terjadwal}/{b.jp} JP · sisa {sisa}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedBeban && (
            <>
              {/* Pilih hari */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Pilih Hari
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {HARI_LIST.map(hari => {
                    const sudahAda = hariSudahAdaMapelIni.has(hari);
                    const isSelected = selectedHari === hari;
                    return (
                      <button
                        key={hari}
                        type="button"
                        disabled={sudahAda}
                        onClick={() => setSelectedHari(hari)}
                        title={sudahAda ? `${selectedBeban.mapel.namaMapel} sudah ada di ${HARI_LABEL[hari]}` : ""}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          sudahAda
                            ? "cursor-not-allowed border border-red-100 bg-red-50 text-red-300 line-through"
                            : isSelected
                            ? "bg-zinc-900 text-white"
                            : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        {HARI_LABEL[hari]}
                        {sudahAda && <span className="ml-1 text-[9px]">✗</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedHari && slotTersedia.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                {infoSameDayBlok
                    ? `Tidak ada slot yang berurutan langsung dengan blok yang ada.`
                      : `Tidak ada slot kosong di hari ini untuk kelas ini.`
                  }
                </p>
              )}
              {infoSameDayBlok && slotTersedia.length > 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠ {infoSameDayBlok}</p>
              )}
              </div>

              {/* Pilih slot */}
              {selectedHari && slotTersedia.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Pilih Slot Jam
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {slotTersedia.map(slot => (
                      <form key={slot.id} action={formAction}>
                        <input type="hidden" name="periodeId"   value={periodeId} />
                        <input type="hidden" name="bebanId"     value={selectedBebanId} />
                        <input type="hidden" name="kelasId"     value={kelasId} />
                        <input type="hidden" name="slotWaktuId" value={slot.id} />
                        <input type="hidden" name="hari"        value={selectedHari} />
                        <button
                          type="submit"
                          disabled={pending}
                          className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100 hover:border-green-400 disabled:opacity-50 transition-colors"
                        >
                          {slot.namaSlot}
                          {slot.jamMulai && (
                            <span className="ml-1 text-[10px] text-green-600">{slot.jamMulai}</span>
                          )}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Feedback */}
          {state.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              ✗ {state.error}
            </div>
          )}
          {state.success && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              {state.success}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
