"use client";

import { useActionState, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
// SegmenInput diimpor dari slotUtils (bukan dari actions — file "use server" tidak boleh ekspor type)
import { generateSlotOtomatis, type GenerateSlotState } from "./actions";
import { buildDailySlots, slotsToSegmen, type SlotWaktuSimpan, type SegmenInput } from "@/lib/slotUtils";
import { HARI_LIST, HARI_LABEL } from "@/lib/constants";

const TEMPLATE_NON_PELAJARAN = [
  { nama: "Upacara",                  menit: 60 },
  { nama: "Senam",                    menit: 30 },
  { nama: "Gerakan Literasi Sekolah", menit: 15 },
  { nama: "Keagamaan",                menit: 30 },
  { nama: "Istirahat",                menit: 15 },
];

let idCounter = Date.now();
function newId() { return ++idCounter; }

function defaultSegmen(): SegmenInput[] {
  return [
    { id: newId(), nama: "JP",        jenis: "PELAJARAN",     menit: 3 },
    { id: newId(), nama: "Istirahat", jenis: "NON_PELAJARAN", menit: 15 },
    { id: newId(), nama: "JP",        jenis: "PELAJARAN",     menit: 3 },
  ];
}

type Props = {
  slotsByHari: Record<string, SlotWaktuSimpan[]>;
  hariAktif:   string;
};

export default function SlotGeneratorForm({ slotsByHari, hariAktif }: Props) {
  const router  = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<GenerateSlotState, FormData>(
    generateSlotOtomatis,
    {}
  );

  const [forceReset, setForceReset] = useState(false);

  const init = useMemo(() => {
    const saved = slotsByHari[hariAktif];
    return saved?.length ? slotsToSegmen(saved) : { segmen: defaultSegmen(), jamMulai: "07:00", menitPerJP: 40 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount saja — hariAktif berubah via router → remount (key di page.tsx)

  const [jamMulai,   setJamMulai]   = useState(init.jamMulai);
  const [menitPerJP, setMenitPerJP] = useState(init.menitPerJP);
  const [segmen,     setSegmen]     = useState<SegmenInput[]>(init.segmen);
  const [showNonJpPicker,  setShowNonJpPicker]  = useState(false);
  const [customNonJpNama,  setCustomNonJpNama]  = useState("");
  const [customNonJpMenit, setCustomNonJpMenit] = useState(15);

  const preview = useMemo(
    () => buildDailySlots(segmen, jamMulai, menitPerJP),
    [segmen, jamMulai, menitPerJP]
  );

  const totalMenitHari = useMemo(() => {
    if (preview.length === 0) return 0;
    const [h1, m1] = preview[0].jamMulai.split(":").map(Number);
    const [h2, m2] = preview[preview.length - 1].jamSelesai.split(":").map(Number);
    return h2 * 60 + m2 - (h1 * 60 + m1);
  }, [preview]);

  const hasSavedSlots = (slotsByHari[hariAktif]?.length ?? 0) > 0;

  function handleConfirmReset() {
    setForceReset(true);
    setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  function addNonJpFromPicker(nama: string, menit: number) {
    setSegmen((p) => [...p, { id: newId(), nama, jenis: "NON_PELAJARAN", menit }]);
    setShowNonJpPicker(false);
    setCustomNonJpNama(""); setCustomNonJpMenit(15);
  }
  function removeSegmen(id: number)                             { setSegmen((p) => p.filter((s) => s.id !== id)); }
  function updateSegmen(id: number, patch: Partial<SegmenInput>) { setSegmen((p) => p.map((s) => s.id === id ? { ...s, ...patch } : s)); }
  function moveSegmen(idx: number, dir: -1 | 1) {
    setSegmen((p) => {
      const a = [...p]; const t = idx + dir;
      if (t < 0 || t >= a.length) return a;
      [a[idx], a[t]] = [a[t], a[idx]]; return a;
    });
  }

  return (
    <>
      {/* Dialog konfirmasi */}
      {state.needsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4 mx-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <p className="text-base font-bold text-zinc-900">Slot hari ini sudah pernah digenerate</p>
                <p className="text-sm text-zinc-600 mt-1">
                  Ada <strong>{state.jadwalCount} jadwal</strong> dari slot lama hari{" "}
                  <strong>{HARI_LABEL[hariAktif as keyof typeof HARI_LABEL]}</strong> ini.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
              <p className="font-semibold">Jika dilanjutkan:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                <li>{state.jadwalCount} hasil generate sebelumnya akan dihapus</li>
                <li>Slot lama hari ini diganti seluruhnya</li>
                <li>Nomor JP direset dari awal (JP 1, 2, 3…)</li>
                <li>Perlu generate jadwal ulang setelahnya</li>
              </ul>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => router.refresh()}
                className="flex-1 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors">
                Batal
              </button>
              <button type="button" onClick={handleConfirmReset} disabled={pending}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                {pending ? "Menghapus…" : "🗑️ Hapus & Generate Ulang"}
              </button>
            </div>
          </div>
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-6">
        {state.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{state.error}</div>
        )}
        {state.success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">✓ {state.success}</div>
        )}

        <input type="hidden" name="hari"         value={hariAktif} />
        <input type="hidden" name="jamMulai"     value={jamMulai} />
        <input type="hidden" name="menitPerJP"   value={menitPerJP} />
        <input type="hidden" name="segmenJson"   value={JSON.stringify(segmen)} />
        <input type="hidden" name="previewCount" value={preview.length} />
        <input type="hidden" name="forceReset"   value={forceReset ? "true" : "false"} />

        {/* Konfigurasi dasar */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <p className="text-sm font-semibold text-zinc-800">⚙️ Pengaturan Dasar</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Hari</label>
              <select value={hariAktif} onChange={(e) => router.push(`?hari=${e.target.value}`)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-zinc-500">
                {HARI_LIST.map((h) => (
                  <option key={h} value={h}>
                    {HARI_LABEL[h]}{(slotsByHari[h]?.length ?? 0) > 0 ? " ✓" : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-zinc-400">
                {hasSavedSlots ? "✓ Menampilkan konfigurasi tersimpan" : "Belum ada slot — default"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Jam Masuk Sekolah</label>
              <input type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-zinc-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Durasi 1 JP (menit)</label>
              <input type="number" min={10} max={120} value={menitPerJP}
                onChange={(e) => setMenitPerJP(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-zinc-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Builder segmen */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-800">
                📋 Susunan Jadwal — {HARI_LABEL[hariAktif as keyof typeof HARI_LABEL]}
              </p>
              {hasSavedSlots && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">dari DB</span>
              )}
            </div>

            <div className="space-y-2">
              {segmen.map((s, idx) => (
                <div key={s.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  s.jenis === "PELAJARAN" ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50"
                }`}>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button type="button" onClick={() => moveSegmen(idx, -1)} disabled={idx === 0}
                      className="text-zinc-400 hover:text-zinc-700 disabled:opacity-20 text-xs leading-none">▲</button>
                    <button type="button" onClick={() => moveSegmen(idx, 1)} disabled={idx === segmen.length - 1}
                      className="text-zinc-400 hover:text-zinc-700 disabled:opacity-20 text-xs leading-none">▼</button>
                  </div>

                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.jenis === "PELAJARAN" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {s.jenis === "PELAJARAN" ? "JP" : "Non-JP"}
                  </span>

                  {s.jenis === "NON_PELAJARAN" ? (
                    <div className="flex-1 min-w-0">
                      <input type="text" value={s.nama} placeholder="Nama kegiatan"
                        onChange={(e) => updateSegmen(s.id, { nama: e.target.value })}
                        className="w-full rounded border border-transparent bg-transparent text-sm text-zinc-800 focus:outline-none focus:border-zinc-300 focus:bg-white px-1" />
                      <div className="flex flex-wrap gap-1 mt-1">
                        {TEMPLATE_NON_PELAJARAN.map((t) => (
                          <button key={t.nama} type="button"
                            onClick={() => updateSegmen(s.id, { nama: t.nama, menit: t.menit })}
                            className="rounded-full border border-amber-200 bg-white px-1.5 py-0.5 text-xs text-amber-700 hover:bg-amber-100">
                            {t.nama} · {t.menit}m
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="flex-1 text-sm text-blue-700 font-medium">Jam Pelajaran</span>
                  )}

                  <div className="shrink-0 flex items-center gap-1">
                    <input type="number" min={1} max={s.jenis === "PELAJARAN" ? 12 : 240} value={s.menit}
                      onChange={(e) => updateSegmen(s.id, { menit: Number(e.target.value) })}
                      className="w-14 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-center text-sm focus:outline-none" />
                    <span className="text-xs text-zinc-400">{s.jenis === "PELAJARAN" ? "JP" : "mnt"}</span>
                  </div>

                  <button type="button" onClick={() => removeSegmen(s.id)}
                    className="shrink-0 text-zinc-300 hover:text-red-500 text-lg leading-none">×</button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1 relative">
              <button type="button"
                onClick={() => setSegmen((p) => [...p, { id: newId(), nama: "JP", jenis: "PELAJARAN", menit: 2 }])}
                className="flex-1 rounded-lg border-2 border-dashed border-blue-200 py-1.5 text-xs font-medium text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                + Tambah Jam Pelajaran
              </button>

              <div className="flex-1 relative">
                <button type="button" onClick={() => setShowNonJpPicker((v) => !v)}
                  className="w-full rounded-lg border-2 border-dashed border-amber-200 py-1.5 text-xs font-medium text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-colors">
                  + Tambah Kegiatan Non-JP ▾
                </button>

                {showNonJpPicker && (
                  <div className="absolute bottom-full mb-1 left-0 right-0 z-50 rounded-xl border border-amber-200 bg-white shadow-lg p-3 space-y-3">
                    <p className="text-xs font-semibold text-zinc-600">Pilih atau ketik kegiatan:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_NON_PELAJARAN.map((t) => (
                        <button key={t.nama} type="button" onClick={() => addNonJpFromPicker(t.nama, t.menit)}
                          className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 hover:bg-amber-100 hover:border-amber-400">
                          {t.nama} <span className="text-amber-400">{t.menit}m</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-zinc-100 pt-2 space-y-1.5">
                      <p className="text-[10px] text-zinc-400">Atau ketik kegiatan sendiri:</p>
                      <div className="flex gap-2">
                        <input type="text" value={customNonJpNama} placeholder="Nama kegiatan..."
                          onChange={(e) => setCustomNonJpNama(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && customNonJpNama.trim()) { e.preventDefault(); addNonJpFromPicker(customNonJpNama.trim(), customNonJpMenit); }}}
                          className="flex-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400" />
                        <input type="number" min={1} max={240} value={customNonJpMenit}
                          onChange={(e) => setCustomNonJpMenit(Number(e.target.value))}
                          className="w-16 rounded-lg border border-zinc-300 px-2 py-1.5 text-center text-xs focus:outline-none focus:border-amber-400" />
                        <span className="self-center text-xs text-zinc-400">mnt</span>
                        <button type="button" disabled={!customNonJpNama.trim()}
                          onClick={() => { if (customNonJpNama.trim()) addNonJpFromPicker(customNonJpNama.trim(), customNonJpMenit); }}
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-40">
                          Tambah
                        </button>
                      </div>
                    </div>
                    <button type="button" onClick={() => setShowNonJpPicker(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-600 w-full text-right">Tutup ×</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
            <p className="text-sm font-semibold text-zinc-800">
              👁️ Preview — {HARI_LABEL[hariAktif as keyof typeof HARI_LABEL]}
            </p>
            <p className="text-xs text-zinc-400">
              {preview.filter((r) => r.isJP).length} JP · {preview.filter((r) => !r.isJP).length} non-JP
              {preview.length > 0 && (
                <> · selesai <strong>{preview[preview.length - 1].jamSelesai}</strong>{" "}
                ({Math.floor(totalMenitHari / 60)}j {totalMenitHari % 60}m)</>
              )}
            </p>
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {preview.map((row, i) => (
                <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
                  row.isJP ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-800"
                }`}>
                  <span className="font-medium">{row.label}</span>
                  <span className="text-xs tabular-nums">{row.jamMulai} – {row.jamSelesai}</span>
                </div>
              ))}
              {preview.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-4">Tambahkan segmen untuk melihat preview</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending || segmen.length === 0}
            className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 transition-colors">
            {pending ? "Menyimpan…" : `Simpan Slot Waktu — ${HARI_LABEL[hariAktif as keyof typeof HARI_LABEL]} (${preview.length} slot)`}
          </button>
          <p className="text-xs text-zinc-400">
            Jika ada jadwal lama, sistem akan minta konfirmasi sebelum menghapus.
          </p>
        </div>
      </form>
    </>
  );
}
