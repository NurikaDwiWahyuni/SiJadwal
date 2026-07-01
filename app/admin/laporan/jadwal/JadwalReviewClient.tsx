"use client";

import { useTransition, useState, useMemo, useEffect, useCallback } from "react";
import { toggleLockJadwal, regenerateUnlocked, isiSlotManual, getGagalInfo } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type JadwalItem = {
  id: string; isLocked: boolean; isPecah11?: boolean;
  hari: string; hariLabel: string;
  slotId: string; slotNama: string; slotUrutan: number;
  jamMulai: string; jamSelesai: string; jenisSlot: string;
  mapelNama: string; kodeMapel: string;
  guruNama: string; kodeGuru: string; guruId: string;
  kelasId: string; kelasNama: string;
};
type SlotInfo  = { id: string; namaSlot: string; jamMulai: string; jamSelesai: string; urutan: number; jenisSlot: string };
type HariGroup = { hari: string; hariLabel: string; slots: SlotInfo[] };
type KelasInfo = { id: string; namaKelas: string };

type GagalBeban = {
  bebanId: string; guruId: string; guruNama: string; kodeGuru: string;
  kelasId: string; kelasNama: string; mapelNama: string; kodeMapel: string;
  jpTarget: number; jpTerjadwal: number; jpKurang: number;
};

type Props = {
  jadwalList:  JadwalItem[];
  periodeId:   string;
  kelasList:   KelasInfo[];
  slotPerHari: HariGroup[];
};

// ─── Warna per tingkat kelas ──────────────────────────────────────────────────
type ColorSet = { bg: string; text: string; border: string };

const TINGKAT_COLOR: Record<string, ColorSet> = {
  VII:  { bg: "#dbeafe", text: "#1e3a8a", border: "#93c5fd" },
  VIII: { bg: "#ccfbf1", text: "#134e4a", border: "#5eead4" },
  IX:   { bg: "#fed7aa", text: "#7c2d12", border: "#fb923c" },
  DEF:  { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
};

// Warna khusus untuk blok yang dipecah 1+1 — kuning menyala, HANYA di preview
const PECAH11_STYLE = {
  bg:     "#fef08a", // kuning terang
  text:   "#713f12", // coklat gelap (kontras tinggi)
  border: "#ca8a04", // emas
};

function tingkat(namaKelas: string): string {
  const u = namaKelas.toUpperCase();
  if (u.startsWith("IX"))   return "IX";
  if (u.startsWith("VIII")) return "VIII";
  if (u.startsWith("VII"))  return "VII";
  return "DEF";
}

function kelasColor(namaKelas: string): ColorSet {
  return TINGKAT_COLOR[tingkat(namaKelas)] ?? TINGKAT_COLOR.DEF;
}

type PopupState = {
  hari: string; slotId: string; kelasId: string;
  kelasNama: string; slotNama: string; x: number; y: number;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function JadwalReviewClient({ jadwalList, periodeId, kelasList, slotPerHari }: Props) {
  const [isPending,   startTransition] = useTransition();
  const [regenResult, setRegenResult]  = useState<{ berhasil: number; gagal: number } | null>(null);
  const [view,        setView]         = useState<"matriks" | "list">("matriks");

  const [localLocked, setLocalLocked] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    jadwalList.forEach((j) => { m[j.id] = j.isLocked; });
    return m;
  });

  // ── Gagal info ────────────────────────────────────────────────────────────
  const [gagalBeban,   setGagalBeban]   = useState<GagalBeban[]>([]);
  const [guruOccMap,   setGuruOccMap]   = useState<Map<string, Set<string>>>(new Map());
  const [loadingGagal, setLoadingGagal] = useState(false);
  const [gagalLoaded,  setGagalLoaded]  = useState(false);

  const loadGagal = useCallback(async () => {
    setLoadingGagal(true);
    const info = await getGagalInfo(periodeId);
    setGagalBeban(info.gagalBeban);
    setGuruOccMap(new Map(info.guruOccupied.map(([id, s]) => [id, new Set(s)])));
    setGagalLoaded(true);
    setLoadingGagal(false);
  }, [periodeId]);

  useEffect(() => { loadGagal(); }, [loadGagal]);

  // ── Popup & local jadwal ──────────────────────────────────────────────────
  const [popup,       setPopup]       = useState<PopupState | null>(null);
  const [insertMsg,   setInsertMsg]   = useState<{ ok: boolean; text: string } | null>(null);
  const [localJadwal, setLocalJadwal] = useState<Map<string, JadwalItem>>(new Map());

  const lookup = useMemo(() => {
    const m = new Map<string, JadwalItem>();
    jadwalList.forEach((j) => m.set(`${j.hari}__${j.slotId}__${j.kelasId}`, j));
    localJadwal.forEach((j, k) => m.set(k, j));
    return m;
  }, [jadwalList, localJadwal]);

  function kandidatUntukSlot(hari: string, slotId: string, kelasId: string): GagalBeban[] {
    const k = `${hari}|${slotId}`;
    return gagalBeban.filter((b) => {
      if (b.kelasId !== kelasId)             return false;
      if (guruOccMap.get(b.guruId)?.has(k)) return false;
      return true;
    });
  }

  function handleCellClick(e: React.MouseEvent, hari: string, slot: SlotInfo, kelas: KelasInfo) {
    if (!gagalLoaded || gagalBeban.length === 0) return;
    const k = `${hari}__${slot.id}__${kelas.id}`;
    if (lookup.has(k)) return;
    const kandidat = kandidatUntukSlot(hari, slot.id, kelas.id);
    if (kandidat.length === 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setInsertMsg(null);
    setPopup({ hari, slotId: slot.id, kelasId: kelas.id, kelasNama: kelas.namaKelas, slotNama: slot.namaSlot, x: rect.left, y: rect.bottom + 4 });
    e.stopPropagation();
  }

  async function handlePilihMapel(beban: GagalBeban) {
    if (!popup) return;
    const savedPopup = { ...popup };
    setPopup(null);
    startTransition(async () => {
      const result = await isiSlotManual({ periodeId, bebanMengajarId: beban.bebanId, kelasId: savedPopup.kelasId, hari: savedPopup.hari, slotWaktuId: savedPopup.slotId });
      setInsertMsg({ ok: result.ok, text: result.ok ? `✓ ${beban.mapelNama} (${beban.kodeGuru}) berhasil dimasukkan ke ${savedPopup.kelasNama} · ${savedPopup.slotNama}` : result.error ?? "Gagal menyimpan" });
      if (result.ok) {
        const occKey = `${savedPopup.hari}|${savedPopup.slotId}`;
        const lookupKey = `${savedPopup.hari}__${savedPopup.slotId}__${savedPopup.kelasId}`;
        setLocalJadwal((prev) => {
          const next = new Map(prev);
          next.set(lookupKey, { id: `manual-${lookupKey}`, isLocked: false, isPecah11: false, hari: savedPopup.hari, hariLabel: savedPopup.hari, slotId: savedPopup.slotId, slotNama: savedPopup.slotNama, slotUrutan: 0, jamMulai: "", jamSelesai: "", jenisSlot: "PELAJARAN", mapelNama: beban.mapelNama, kodeMapel: beban.kodeMapel, guruNama: beban.guruNama, kodeGuru: beban.kodeGuru, guruId: beban.guruId, kelasId: savedPopup.kelasId, kelasNama: savedPopup.kelasNama });
          return next;
        });
        setGuruOccMap((prev) => { const next = new Map(prev); const s = new Set(next.get(beban.guruId) ?? []); s.add(occKey); next.set(beban.guruId, s); return next; });
        setGagalBeban((prev) => prev.map((b) => b.bebanId === beban.bebanId ? { ...b, jpTerjadwal: b.jpTerjadwal + 1, jpKurang: b.jpKurang - 1 } : b).filter((b) => b.jpKurang > 0));
      }
    });
  }

  function handleToggle(id: string) {
    const newVal = !localLocked[id];
    setLocalLocked((prev) => ({ ...prev, [id]: newVal }));
    startTransition(async () => { await toggleLockJadwal(id, newVal); });
  }

  function handleRegen() {
    if (!confirm("Generate ulang semua slot yang TIDAK terkunci?")) return;
    setRegenResult(null);
    startTransition(async () => { const r = await regenerateUnlocked(); setRegenResult(r); setGagalLoaded(false); loadGagal(); });
  }

  const totalLocked  = Object.values(localLocked).filter(Boolean).length;
  const totalKosong  = gagalBeban.reduce((s, b) => s + b.jpKurang, 0);
  const totalPecah11 = jadwalList.filter((j) => j.isPecah11).length;

  // ─── Render cell matriks ──────────────────────────────────────────────────

  function renderCell(hari: string, slot: SlotInfo, kelas: KelasInfo) {
    const jadwal = lookup.get(`${hari}__${slot.id}__${kelas.id}`);
    const c      = kelasColor(kelas.namaKelas);

    if (jadwal) {
      const locked   = localLocked[jadwal.id] ?? jadwal.isLocked;
      // ── Pecah 1+1: sel kuning menyala dengan badge "½" ──────────────────
      const isPecah  = jadwal.isPecah11 === true;
      const cellBg   = isPecah ? PECAH11_STYLE.bg   : c.bg;
      const cellText = isPecah ? PECAH11_STYLE.text  : c.text;
      const cellBdr  = isPecah ? PECAH11_STYLE.border : c.border;

      return (
        <td key={kelas.id}
          style={{ minWidth: 90, padding: "3px 4px", backgroundColor: cellBg, border: `1.5px solid ${cellBdr}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: cellText, lineHeight: 1.3,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {jadwal.kodeMapel}
                {isPecah && (
                  <span style={{ marginLeft: 3, fontSize: 9, background: "#ca8a04", color: "#fff",
                      borderRadius: 3, padding: "0 3px", fontWeight: 800, verticalAlign: "middle" }}>
                    ½
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: cellText, opacity: 0.75, lineHeight: 1.2 }}>
                {jadwal.kodeGuru}
              </div>
            </div>
            <button onClick={() => handleToggle(jadwal.id)} disabled={isPending}
              title={locked ? "Bebaskan slot" : "Kunci slot"}
              style={{ fontSize: 10, cursor: "pointer", background: "none", border: "none",
                       padding: 0, marginTop: 1, flexShrink: 0, opacity: 0.65 }}>
              {locked ? "🔒" : "🔓"}
            </button>
          </div>
        </td>
      );
    }

    const hasKandidat = gagalLoaded && kandidatUntukSlot(hari, slot.id, kelas.id).length > 0;
    return (
      <td key={kelas.id}
        onClick={hasKandidat ? (e) => handleCellClick(e, hari, slot, kelas) : undefined}
        title={hasKandidat ? "Klik untuk isi slot ini" : undefined}
        style={{ minWidth: 90, padding: "3px 4px", border: "1px solid #e4e4e7",
          backgroundColor: hasKandidat ? "#f0fdf4" : "transparent",
          cursor: hasKandidat ? "pointer" : "default", transition: "background 0.1s" }}
        onMouseEnter={hasKandidat ? (e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#dcfce7"; } : undefined}
        onMouseLeave={hasKandidat ? (e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f0fdf4"; } : undefined}
      >
        {hasKandidat && <div style={{ textAlign: "center", fontSize: 10, color: "#16a34a", fontWeight: 600 }}>+</div>}
      </td>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4" onClick={() => setPopup(null)}>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            🔒 {totalLocked} terkunci
          </span>
          {totalPecah11 > 0 && (
            <span style={{ backgroundColor: PECAH11_STYLE.bg, color: PECAH11_STYLE.text, border: `1px solid ${PECAH11_STYLE.border}` }}
              className="rounded px-2 py-0.5 text-xs font-semibold">
              ½ {totalPecah11} dipecah 1+1
            </span>
          )}
          {totalKosong > 0 && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              ⚠ {totalKosong} JP belum terjadwal
            </span>
          )}
        </div>

        <div className="flex rounded-md border border-zinc-200 overflow-hidden">
          {(["matriks", "list"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium border-l first:border-l-0 border-zinc-200 transition-colors ${
                view === v ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}>
              {v === "matriks" ? "🏫 Matriks" : "≡ List"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={handleRegen} disabled={isPending}
            className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50">
            {isPending ? "Memproses..." : "🔄 Generate Ulang"}
          </button>
          <a href="/api/laporan/excel" className="rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100">
            ⬇ Excel
          </a>
          <a href="/api/laporan/pdf" target="_blank" className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">
            ⬇ PDF
          </a>
        </div>
      </div>

      {regenResult && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          ✓ Generate ulang selesai — {regenResult.berhasil} sesi berhasil
          {regenResult.gagal > 0 && `, ${regenResult.gagal} sesi masih gagal`}.
        </div>
      )}
      {insertMsg && (
        <div className={`rounded-md border px-3 py-2 text-sm ${insertMsg.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {insertMsg.text}
        </div>
      )}

      {/* ── Legenda ── */}
      {view === "matriks" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-3 flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Tingkat:</span>
          {(["VII", "VIII", "IX"] as const).map((t) => {
            const c = TINGKAT_COLOR[t];
            return (
              <span key={t} style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 999, padding: "2px 12px", fontSize: 12, fontWeight: 700 }}>
                {t}
              </span>
            );
          })}
          {totalPecah11 > 0 && (
            <>
              <span className="text-[10px] text-zinc-300">|</span>
              <span style={{ backgroundColor: PECAH11_STYLE.bg, color: PECAH11_STYLE.text, border: `1px solid ${PECAH11_STYLE.border}`, borderRadius: 999, padding: "2px 12px", fontSize: 12, fontWeight: 700 }}>
                ½ = dipecah 1+1 (preview saja, export normal)
              </span>
            </>
          )}
          {totalKosong > 0 && (
            <>
              <span className="text-[10px] text-zinc-300">|</span>
              <span style={{ backgroundColor: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac", borderRadius: 999, padding: "2px 12px", fontSize: 12, fontWeight: 600 }}>
                + = slot bisa diisi
              </span>
              {loadingGagal && <span className="text-xs text-zinc-400 animate-pulse">Memuat…</span>}
            </>
          )}
        </div>
      )}

      {/* ── Ringkasan gagal ── */}
      {gagalLoaded && gagalBeban.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-red-700">⚠ JP Belum Terjadwal — klik sel hijau (+) di matriks untuk mengisi manual</p>
          <div className="flex flex-wrap gap-1.5">
            {gagalBeban.map((b) => (
              <span key={b.bebanId} className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-[11px] text-red-700 font-medium">
                {b.kelasNama} · {b.kodeMapel} · {b.jpKurang} JP
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── MATRIKS ── */}
      {view === "matriks" && (
        <div className="w-full rounded-lg border border-zinc-200 bg-white">
          <div className="w-full overflow-x-auto">
          <table className="min-w-max" style={{ borderCollapse: "collapse", minWidth: 120 + kelasList.length * 95, fontSize: 11 }}>
            <thead>
              <tr style={{ backgroundColor: "#f4f4f5" }}>
                <th style={{ border: "1px solid #d4d4d8", padding: "6px 8px", textAlign: "left", fontWeight: 700, color: "#3f3f46", width: 60, position: "sticky", left: 0, backgroundColor: "#f4f4f5", zIndex: 10 }}>Hari</th>
                <th style={{ border: "1px solid #d4d4d8", padding: "6px 8px", width: 100, fontWeight: 600, color: "#52525b", whiteSpace: "nowrap" }}>Waktu</th>
                {kelasList.map((k) => {
                  const c = kelasColor(k.namaKelas);
                  return <th key={k.id} style={{ border: "1px solid #d4d4d8", padding: "6px 8px", textAlign: "center", fontWeight: 700, minWidth: 90, backgroundColor: c.bg, color: c.text }}>{k.namaKelas}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {slotPerHari.map((hariGroup) =>
                hariGroup.slots.map((slot, si) => {
                  const isNP = slot.jenisSlot === "NON_PELAJARAN";
                  return (
                    <tr key={`${hariGroup.hari}__${slot.id}`} style={{ backgroundColor: isNP ? "#fafafa" : undefined }}>
                      {si === 0 && (
                        <td rowSpan={hariGroup.slots.length} style={{ border: "1px solid #d4d4d8", padding: "4px 6px", textAlign: "center", fontWeight: 800, color: "#3f3f46", backgroundColor: "#f4f4f5", writingMode: "vertical-lr", transform: "rotate(180deg)", letterSpacing: "0.06em", position: "sticky", left: 0, zIndex: 5 }}>
                          {hariGroup.hariLabel}
                        </td>
                      )}
                      <td style={{ border: "1px solid #e4e4e7", padding: "4px 6px", textAlign: "center", color: "#71717a", whiteSpace: "nowrap", fontSize: 10 }}>
                        {isNP ? <em style={{ color: "#a1a1aa" }}>{slot.namaSlot}</em>
                          : slot.jamMulai && slot.jamSelesai ? `${slot.jamMulai}–${slot.jamSelesai}` : slot.namaSlot}
                      </td>
                      {isNP
                        ? <td colSpan={kelasList.length} style={{ border: "1px solid #e4e4e7", padding: "3px 6px", textAlign: "center", color: "#a1a1aa", fontStyle: "italic", fontSize: 10, backgroundColor: "#fafafa" }}>{slot.namaSlot}</td>
                        : kelasList.map((kelas) => renderCell(hariGroup.hari, slot, kelas))
                      }
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── LIST ── */}
      {view === "list" && (
        <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs text-zinc-500">
                <th className="px-3 py-2.5 font-medium w-8 text-center">🔒</th>
                <th className="px-3 py-2.5 font-medium">Hari</th>
                <th className="px-3 py-2.5 font-medium">Slot</th>
                <th className="px-3 py-2.5 font-medium">Kelas</th>
                <th className="px-3 py-2.5 font-medium">Mapel</th>
                <th className="px-3 py-2.5 font-medium">Guru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {jadwalList.map((j) => {
                const locked = localLocked[j.id] ?? j.isLocked;
                const c      = kelasColor(j.kelasNama);
                return (
                  <tr key={j.id} style={{ backgroundColor: j.isPecah11 ? PECAH11_STYLE.bg + "66" : undefined }}>
                    <td className="px-3 py-1.5 text-center">
                      <button onClick={() => handleToggle(j.id)} disabled={isPending} className="text-base leading-none disabled:opacity-50 hover:scale-110 transition-transform">
                        {locked ? "🔒" : "🔓"}
                      </button>
                    </td>
                    <td className="px-3 py-1.5 text-zinc-500 text-xs">{j.hariLabel}</td>
                    <td className="px-3 py-1.5 font-mono text-xs text-zinc-400">{j.slotNama}</td>
                    <td className="px-3 py-1.5 text-xs">
                      <span style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 999, padding: "1px 8px", fontWeight: 700, fontSize: 11 }}>
                        {j.kelasNama}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-xs font-semibold text-zinc-700">
                      {j.kodeMapel}
                      {j.isPecah11 && <span style={{ marginLeft: 4, fontSize: 9, background: PECAH11_STYLE.border, color: "#fff", borderRadius: 3, padding: "0 3px", fontWeight: 800 }}>½</span>}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-zinc-500">[{j.kodeGuru}] {j.guruNama}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── Popup ── */}
      {popup && (() => {
        const kandidat = kandidatUntukSlot(popup.hari, popup.slotId, popup.kelasId);
        if (kandidat.length === 0) return null;
        return (
          <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: Math.min(popup.y, (typeof window !== "undefined" ? window.innerHeight : 600) - 300), left: Math.max(4, Math.min(popup.x, (typeof window !== "undefined" ? window.innerWidth : 1024) - 280)), zIndex: 9999, width: 268, background: "#fff", border: "1px solid #d1d5db", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.13)", overflow: "hidden" }}>
            <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #f3f4f6", background: "#f9fafb" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>Isi Slot — {popup.kelasNama}</p>
              <p style={{ fontSize: 10, color: "#6b7280", margin: "2px 0 0" }}>{popup.slotNama} · Pilih mapel yang gagal dijadwalkan</p>
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {kandidat.map((b) => (
                <button key={b.bebanId} onClick={() => handlePilihMapel(b)} disabled={isPending}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 12px", background: "none", border: "none", borderBottom: "1px solid #f3f4f6", cursor: "pointer", textAlign: "left", gap: 8 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f0fdf4"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{b.mapelNama}</div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>{b.guruNama}</div>
                  </div>
                  <span style={{ fontSize: 10, background: "#fee2e2", color: "#b91c1c", borderRadius: 999, padding: "1px 7px", fontWeight: 700, flexShrink: 0 }}>
                    -{b.jpKurang} JP
                  </span>
                </button>
              ))}
            </div>
            <div style={{ padding: "6px 12px" }}>
              <button onClick={() => setPopup(null)} style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Batal</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
