"use client";

import { Fragment, useState } from "react";

type KelasOpt = { id: string; namaKelas: string };
type GuruOpt  = { id: string; nama: string; kodeGuru: string; maksJp: number | null; totalJp: number };
type SelectedKelas = { guruId: string; jp: number };

type Props = {
  kelasList:   KelasOpt[];
  guruList:    GuruOpt[];
  existing:    Record<string, { guruId: string; jp: number }>;
  /** JP dari mapel ini per guru — dikurangkan dari totalJp saat cek, agar guru yg sudah ngajar mapel ini di kelas lain tidak salah dianggap penuh */
  jpDariMapelIni: Record<string, number>;
  periodeAktif: boolean;
};

function JpStepper({
  value,
  onChange,
  min = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center shrink-0">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-l-md border border-zinc-300 bg-white text-base font-medium text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 select-none"
      >
        −
      </button>
      <div className="flex h-8 w-9 items-center justify-center border-y border-zinc-300 bg-white text-sm font-semibold text-zinc-900 select-none tabular-nums">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-r-md border border-zinc-300 bg-white text-base font-medium text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 select-none"
      >
        +
      </button>
    </div>
  );
}

export default function PengampuFieldset({
  kelasList,
  guruList,
  existing,
  jpDariMapelIni,
  periodeAktif,
}: Props) {
  const isNew = Object.keys(existing).length === 0;

  const [selected, setSelected] = useState<Map<string, SelectedKelas>>(() => {
    if (isNew) {
      return new Map(kelasList.map((k) => [k.id, { guruId: "", jp: 2 }]));
    }
    return new Map(
      Object.entries(existing)
        .filter(([, v]) => v.guruId)
        .map(([kelasId, v]) => [kelasId, { guruId: v.guruId, jp: v.jp }])
    );
  });

  // "Isi semua" toolbar state
  const [fillGuruId, setFillGuruId] = useState("");
  const [fillJp, setFillJp] = useState(2);

  // ── JP realtime per guru dari pilihan di form ini ──────────────────────
  // Hitung berapa JP yang sedang dipilih di form ini per guru (belum disimpan)
  const jpDipilihDiForm = new Map<string, number>();
  for (const [, val] of selected) {
    if (!val.guruId) continue;
    jpDipilihDiForm.set(val.guruId, (jpDipilihDiForm.get(val.guruId) ?? 0) + val.jp);
  }

  /**
   * Hitung total JP efektif guru = JP dari DB (semua mapel)
   * dikurangi JP lama mapel ini di DB, ditambah JP baru yang dipilih di form.
   * Ini membuat cek "penuh" akurat secara realtime.
   */
  function jpEfektif(g: GuruOpt): number {
    const jpDiluar = g.totalJp - (jpDariMapelIni[g.id] ?? 0);
    const jpForm   = jpDipilihDiForm.get(g.id) ?? 0;
    return jpDiluar + jpForm;
  }

  function isGuruPenuh(g: GuruOpt, untukKelasId?: string): boolean {
    if (g.maksJp == null) return false;
    if (!untukKelasId) return jpEfektif(g) >= g.maksJp;
    // Saat cek untuk kelas tertentu: kurangi JP kelas itu sendiri dulu
    // supaya guru yang sudah dipilih di kelas ini tidak salah dianggap penuh
    const jpKelasIni = selected.get(untukKelasId)?.guruId === g.id
      ? (selected.get(untukKelasId)?.jp ?? 0)
      : 0;
    return jpEfektif(g) - jpKelasIni >= g.maksJp;
  }

  function toggleKelas(kelasId: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(kelasId)) {
        next.delete(kelasId);
      } else {
        const ex = existing[kelasId];
        next.set(kelasId, { guruId: ex?.guruId ?? "", jp: ex?.jp ?? 2 });
      }
      return next;
    });
  }

  function setGuru(kelasId: string, guruId: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      const cur  = next.get(kelasId);
      if (cur) next.set(kelasId, { ...cur, guruId });
      return next;
    });
  }

  function setJp(kelasId: string, jp: number) {
    setSelected((prev) => {
      const next = new Map(prev);
      const cur  = next.get(kelasId);
      if (cur) next.set(kelasId, { ...cur, jp });
      return next;
    });
  }

  function selectAll() {
    setSelected(
      new Map(
        kelasList.map((k) => {
          const ex = existing[k.id];
          return [k.id, { guruId: ex?.guruId ?? "", jp: ex?.jp ?? 2 }];
        })
      )
    );
  }

  function clearAll() {
    setSelected(new Map());
  }

  /**
   * Terapkan guru + JP ke SEMUA kelas yang sedang tercentang.
   * fillJp WAJIB ikut — ini yang diperbaiki.
   */
  function applyFillAll() {
    if (!fillGuruId) return;
    setSelected((prev) => {
      const next = new Map(prev);
      for (const [kelasId] of next) {
        next.set(kelasId, { guruId: fillGuruId, jp: fillJp });
      }
      return next;
    });
  }

  // ── derived stats ──────────────────────────────────────────────────────────
  // totalKelas = hanya kelas yang sudah ada gurunya (guruId terisi)
  const totalKelas  = Array.from(selected.values()).filter((v) => v.guruId).length;
  const kelasChecked = selected.size; // kelas yang dicentang (termasuk belum ada guru)
  const totalJp     = Array.from(selected.values()).reduce(
    (s, v) => s + (v.guruId ? v.jp : 0),
    0
  );

  // JP per guru (ringkasan bawah)
  const jpPerGuru = new Map<string, { nama: string; kode: string; jp: number; kelas: number }>();
  for (const [, val] of selected) {
    if (!val.guruId) continue;
    const g = guruList.find((g) => g.id === val.guruId);
    if (!g) continue;
    const prev = jpPerGuru.get(val.guruId);
    jpPerGuru.set(val.guruId, {
      nama:  g.nama,
      kode:  g.kodeGuru,
      jp:    (prev?.jp    ?? 0) + val.jp,
      kelas: (prev?.kelas ?? 0) + 1,
    });
  }

  return (
    <div className="space-y-4 border-t border-zinc-200 pt-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Guru Pengampu per Kelas</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Centang kelas yang diajar mapel ini, lalu pilih guru dan atur JP/minggu.
          </p>
        </div>
        {totalKelas > 0 && (
          <div className="shrink-0 rounded-md bg-zinc-100 px-3 py-1.5 text-right text-xs text-zinc-600">
            <p className="font-semibold text-zinc-800">{totalKelas} kelas · {totalJp} JP total</p>
            {kelasChecked > totalKelas && (
              <p className="text-zinc-400">{kelasChecked - totalKelas} kelas belum ada guru</p>
            )}
          </div>
        )}
      </div>

      {!periodeAktif ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Belum ada Periode Akademik aktif. Isi Identitas Sekolah dulu.
        </div>
      ) : guruList.length === 0 ? (
        <p className="text-sm text-zinc-400">Belum ada data guru.</p>
      ) : kelasList.length === 0 ? (
        <p className="text-sm text-zinc-400">Belum ada data kelas.</p>
      ) : (
        <>
          {/* ── Toolbar ── */}
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 space-y-2">

            {/* Baris 1: pilih/hapus semua */}
            <div className="flex items-center gap-3 text-xs">
              <button type="button" onClick={selectAll}
                className="text-zinc-500 hover:text-zinc-800 hover:underline">
                Pilih semua kelas
              </button>
              <span className="text-zinc-300">·</span>
              <button type="button" onClick={clearAll}
                className="text-zinc-500 hover:text-zinc-800 hover:underline">
                Hapus semua
              </button>
            </div>

            {/* Baris 2: isi semua sekaligus — hanya tampil kalau ada kelas tercentang */}
            {kelasChecked > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-2">
                <span className="text-xs text-zinc-500 whitespace-nowrap">
                  Isi semua {kelasChecked} kelas:
                </span>

                {/* Pilih guru */}
                <select
                  value={fillGuruId}
                  onChange={(e) => setFillGuruId(e.target.value)}
                  className="flex-1 min-w-[160px] rounded border border-zinc-300 px-2 py-1 text-xs focus:border-zinc-500 focus:outline-none"
                >
                  <option value="">— pilih guru —</option>
                  {guruList.map((g) => {
                    const penuh = isGuruPenuh(g);
                    const ef    = jpEfektif(g);
                    return (
                      <option key={g.id} value={g.id} disabled={penuh}>
                        {g.nama} ({g.kodeGuru}){penuh ? " — JP penuh" : g.maksJp != null ? ` — ${ef}/${g.maksJp} JP` : ""}
                      </option>
                    );
                  })}
                </select>

                {/* Stepper JP — ini yang menentukan JP saat Terapkan */}
                <div className="flex items-center gap-1.5">
                  <JpStepper value={fillJp} onChange={setFillJp} />
                  <span className="text-xs text-zinc-500">JP/mgg</span>
                </div>

                {/* Tombol Terapkan */}
                <button
                  type="button"
                  onClick={applyFillAll}
                  disabled={!fillGuruId}
                  className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Terapkan ke semua
                </button>

                {/* Preview apa yang akan diterapkan */}
                {fillGuruId && (
                  <span className="text-[11px] text-zinc-400">
                    → {guruList.find((g) => g.id === fillGuruId)?.kodeGuru}, {fillJp} JP × {kelasChecked} kelas = {fillJp * kelasChecked} JP total
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Daftar kelas ── */}
          <div className="space-y-2">
            {kelasList.map((k) => {
              const isChecked = selected.has(k.id);
              const cur       = selected.get(k.id);
              return (
                <div
                  key={k.id}
                  className={`rounded-lg border transition-colors ${
                    isChecked ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"
                  }`}
                >
                  {/* Checkbox row */}
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleKelas(k.id)}
                      className="shrink-0 h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                    />
                    <span className="font-medium text-sm text-zinc-900 w-20">
                      {k.namaKelas}
                    </span>
                    {isChecked && cur?.guruId && (
                      <span className="ml-auto text-xs text-zinc-400">
                        {guruList.find((g) => g.id === cur.guruId)?.kodeGuru ?? ""}
                        {" · "}{cur.jp} JP/mgg
                      </span>
                    )}
                    {isChecked && !cur?.guruId && (
                      <span className="ml-auto text-xs text-amber-500">Belum ada guru</span>
                    )}
                  </label>

                  {/* Expanded row: guru + JP stepper per kelas */}
                  {isChecked && (
                    <div className="flex items-center gap-3 border-t border-zinc-100 px-4 py-3">
                      <select
                        value={cur?.guruId ?? ""}
                        onChange={(e) => setGuru(k.id, e.target.value)}
                        className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                      >
                        <option value="">— Pilih guru —</option>
                        {guruList.map((g) => {
                          const penuh = isGuruPenuh(g, k.id);
                          const ef    = jpEfektif(g);
                          const isCurrentlySelected = cur?.guruId === g.id;
                          return (
                            <option key={g.id} value={g.id} disabled={penuh && !isCurrentlySelected}>
                              {g.nama} ({g.kodeGuru}){penuh && !isCurrentlySelected ? " — JP penuh" : g.maksJp != null ? ` — ${ef}/${g.maksJp} JP` : ""}
                            </option>
                          );
                        })}
                      </select>
                      <div className="flex items-center gap-2 shrink-0">
                        <JpStepper
                          value={cur?.jp ?? 2}
                          onChange={(v) => setJp(k.id, v)}
                        />
                        <span className="text-xs text-zinc-400 whitespace-nowrap">JP/mgg</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Ringkasan JP per guru (bawah) ── */}
          {jpPerGuru.size > 0 && (
            <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-blue-800">Ringkasan JP dari mapel ini</p>
              {Array.from(jpPerGuru.values()).map((g) => (
                <div key={g.kode} className="flex items-center gap-2 text-xs text-blue-700">
                  <span className="font-mono font-semibold w-10">{g.kode}</span>
                  <span className="flex-1 truncate">{g.nama}</span>
                  <span className="whitespace-nowrap text-blue-500">{g.kelas} kelas</span>
                  <span className="font-semibold w-12 text-right">{g.jp} JP</span>
                </div>
              ))}
              <p className="text-[10px] text-blue-400 mt-1 pt-1 border-t border-blue-100">
                JP di atas hanya dari mapel ini — belum termasuk mapel lain yang diampu guru yang sama.
              </p>
            </div>
          )}
        </>
      )}

      {/* Hidden inputs untuk server action */}
      {Array.from(selected.entries()).map(([kelasId, val]) => (
        <Fragment key={kelasId}>
          <input type="hidden" name="pengampuKelasId" value={kelasId} />
          <input type="hidden" name="pengampuGuruId"  value={val.guruId} />
          <input type="hidden" name="pengampuJp"      value={val.jp} />
        </Fragment>
      ))}
    </div>
  );
}
