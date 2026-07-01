"use client";

import { useState, useTransition } from "react";
import { pecah2JpJadi11, type Pecah11Result } from "./pecah11";
import { autoFixAndRegenerate, type AutoFixResult } from "./autofix";

type Props = {
  gagalCount: number;
  onDone?: (result: AutoFixResult) => void;
};

type Tahap = "idle" | "autofix" | "pecah" | "selesai";

export default function AutoFixButton({ gagalCount, onDone }: Props) {
  const [tahap,       setTahap]       = useState<Tahap>("idle");
  const [autofixRes,  setAutofixRes]  = useState<AutoFixResult | null>(null);
  const [pecahRes,    setPecahRes]    = useState<Pecah11Result | null>(null);
  const [isPending,   startTransition] = useTransition();

  // ── Langkah 1: Auto-fix generate ulang ─────────────────────────────────────
  function handleAutoFix() {
    setTahap("autofix");
    startTransition(async () => {
      const res = await autoFixAndRegenerate();
      setAutofixRes(res);
      onDone?.(res);
      if (res.gagal === 0) setTahap("selesai");
    });
  }

  // ── Langkah 2: Izinkan 2JP dipecah jadi 1+1 ────────────────────────────────
  function handlePecah() {
    setTahap("pecah");
    startTransition(async () => {
      const res = await pecah2JpJadi11();
      setPecahRes(res);
      onDone?.({
        totalBeban: (autofixRes?.totalBeban ?? 0),
        berhasil:   (autofixRes?.berhasil ?? 0) + res.berhasil,
        gagal:      res.gagal,
        runsUsed:   autofixRes?.runsUsed ?? 0,
        selesai:    res.gagal === 0,
        gagalDetail: res.gagalDetail,
      });
      if (res.gagal === 0) setTahap("selesai");
    });
  }

  function handleReset() {
    setTahap("idle");
    setAutofixRes(null);
    setPecahRes(null);
  }

  if (gagalCount === 0 && tahap === "idle") return null;

  const sisaGagal = pecahRes?.gagal ?? autofixRes?.gagal ?? gagalCount;
  const semuaBerhasil = sisaGagal === 0 && tahap !== "idle";

  return (
    <div className="space-y-4">

      {/* ══ LANGKAH 1: Auto-Fix ══════════════════════════════════════════════ */}
      {tahap === "idle" && (
        <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🔧</span>
            <div>
              <p className="text-base font-bold text-orange-900">
                {gagalCount} jadwal belum bisa masuk — coba perbaiki otomatis?
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Sistem akan coba susun ulang <strong>sampai 100 kali</strong> dengan berbagai
                kombinasi agar semua jadwal bisa masuk.
              </p>
            </div>
          </div>
          <button
            onClick={handleAutoFix}
            disabled={isPending}
            className="w-full rounded-xl bg-orange-500 py-3 text-base font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isPending
              ? <><span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent" /> Sedang memperbaiki…</>
              : "🔧 Perbaiki Otomatis Sekarang"}
          </button>
          {isPending && (
            <p className="text-sm text-orange-600 text-center animate-pulse font-medium">
              ⏳ Mohon tunggu, proses ini bisa memakan waktu beberapa detik…
            </p>
          )}
        </div>
      )}

      {/* ══ LANGKAH 2: Setelah auto-fix, ada sisa gagal → tawarkan pecah 1+1 ═ */}
      {tahap === "autofix" && autofixRes && autofixRes.gagal > 0 && !pecahRes && (
        <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-5 space-y-4">
          {/* Hasil auto-fix */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="text-base font-bold text-yellow-900">
                Auto-fix selesai — {autofixRes.berhasil} berhasil,{" "}
                <span className="text-red-600">{autofixRes.gagal} masih tersisa</span>
              </p>
              <p className="text-sm text-yellow-700 mt-0.5">
                Sisa yang gagal semuanya adalah jadwal 2JP yang tidak bisa masuk berbarengan.
              </p>
            </div>
          </div>

          {/* Detail yang tersisa */}
          <div className="rounded-xl bg-white border border-yellow-200 divide-y divide-yellow-100 overflow-hidden">
            {autofixRes.gagalDetail.map((g, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="text-red-400">✗</span>
                <span className="font-semibold text-zinc-800">{g.kelas}</span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-700">{g.mapel}</span>
                <span className="text-zinc-400 text-xs ml-auto">{g.guru}</span>
              </div>
            ))}
          </div>

          {/* Tawaran pecah 1+1 */}
          <div className="space-y-3">
            <div className="rounded-xl bg-white border-2 border-yellow-400 px-4 py-3">
              <p className="text-sm font-bold text-yellow-900 mb-1">
                💡 Solusi: Bolehkan 2JP dipecah jadi dua hari yang berbeda?
              </p>
              <p className="text-sm text-yellow-800 leading-relaxed">
                Misalnya: Matematika 2JP → masuk <strong>Senin 1 JP</strong> + <strong>Rabu 1 JP</strong>.
                Di tabel jadwal nanti akan ditandai{" "}
                <span
                  style={{ background: "#fef08a", color: "#713f12", border: "1.5px solid #ca8a04" }}
                  className="inline-block text-xs font-bold px-2 py-0.5 rounded"
                >
                  ½ kuning
                </span>{" "}
                supaya mudah dikenali.
              </p>
            </div>
            <button
              onClick={handlePecah}
              disabled={isPending}
              className="w-full rounded-xl bg-yellow-500 py-3 text-base font-bold text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isPending
                ? <><span className="inline-block h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent" /> Memecah jadwal…</>
                : "⚡ Ya, Pecah & Selesaikan Semua Jadwal"}
            </button>
            {isPending && (
              <p className="text-sm text-yellow-700 text-center animate-pulse font-medium">
                ⏳ Sedang menyesuaikan…
              </p>
            )}
            <button onClick={handleReset} className="w-full text-sm text-zinc-400 hover:text-zinc-600 underline">
              Coba auto-fix lagi dari awal
            </button>
          </div>
        </div>
      )}

      {/* ══ SELESAI ══════════════════════════════════════════════════════════ */}
      {semuaBerhasil && (
        <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <p className="text-lg font-bold text-green-900">Semua jadwal berhasil masuk!</p>
              <p className="text-sm text-green-700 mt-0.5">
                {pecahRes && pecahRes.berhasil > 0 && (
                  <>
                    <span className="font-semibold">{pecahRes.berhasil} jadwal</span> dipecah
                    jadi 2 hari terpisah (1+1) — ditandai{" "}
                    <span
                      style={{ background: "#fef08a", color: "#713f12", border: "1px solid #ca8a04" }}
                      className="inline-block text-xs font-bold px-1.5 py-0.5 rounded"
                    >
                      kuning
                    </span>{" "}
                    di tabel preview.
                  </>
                )}
              </p>
            </div>
          </div>
          <a
            href="/admin/laporan/jadwal"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 py-3 text-base font-bold text-white hover:bg-green-700 transition-colors"
          >
            👁️ Lihat Tabel Jadwal Lengkap →
          </a>
        </div>
      )}

      {/* ══ MASIH ADA SISA (setelah pecah 1+1 pun masih gagal) ══════════════ */}
      {tahap === "pecah" && pecahRes && pecahRes.gagal > 0 && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-3xl">😓</span>
            <div>
              <p className="text-base font-bold text-red-900">
                {pecahRes.gagal} jadwal masih tidak bisa masuk
              </p>
              <p className="text-sm text-red-700 mt-0.5">
                Kemungkinan penyebab: guru ini tidak punya hari kosong lain,
                atau semua slot di sekolah sudah penuh. Perlu diperiksa manual.
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-red-200 divide-y overflow-hidden">
            {pecahRes.gagalDetail.map((g, i) => (
              <div key={i} className="px-4 py-2.5 text-sm">
                <span className="font-semibold text-zinc-800">{g.kelas}</span>
                <span className="text-zinc-400 mx-1">·</span>
                <span className="text-zinc-700">{g.mapel}</span>
                <p className="text-xs text-red-500 mt-0.5">{g.alasan}</p>
              </div>
            ))}
          </div>
          <a href="/admin/laporan/jadwal" className="block text-center text-sm font-semibold text-red-700 underline">
            Lihat preview untuk isi manual →
          </a>
        </div>
      )}
    </div>
  );
}
