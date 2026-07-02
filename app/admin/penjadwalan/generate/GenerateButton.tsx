"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  runPhaseAdmin, runPhaseAutofix, runPhaseRescue, runPhaseEmergency, runPhaseLns, runPhaseConsent,
  type GenerateActionState,
} from "./actions";
import {
  APPROVAL_OPTION_LABEL,
  type GenerateResult, type GuruStat, type ApprovalCase, type ApprovalDecision, type ApprovalOptionKind,
} from "./types";

const EMPTY: GenerateActionState = {};

export default function GenerateButton({ lockedCount }: { lockedCount: number }) {
  const [s1, action1, p1] = useActionState(runPhaseAdmin, EMPTY);
  const [s2, action2, p2] = useActionState(runPhaseAutofix, EMPTY);
  const [s3, action3, p3] = useActionState(runPhaseRescue, EMPTY);
  const [s3b, action3b, p3b] = useActionState(runPhaseEmergency, EMPTY);
  const [s4, action4, p4] = useActionState(runPhaseLns, EMPTY);
  const [s5, setS5] = useState<GenerateActionState>(EMPTY);
  const [p5, startP5] = useTransition();

  const pending = p1 || p2 || p3 || p3b || p4 || p5;

  function submitApproval(decisions: ApprovalDecision[]) {
    startP5(async () => {
      const result = await runPhaseConsent(s5, decisions);
      setS5(result);
    });
  }

  // ── Tentukan hasil final yang sedang ditampilkan ──
  // Urutan prioritas: Phase 6 (Consent) > Phase 5 (LNS) > Phase 4 (Emergency) > Phase 3 (Rescue) > Phase 2 (Autofix) > Phase 1 (Admin)
  const lastResult: GenerateResult | undefined = s5.result ?? s4.result ?? s3b.result ?? s3.result ?? s2.result ?? s1.result;
  const gagalNow = lastResult?.gagal ?? [];
  const selesai  = lastResult != null && gagalNow.length === 0;

  const gagalFase1 = s1.result?.gagal.length ?? 0;
  const fase2Done  = s2.result != null || !!s2.error;
  const fase3Done  = s3.result != null || !!s3.error;
  const fase3bDone = s3b.result != null || !!s3b.error;
  const fase4Done  = s4.result != null || !!s4.error;

  const tampilFase2 = s1.result && gagalFase1 > 0;
  const tampilFase3 = fase2Done && (s2.result?.gagal.length ?? 0) > 0;
  const tampilFase3b = fase3Done && (s3.result?.gagal.length ?? 0) > 0;
  const tampilFase4 = fase3bDone && (s3b.result?.gagal.length ?? 0) > 0;
  const tampilConsent = fase4Done && (s4.result?.gagal.length ?? 0) > 0;

  // Gabungan daftar bottleneck dari hasil terakhir yang tersedia
  const bottleneckIds = lastResult?.bottleneckGuruIds ?? [];
  const guruStats = lastResult?.guruStats ?? [];
  const approvalCases = (s5.result?.approvalCases ?? s4.result?.approvalCases) ?? [];

  return (
    <div className="space-y-4">

      {/* ── Peringatan slot terkunci ── */}
      {lockedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-lg shrink-0">🔒</span>
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{lockedCount} slot terkunci</span> akan dipertahankan
            dan tidak akan ditimpa oleh proses generate.{" "}
            <Link href="/admin/penjadwalan/kelas" className="underline font-medium">
              Kelola kunci →
            </Link>
          </p>
        </div>
      )}

      {/* ── PHASE 1: ADMIN ── */}
      <PhaseCard
        nomor={1}
        judul="Admin Rule"
        deskripsi="Sistem menyusun jadwal dari nol menggunakan tabel split JP ketat (1 pola per JP, tanpa fallback) dan memprioritaskan guru paling sulit (difficulty tertinggi) lebih dulu."
        state={s1}
        action={action1}
        pending={p1}
        disabled={pending}
        labelTombol="Mulai Generate Jadwal"
        warna="blue"
      />

      {/* ── PHASE 2: AUTOFIX ── */}
      {tampilFase2 && (
        <PhaseCard
          nomor={2}
          judul="Autofix"
          deskripsi={`${gagalFase1} sesi belum berhasil dijadwalkan setelah Phase 1. RESET TOTAL — sistem membangun ulang jadwal dari nol dengan search space lebih besar (tabel split fallback, mis. 3 JP boleh [3] atau [2,1]). Hasil hanya disimpan jika sama atau lebih baik dari Phase 1 (Safe Mode).`}
          state={s2}
          action={action2}
          pending={p2}
          disabled={pending}
          labelTombol="Jalankan Autofix"
          warna="orange"
        />
      )}

      {/* ── PHASE 3: RESCUE ── */}
      {tampilFase3 && (
        <PhaseCard
          nomor={3}
          judul="Rescue"
          deskripsi={`${s2.result!.gagal.length} sesi masih belum dapat dijadwalkan setelah Phase 2. TIDAK reset total — melanjutkan dari jadwal tersimpan, mencoba rollback bertingkat (5 → 10 → 20 → 50 sesi) lalu menjadwalkan ulang sesi gagal, diprioritaskan dari domain tersempit.`}
          state={s3}
          action={action3}
          pending={p3}
          disabled={pending}
          labelTombol="Jalankan Rescue"
          warna="yellow"
        />
      )}

      {/* ── PHASE 4: EMERGENCY ── */}
      {tampilFase3b && (
        <PhaseCard
          nomor={4}
          judul="Emergency"
          deskripsi={`${s3.result!.gagal.length} sesi masih belum dapat dijadwalkan setelah Phase 3. TIDAK reset total — search space PALING longgar (mis. 4 JP boleh [2,1,1], 5 JP boleh [3,1,1]), backtracking diperbesar (10 → 20 → 40 → 80 sesi), dan gap penalty diturunkan supaya sesi lebih berani ditempatkan.`}
          state={s3b}
          action={action3b}
          pending={p3b}
          disabled={pending}
          labelTombol="Jalankan Emergency"
          warna="red"
        />
      )}

      {/* ── PHASE 5: LNS ── */}
      {tampilFase4 && (
        <PhaseCard
          nomor={5}
          judul="LNS (Large Neighborhood Search)"
          deskripsi={`${s3b.result!.gagal.length} sesi masih belum dapat dijadwalkan setelah Phase 4. TIDAK reset total — menghancurkan sebagian solusi (destroy 10% → 20% → 30%, prioritas guru bottleneck / domain kecil) lalu membangun ulang bagian yang dihancurkan.`}
          state={s4}
          action={action4}
          pending={p4}
          disabled={pending}
          labelTombol="Jalankan LNS"
          warna="purple"
        />
      )}

      {/* ── Statistik Guru & Bottleneck ── */}
      {guruStats.length > 0 && (bottleneckIds.length > 0 || tampilConsent) && (
        <GuruStatsPanel guruStats={guruStats} bottleneckIds={bottleneckIds} />
      )}

      {/* ── PHASE 5: CONSENT ── */}
      {tampilConsent && (!s5.result || s5.result.gagal.length > 0) && (
        <ApprovalPanel
          cases={approvalCases}
          onSubmit={submitApproval}
          pending={p5}
          error={s5.error}
          previousAttemptFailed={s5.result != null}
        />
      )}

      {/* ── Safe Mode: hasil fase terakhir ditolak ── */}
      {false && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 flex gap-3 items-start">
          <span className="text-2xl shrink-0">🛡️</span>
          <div>
            <p className="font-bold text-amber-900 text-sm">Safe Mode aktif</p>
            <p className="text-sm text-amber-800 mt-1">
              {lastResult?.rejectMessage ?? "Hasil generate lebih buruk. Jadwal sebelumnya dipertahankan."}
            </p>
          </div>
        </div>
      )}

      {/* ── Sukses ── */}
      {selesai && (
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl shrink-0">✅</span>
            <div className="space-y-1">
              <p className="font-bold text-green-900 text-base">
                Jadwal berhasil disusun sepenuhnya
              </p>
              <p className="text-sm text-green-700">
                Seluruh {lastResult!.berhasil} sesi telah berhasil dijadwalkan
                {lastResult!.runsUsed > 1 ? ` dalam ${lastResult!.runsUsed} iterasi` : ""}.
              </p>
              {lastResult!.lockedDipertahankan > 0 && (
                <p className="text-xs text-green-600">
                  {lastResult!.lockedDipertahankan} slot terkunci dipertahankan dari jadwal sebelumnya.
                </p>
              )}
              {lastResult!.rescueModeUsed && (
                <p className="text-xs text-green-600">
                  ⟲ Rescue Mode aktif digunakan untuk menyelesaikan sesi yang sempat gagal.
                </p>
              )}
              {lastResult!.mode === "approval" && (
                <p className="text-xs text-fuchsia-600">
                  ⑥ Diselesaikan lewat Phase 6 — Consent dengan relaksasi yang disetujui operator.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/laporan/jadwal"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
              📄 Pratinjau & Ekspor Jadwal →
            </Link>
            <Link href="/admin/penjadwalan/kelas"
              className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-50 transition-colors">
              Jadwal per Kelas
            </Link>
            <Link href="/admin/penjadwalan/guru"
              className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-50 transition-colors">
              Jadwal per Guru
            </Link>
          </div>
          {/* Ulangi — konfirmasi karena akan mengganti jadwal yang sudah jadi */}
          <form action={async () => {
            if (!window.confirm("Generate ulang akan mengganti jadwal lama. Lanjutkan?")) return;
            action1();
          }}>
            <button type="submit" disabled={pending}
              className="text-xs text-green-700 hover:underline disabled:opacity-50">
              Susun ulang jadwal dari awal →
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── PhaseCard ────────────────────────────────────────────────────────────────

type Warna = "blue" | "orange" | "yellow" | "red" | "purple";

const WARNA_CLS: Record<Warna, {
  border: string; bg: string; header: string; badge: string;
  btn: string; catatan: string;
}> = {
  blue: {
    border: "border-blue-200",    bg: "bg-blue-50",
    header: "text-blue-900",      badge: "bg-blue-100 text-blue-700",
    btn: "bg-blue-600 hover:bg-blue-700",
    catatan: "text-blue-700 bg-blue-100/60",
  },
  orange: {
    border: "border-orange-200",  bg: "bg-orange-50",
    header: "text-orange-900",    badge: "bg-orange-100 text-orange-700",
    btn: "bg-orange-500 hover:bg-orange-600",
    catatan: "text-orange-700 bg-orange-100/60",
  },
  yellow: {
    border: "border-yellow-300",  bg: "bg-yellow-50",
    header: "text-yellow-900",    badge: "bg-yellow-100 text-yellow-700",
    btn: "bg-yellow-500 hover:bg-yellow-600",
    catatan: "text-yellow-800 bg-yellow-100/60",
  },
  red: {
    border: "border-red-300",     bg: "bg-red-50",
    header: "text-red-900",       badge: "bg-red-100 text-red-700",
    btn: "bg-red-600 hover:bg-red-700",
    catatan: "text-red-800 bg-red-100/60",
  },
  purple: {
    border: "border-purple-200",  bg: "bg-purple-50",
    header: "text-purple-900",    badge: "bg-purple-100 text-purple-700",
    btn: "bg-purple-600 hover:bg-purple-700",
    catatan: "text-purple-700 bg-purple-100/60",
  },
};

function PhaseCard({
  nomor, judul, deskripsi, state, action, pending, disabled,
  labelTombol, warna, catatan,
}: {
  nomor: number;
  judul: string;
  deskripsi: string;
  state: GenerateActionState;
  action: (fd: FormData) => void;
  pending: boolean;
  disabled: boolean;
  labelTombol: string;
  warna: Warna;
  catatan?: string;
}) {
  const cls  = WARNA_CLS[warna];
  const done = state.result != null || !!state.error;
  const gagal = state.result?.gagal ?? [];
  const rejected = !!state.result?.rejected;
  const nomorLabel = ["①", "②", "③", "④", "⑤"][nomor - 1];

  return (
    <div className={`rounded-xl border-2 ${cls.border} ${cls.bg} overflow-hidden`}>
      {/* Header fase */}
      <div className="px-5 py-4 border-b border-black/5">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="text-lg font-bold text-zinc-400">{nomorLabel}</span>
          <p className={`text-sm font-bold ${cls.header}`}>Phase {nomor} — {judul}</p>
          {state.result && !rejected && (
            <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              gagal.length === 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {gagal.length === 0 ? "✓ Selesai" : `${gagal.length} belum terjadwal`}
            </span>
          )}
          {rejected && (
            <span className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700">
              🛡️ Ditolak (Safe Mode)
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-600">{deskripsi}</p>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Catatan */}
        {catatan && !done && (
          <div className={`rounded-lg px-3 py-2 text-xs ${cls.catatan}`}>
            ℹ {catatan}
          </div>
        )}

        {/* Hasil ditolak Safe Mode */}
        {rejected && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            {state.result!.rejectMessage}
          </div>
        )}

        {/* Statistik hasil */}
        {state.result && !rejected && (
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-white border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700">
              {state.result.berhasil} / {state.result.totalSesi} sesi berhasil
            </span>
            {state.result.runsUsed > 1 && (
              <span className="rounded-md bg-white border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500">
                {state.result.runsUsed} iterasi
              </span>
            )}
            {state.result.slotSesudah > 0 && (
              <span className="rounded-md bg-white border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500">
                {state.result.slotSesudah} slot jadwal tersimpan
              </span>
            )}
            {state.result.phaseStats.backtrackUsed > 0 && (
              <span className="rounded-md bg-white border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500">
                {state.result.phaseStats.backtrackUsed}× backtrack
              </span>
            )}
            {state.result.phaseStats.rollbackUsed > 0 && (
              <span className="rounded-md bg-sky-100 border border-sky-200 px-2.5 py-1 text-xs font-medium text-sky-700">
                {state.result.phaseStats.rollbackUsed}× rollback
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {/* Daftar gagal */}
        {gagal.length > 0 && !rejected && <GagalList items={gagal} />}

        {/* Tombol aksi */}
        {!done ? (
          <form action={action}>
            <button
              type="submit"
              disabled={disabled}
              className={`w-full rounded-lg py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 shadow-sm ${cls.btn}`}
            >
              {pending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Sedang memproses…
                </span>
              ) : labelTombol}
            </button>
          </form>
        ) : (
          <form action={action}>
            <button type="submit" disabled={disabled}
              className="text-xs text-zinc-500 hover:underline disabled:opacity-40 transition-colors">
              Jalankan ulang phase ini →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── ApprovalPanel (Phase 5 — Consent) ───────────────────────────────────────

function ApprovalPanel({ cases, onSubmit, pending, error, previousAttemptFailed }: {
  cases: ApprovalCase[];
  onSubmit: (decisions: ApprovalDecision[]) => void;
  pending: boolean;
  error?: string;
  previousAttemptFailed: boolean;
}) {
  const [checked, setChecked] = useState<Record<string, Set<ApprovalOptionKind>>>({});

  function toggle(bebanId: string, opsi: ApprovalOptionKind) {
    setChecked(prev => {
      const next = { ...prev };
      const set = new Set(next[bebanId] ?? []);
      if (set.has(opsi)) set.delete(opsi); else set.add(opsi);
      next[bebanId] = set;
      return next;
    });
  }

  const totalDipilih = Object.values(checked).reduce((acc, s) => acc + s.size, 0);

  function handleSubmit() {
    const decisions: ApprovalDecision[] = Object.entries(checked)
      .filter(([, set]) => set.size > 0)
      .map(([bebanMengajarId, set]) => ({ bebanMengajarId, opsiDisetujui: [...set] }));
    onSubmit(decisions);
  }

  return (
    <div className="rounded-xl border-2 border-fuchsia-200 bg-fuchsia-50 overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="text-lg font-bold text-zinc-400">⑥</span>
          <p className="text-sm font-bold text-fuchsia-900">Phase 6 — Consent</p>
          <span className="ml-auto rounded-full bg-fuchsia-100 text-fuchsia-700 px-2.5 py-0.5 text-[11px] font-semibold">
            {cases.length} sesi membutuhkan persetujuan
          </span>
        </div>
        <p className="text-xs text-zinc-600">
          Semua fase otomatis (Admin → Autofix → Rescue → Emergency → LNS) gagal menjadwalkan {cases.length} sesi di
          bawah ini. Pilih opsi relaksasi yang ingin disetujui per sesi, lalu generate ulang. Relaksasi
          hanya diterapkan pada sesi yang dicentang, bukan global — dan tidak pernah menambah slot
          sekolah, JP ke-9, atau hari Sabtu.
        </p>
        {previousAttemptFailed && (
          <div className="mt-2 rounded-lg bg-amber-100 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            ⚠ Percobaan sebelumnya dengan opsi yang dipilih masih menyisakan sesi gagal. Coba centang
            opsi tambahan di bawah, atau buka Diagnostik untuk analisis lebih lanjut.
          </div>
        )}
      </div>

      <div className="divide-y divide-fuchsia-100 max-h-96 overflow-y-auto">
        {cases.map(c => (
          <div key={c.bebanMengajarId} className="px-5 py-3">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-fuchsia-300 shrink-0 mt-0.5">→</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-800">
                  {c.mapel} <span className="text-zinc-400 font-normal">· {c.kelas} · {c.guru}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  {c.jp} JP — split ideal [{c.splitIdeal.join(", ")}] — {c.status}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-5">
              {c.opsi.map(o => {
                const isChecked = checked[c.bebanMengajarId]?.has(o) ?? false;
                return (
                  <label key={o} className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? "border-fuchsia-400 bg-fuchsia-100 text-fuchsia-800 font-medium"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}>
                    <input
                      type="checkbox"
                      className="accent-fuchsia-600"
                      checked={isChecked}
                      onChange={() => toggle(c.bebanMengajarId, o)}
                    />
                    {APPROVAL_OPTION_LABEL[o]}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-black/5 space-y-3">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Generate ulang akan mengganti jadwal lama dengan relaksasi yang dipilih. Lanjutkan?")) return;
              handleSubmit();
            }}
            disabled={pending || totalDipilih === 0}
            className="rounded-lg bg-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-fuchsia-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {pending ? "Sedang memproses…" : `Setujui & Generate Ulang (${totalDipilih} opsi dipilih)`}
          </button>
          <span className="text-xs text-zinc-500">
            Reset total — jadwal akan dibangun ulang dari nol dengan relaksasi yang disetujui.
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── GuruStatsPanel ─────────────────────────────────────────────────────────

function GuruStatsPanel({ guruStats, bottleneckIds }: {
  guruStats: GuruStat[];
  bottleneckIds: string[];
}) {
  const bottleneckSet = new Set(bottleneckIds);
  // Urutkan: bottleneck dulu, lalu difficulty DESC
  const sorted = [...guruStats].sort((a, b) => {
    const ba = bottleneckSet.has(a.guruId) ? 1 : 0;
    const bb = bottleneckSet.has(b.guruId) ? 1 : 0;
    if (ba !== bb) return bb - ba;
    return b.difficulty - a.difficulty;
  });

  return (
    <div className="rounded-xl border-2 border-purple-200 bg-purple-50 overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5">
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-bold text-zinc-400">📊</span>
          <p className="text-sm font-bold text-purple-900">Statistik Guru &amp; Bottleneck</p>
          {bottleneckIds.length > 0 && (
            <span className="ml-auto rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-[11px] font-semibold">
              {bottleneckIds.length} BOTTLENECK GURU
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-600 mt-1">
          difficulty = totalJP ÷ availableSlots. Guru dengan difficulty tertinggi dijadwalkan
          paling awal. Guru yang gagal pada semua fase ditandai sebagai bottleneck.
        </p>
      </div>

      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-xs">
          <thead className="bg-purple-100/60 sticky top-0">
            <tr className="text-left text-purple-800">
              <th className="px-3 py-2 font-semibold">Guru</th>
              <th className="px-3 py-2 font-semibold text-right">Total JP</th>
              <th className="px-3 py-2 font-semibold text-right">Slot Bebas</th>
              <th className="px-3 py-2 font-semibold text-right">Difficulty</th>
              <th className="px-3 py-2 font-semibold text-right">Pertemuan</th>
              <th className="px-3 py-2 font-semibold text-right">Sisa Gagal</th>
              <th className="px-3 py-2 font-semibold text-right">Domain Sisa</th>
              <th className="px-3 py-2 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-100">
            {sorted.map(g => {
              const isBn = bottleneckSet.has(g.guruId);
              return (
                <tr key={g.guruId} className={isBn ? "bg-red-50" : undefined}>
                  <td className="px-3 py-2">
                    <span className="font-medium text-zinc-800">{g.nama}</span>
                    <span className="text-zinc-400"> · {g.kodeGuru}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-700">{g.totalJP}</td>
                  <td className="px-3 py-2 text-right text-zinc-700">{g.availableSlots}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-700">
                    {g.difficulty < 0 ? "∞" : g.difficulty.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-700">{g.meetingCount}</td>
                  <td className="px-3 py-2 text-right">
                    {g.remainingJP > 0
                      ? <span className="text-red-600 font-semibold">{g.remainingJP}</span>
                      : <span className="text-zinc-400">0</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-500">{g.remainingDomain}</td>
                  <td className="px-3 py-2 text-center">
                    {isBn ? (
                      <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">
                        BOTTLENECK
                      </span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── GagalList ────────────────────────────────────────────────────────────────

function GagalList({ items }: {
  items: { kelas: string; mapel: string; guru: string; alasan?: string }[];
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-red-100 bg-red-50">
        <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">
          Sesi belum terjadwal · {items.length} entri
        </p>
      </div>
      <div className="max-h-44 overflow-y-auto divide-y divide-zinc-100">
        {items.map((g, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2 text-xs">
            <span className="text-red-300 shrink-0 mt-0.5">→</span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-zinc-800">{g.kelas}</span>
              <span className="text-zinc-500"> · {g.mapel} · </span>
              <span className="text-zinc-400">{g.guru}</span>
              {g.alasan && (
                <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{g.alasan}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
