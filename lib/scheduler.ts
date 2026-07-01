/**
 * lib/scheduler.ts
 *
 * ALGORITMA: SMP Scheduler v3.2 — Bottleneck First Scheduling + CSP + Multi Phase Recovery
 * ─────────────────────────────────────────────────────────────────────────
 * PHASE 0  : Feasibility Check       — validasi kelas/guru/sekolah + deteksi
 *            BOTTLENECK block-level (needBlock vs availableBlock per ukuran blok)
 * PHASE 1  : Admin Rule              — bangun SESI (bukan beban) dari tabel split ketat
 * PHASE 1A : Domain Calculation      — domain = jumlah kemungkinan penempatan per sesi
 * PHASE 1B : Bottleneck Sorting      — urutkan SESI (bukan guru/mapel):
 *            domain ASC → JP DESC → difficulty DESC → kelasGuru DESC
 *            → meetingCount DESC → remainingJP DESC
 * PHASE 1C : Greedy Assignment       — ambil sesi tersulit dulu, scoring, lalu
 *            WAJIB recompute domain sesi-sesi terdampak & re-sort
 * PHASE 2  : Autofix                 — RESET TOTAL, tabel split lebih longgar
 *            (3=[2,1], 4=[3,1], 5=[2,2,1], 6=[2,2,2]/[3,2,1])
 * PHASE 3  : Rescue Mode             — jika gagal ≤10, TANPA reset, rollback
 *            lokal 5→10→20→50, prioritaskan sesi gagal (domain ASC → JP DESC
 *            → difficulty DESC)
 * PHASE 4  : Emergency               — RESET TOTAL, split lebih longgar lagi
 *            (tambahan 4=[2,1,1], 5=[3,1,1] — 3=[1,1,1] TETAP dilarang),
 *            gap penalty dikurangi, backtracking diperbesar
 * PHASE 5  : LNS (Large Neighborhood Search) — destroy 10%→20%→30%
 *            (guru bottleneck / domain kecil / sesi gagal), generate ulang
 * PHASE 6  : Consent Mode            — operator menyetujui relaksasi per-SESI
 *            (bukan per-sekolah — TIDAK BOLEH tambah slot/JP sekolah)
 * PHASE 7  : Optimization            — kurangi gap/single-session/loncat hari
 * ─────────────────────────────────────────────────────────────────────────
 * RULE MONOTONIC: setiap phase WAJIB tidak lebih buruk dari phase sebelumnya
 * (failed baru > failed lama → DISCARD, solusi sebelumnya dipertahankan).
 * ─────────────────────────────────────────────────────────────────────────
 * Pemetaan ke 4 tombol UI yang sudah ada (tidak ditambah tombol baru):
 *   Fase 1 (mode "normal")   → PHASE 0 + 1 + 1A + 1B + 1C (Admin Rule)
 *   Fase 2 (mode "autofix")  → PHASE 2 (Autofix) lalu PHASE 3 (Rescue) otomatis
 *                              jika gagal ≤10 setelah Autofix
 *   Fase 3 (mode "phase3")   → PHASE 4 (Emergency) lalu PHASE 5 (LNS) otomatis
 *                              jika masih gagal setelah Emergency
 *   Approval (mode "approval") → PHASE 6 (Consent Mode)
 *   PHASE 7 (Optimization) dijalankan otomatis di akhir SETIAP mode di atas.
 */

import { prisma } from "@/lib/prisma";
import { HARI_LIST, type HariType } from "@/lib/constants";
import { getEfektifMapelIdsBatch } from "@/lib/kelas-mapel";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_RUNS_ADMIN   = 5;
const RESCUE_MAX_GAGAL = 10;                 // Phase 3: hanya jalan jika failed ≤ 10
const BACKTRACK_STEPS  = [5, 10, 20, 50] as const;
const RESCUE_ROLLBACK_STEPS = [5, 10, 20, 50] as const;
const LNS_DESTROY_STEPS = [0.10, 0.20, 0.30] as const;
const MAX_LNS_ROUNDS_PER_STEP = 4;

/** Dipertahankan untuk kompatibilitas UI lama */
export const BACKTRACK_THRESHOLD = 3;
export const RESCUE_THRESHOLD = RESCUE_MAX_GAGAL;

// ─── Tabel Split per Phase ─────────────────────────────────────────────────
//
// ADMIN  : satu split kanonik per JP (Phase 1)
// AUTOFIX: Admin + alternatif lebih fleksibel (Phase 2) — tetap melarang 1,1,1/2,1,1/3,1,1
// EMERGENCY: Autofix + relaksasi tambahan 4=[2,1,1], 5=[3,1,1] (Phase 4) — 3=[1,1,1] TETAP dilarang
//
const ADMIN_SPLIT: Record<number, number[][]> = {
  1: [[1]], 2: [[2]], 3: [[3]], 4: [[2, 2]], 5: [[3, 2]],
  6: [[3, 3]], 7: [[3, 2, 2]], 8: [[3, 3, 2]], 9: [[3, 3, 3]],
};

const AUTOFIX_SPLIT: Record<number, number[][]> = {
  1: [[1]], 2: [[2]], 3: [[3], [2, 1]], 4: [[2, 2], [3, 1]],
  5: [[3, 2], [2, 2, 1], [3, 1, 1]], 6: [[3, 3], [2, 2, 2], [3, 2, 1]],
  7: [[3, 2, 2]], 8: [[3, 3, 2]], 9: [[3, 3, 3]],
};

const EMERGENCY_SPLIT: Record<number, number[][]> = {
  1: [[1]], 2: [[2]], 3: [[3], [2, 1]], 4: [[2, 2], [3, 1], [2, 1, 1]],
  5: [[3, 2], [2, 2, 1], [3, 1, 1]], 6: [[3, 3], [2, 2, 2], [3, 2, 1]],
  7: [[3, 2, 2]], 8: [[3, 3, 2]], 9: [[3, 3, 3]],
};

const ADMIN_FORBIDDEN     = new Set(["1,1,1", "2,1,1", "3,1,1"]);
const AUTOFIX_FORBIDDEN   = new Set(["1,1,1", "2,1,1"]); // 3,1,1 DIIZINKAN di Autofix (spec v3.2)
const EMERGENCY_FORBIDDEN = new Set(["1,1,1"]); // 2,1,1 / 3,1,1 kini DIIZINKAN di Emergency

function isForbidden(pola: number[], forbidden: Set<string>): boolean {
  const key = [...pola].sort((a, b) => b - a).join(",");
  return forbidden.has(key);
}

type SplitTablePhase = "admin" | "autofix" | "emergency";
const TABLE_BY_PHASE: Record<SplitTablePhase, Record<number, number[][]>> = {
  admin: ADMIN_SPLIT, autofix: AUTOFIX_SPLIT, emergency: EMERGENCY_SPLIT,
};
const FORBIDDEN_BY_PHASE: Record<SplitTablePhase, Set<string>> = {
  admin: ADMIN_FORBIDDEN, autofix: AUTOFIX_FORBIDDEN, emergency: EMERGENCY_FORBIDDEN,
};

// ─── Types ───────────────────────────────────────────────────────────────────

type SlotKandidat = { id: string; urutan: number };
type SlotRow      = { id: string; hari: string; urutan: number; jenisSlot: string };
type Placement    = { hari: HariType; block: SlotKandidat[] };

type BebanItem = {
  id: string; jp: number; guruId: string; kelasId: string; mapelId: string;
  guru:  { nama: string; kodeGuru: string; hariTidakTersedia: unknown };
  kelas: { namaKelas: string };
  mapel: { namaMapel: string; kodeMapel: string; jpMaksBerurutan: number; jumlahPertemuanMaks: number };
};

/** Unit kerja PHASE 1C — satu SESI individual (bukan satu beban utuh) */
type SesiUnit = {
  id: string;           // `${bebanId}#${idx}`
  beban: BebanItem;
  jp: number;
  idx: number;          // urutan sesi ke-berapa dalam beban ini
  total: number;        // total sesi yang dibutuhkan beban ini
};

type PlacedSesi = { sesi: SesiUnit; placement: Placement };

type InsertItem = {
  bebanMengajarId: string; guruId: string; kelasId: string;
  hari: HariType; slotWaktuId: string; periodeAkademikId: string;
  isPecah11: boolean;
};

export type TipeAlasan =
  | "HARI_DIBLOKIR" | "GURU_PENUH" | "KELAS_PENUH"
  | "KONFLIK_WAKTU" | "BLOK_TIDAK_MUAT" | "SESI_TIDAK_CUKUP" | "TIDAK_DIKETAHUI";

export type GagalItem = {
  bebanMengajarId: string;
  guru: string; guruId: string; kelas: string; kelasId: string;
  mapel: string; mapelId: string; sesiJp: number;
  alasan: string; tipeAlasan: TipeAlasan; maxBlokTersedia: number;
};

export type GenerateMode = "normal" | "autofix" | "phase3" | "approval";

export const GENERATE_MODE_LABEL: Record<GenerateMode, string> = {
  normal:   "ADMIN",
  autofix:  "AUTOFIX → RESCUE",
  phase3:   "EMERGENCY → LNS",
  approval: "CONSENT",
};

// ─── Statistik guru ───────────────────────────────────────────────────────────

export type GuruStat = {
  guruId: string; nama: string; kodeGuru: string;
  totalJP: number; availableSlots: number; difficulty: number; meetingCount: number;
  jumlahKelas: number; hariTersedia: number;
  remainingJP: number; remainingDomain: number; isBottleneck: boolean;
};

// ─── Phase 0: Block-level bottleneck diagnostic ──────────────────────────────

export type BlockBottleneck = {
  target: "GURU" | "SEKOLAH";
  id: string;
  label: string;
  blockSize: number;
  needBlock: number;
  availableBlock: number;
  status: "BOTTLENECK" | "HIGH_RISK" | "CRITICAL";
};

// ─── PHASE 6: Consent Mode ────────────────────────────────────────────────────

export type ApprovalOptionKind =
  | "SPLIT_211"
  | "TAMBAH_HARI_GURU"
  | "UBAH_MAKS_SESI"
  | "GAP_TAMBAHAN"
  | "SWAP_OTOMATIS"
  | "PERPINDAHAN_HARI"
  | "TAMBAH_PERTEMUAN";

export const APPROVAL_OPTION_LABEL: Record<ApprovalOptionKind, string> = {
  SPLIT_211:        "Izinkan 2 JP menjadi [1,1]",
  TAMBAH_HARI_GURU: "Tambah hari tersedia guru",
  UBAH_MAKS_SESI:   "Tambah maksimal pertemuan",
  GAP_TAMBAHAN:     "Longgarkan compactness",
  SWAP_OTOMATIS:    "Izinkan swap otomatis",
  PERPINDAHAN_HARI: "Izinkan perpindahan hari",
  TAMBAH_PERTEMUAN: "Izinkan lebih dari 2 pertemuan",
};

export type ApprovalCase = {
  bebanMengajarId: string;
  mapel: string; mapelId: string;
  kelas: string; kelasId: string;
  guru: string; guruId: string;
  jp: number; splitIdeal: number[]; status: string;
  opsi: ApprovalOptionKind[];
};

export type ApprovalDecision = { bebanMengajarId: string; opsiDisetujui: ApprovalOptionKind[] };

export type GenerateResult = {
  slotSebelum: number; slotSesudah: number; lockedDipertahankan: number;
  totalSesi: number; berhasil: number; gagal: GagalItem[];
  totalBebanDifilter: number; totalBebanAwal: number; runsUsed: number;
  mode: GenerateMode;
  guruStats: GuruStat[];
  bottleneckGuruIds: string[];
  rescueModeUsed: boolean;
  phaseStats: PhaseStat;
  approvalCases?: ApprovalCase[];
  blockBottlenecks?: BlockBottleneck[];
  discarded?: boolean;
  discardNote?: string;
};

export type PhaseStat = {
  mode: GenerateMode;
  success: number; failed: number;
  backtrackUsed: number; rollbackUsed: number; relocateUsed: number; avgDomain: number;
  ruleRelaxed: ApprovalOptionKind[];
  lnsDestroyPercent: number; lnsRoundsUsed: number;
  fitness: number;
};

type FitnessBreakdown = {
  fitness: number;
  bentrokGuru: number; bentrokKelas: number; jpKurang: number; mapelHilang: number;
  gap: number; singleSession: number; loncatHari: number; lubangGuru: number;
};

type PlanResult = {
  toInsert: InsertItem[];
  gagal: GagalItem[];
  totalSesi: number;
  guruStats: GuruStat[];
  backtrackUsed: number;
  rollbackUsed: number;
  relocateUsed: number;
  avgDomain: number;
  placed: PlacedSesi[];
  fitness: FitnessBreakdown;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const slotKey = (hari: string, id: string) => `${hari}|${id}`;

function ensureSet(m: Map<string, Set<string>>, id: string): Set<string> {
  if (!m.has(id)) m.set(id, new Set());
  return m.get(id)!;
}

const hariTidak = (b: BebanItem, ignoreHariTidak = false): string[] =>
  ignoreHariTidak ? [] :
  Array.isArray(b.guru.hariTidakTersedia) ? (b.guru.hariTidakTersedia as string[]) : [];

const HARI_INDEX: Record<string, number> = Object.fromEntries(HARI_LIST.map((h, i) => [h, i]));

// ─── PHASE 1: Session Building ────────────────────────────────────────────────

/**
 * Fallback generik: pecah `totalJp` menjadi sesi-sesi ≤ `blok` JP, sedekat
 * mungkin seimbang (mis. 6→[3,3], 7→[3,2,2]). Dipakai HANYA jika tabel split
 * (ADMIN/AUTOFIX/EMERGENCY) tidak punya entri yang muat untuk beban ini —
 * TIDAK PERNAH mengembalikan satu sesi sepanjang totalJp (dilarang spec v3.2).
 */
function genericSplit(totalJp: number, blok: number): number[] {
  const b = Math.max(1, blok);
  if (totalJp <= b) return [totalJp];
  const count = Math.ceil(totalJp / b);
  const base = Math.floor(totalJp / count);
  let extra = totalJp - base * count;
  const parts: number[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(extra > 0 ? base + 1 : base);
    if (extra > 0) extra--;
  }
  return parts.sort((x, y) => y - x);
}

function pickBestSplitForBeban(
  b: BebanItem, table: Record<number, number[][]>, forbidden: Set<string>,
  jpMaks: number, maxSesi: number,
  estimateDomain: (b: BebanItem, jp: number) => number,
  allowSplit11 = false,
): number[] {
  const blok = Math.max(1, Math.min(jpMaks, 3));
  const entries = (table[b.jp] ?? []).filter(pola =>
    !isForbidden(pola, forbidden) && pola.every(s => s <= blok) && pola.length <= maxSesi
  );
  const candidates = [...entries];
  if (allowSplit11 && b.jp === 2 && maxSesi >= 2 && !candidates.some(p => p.length === 2 && p[0] === 1)) {
    candidates.push([1, 1]);
  }
  if (candidates.length === 0) {
    // Tabel tidak punya opsi yang muat (mis. jpMaksBerurutan mapel < blok kanonik).
    // JANGAN kembalikan [b.jp] utuh — selalu pecah sesuai batas blok yang berlaku.
    return genericSplit(b.jp, blok);
  }

  let best = candidates[0];
  let bestScore = -1;
  for (const pola of candidates) {
    const minDomain = Math.min(...pola.map(jp => estimateDomain(b, jp)));
    if (minDomain > bestScore) { bestScore = minDomain; best = pola; }
  }
  return best;
}

function buildSesiUnits(
  beban: BebanItem[], table: Record<number, number[][]>, forbidden: Set<string>,
  approvalByBebanId: Map<string, Set<ApprovalOptionKind>>,
  estimateDomain: (b: BebanItem, jp: number) => number,
): SesiUnit[] {
  const out: SesiUnit[] = [];
  for (const b of beban) {
    const approved = approvalByBebanId.get(b.id);
    const jpMaksEff = approved?.has("GAP_TAMBAHAN") ? b.mapel.jpMaksBerurutan + 1 : b.mapel.jpMaksBerurutan;
    const maxSesiEff = (approved?.has("UBAH_MAKS_SESI") || approved?.has("TAMBAH_PERTEMUAN"))
      ? Math.max(3, b.mapel.jumlahPertemuanMaks + 1) : b.mapel.jumlahPertemuanMaks;
    const pola = pickBestSplitForBeban(b, table, forbidden, jpMaksEff, maxSesiEff, estimateDomain, approved?.has("SPLIT_211"));
    pola.forEach((jp, idx) => out.push({ id: `${b.id}#${idx}`, beban: b, jp, idx, total: pola.length }));
  }
  return out;
}

// ─── PHASE 0/Bottleneck: Hitung difficulty guru ──────────────────────────────

type GuruMetrik = {
  guruId: string; nama: string; kodeGuru: string;
  jumlahKelas: number; totalJP: number; hariTersedia: number;
  availableSlots: number; difficulty: number; meetingCount: number;
};

function computeGuruMetrics(
  beban: BebanItem[], slotKandidatByHari: Record<HariType, SlotKandidat[]>,
  guruOccupied: Map<string, Set<string>>, ignoreHariTidakIds: Set<string> = new Set(),
): Map<string, GuruMetrik> {
  const guruMap = new Map<string, GuruMetrik>();
  for (const b of beban) {
    const m = guruMap.get(b.guruId) ?? {
      guruId: b.guruId, nama: b.guru.nama, kodeGuru: b.guru.kodeGuru,
      jumlahKelas: 0, totalJP: 0, hariTersedia: 0, availableSlots: 0, difficulty: 0, meetingCount: 0,
    };
    m.jumlahKelas++;
    m.totalJP += b.jp;
    const ignore = ignoreHariTidakIds.has(b.id);
    const hv = HARI_LIST.filter(h => !hariTidak(b, ignore).includes(h));
    m.hariTersedia = hv.length;
    const opt = ADMIN_SPLIT[b.jp]?.find(p => !isForbidden(p, ADMIN_FORBIDDEN));
    m.meetingCount += opt ? opt.length : 1;
    guruMap.set(b.guruId, m);
  }
  for (const m of guruMap.values()) {
    let free = 0;
    const bebanGuruIni = beban.find(b => b.guruId === m.guruId);
    const ignore = bebanGuruIni ? ignoreHariTidakIds.has(bebanGuruIni.id) : false;
    const hariTidakArr = bebanGuruIni ? hariTidak(bebanGuruIni, ignore) : [];
    for (const hari of HARI_LIST) {
      if (hariTidakArr.includes(hari)) continue;
      for (const s of slotKandidatByHari[hari as HariType])
        if (!guruOccupied.get(m.guruId)?.has(slotKey(hari, s.id))) free++;
    }
    m.availableSlots = free;
    m.difficulty = free > 0 ? (m.meetingCount + m.jumlahKelas + m.totalJP) / free : Number.POSITIVE_INFINITY;
  }
  return guruMap;
}

// ─── PHASE 0: Block Bottleneck Diagnostic ────────────────────────────────────

function computeBlockBottlenecks(
  beban: BebanItem[], slotKandidatByHari: Record<HariType, SlotKandidat[]>,
): BlockBottleneck[] {
  const out: BlockBottleneck[] = [];

  const countRawBlocks = (jp: number, hariTidakArr: string[]): number => {
    let n = 0;
    for (const hari of HARI_LIST) {
      if (hariTidakArr.includes(hari)) continue;
      const list = slotKandidatByHari[hari as HariType];
      for (let start = 0; start + jp <= list.length; start++) {
        const block = list.slice(start, start + jp);
        if (block.every((s: SlotKandidat, i: number) => i === 0 || s.urutan === block[i - 1].urutan + 1)) n++;
      }
    }
    return n;
  };

  const needByGuru = new Map<string, Map<number, number>>();
  const guruInfo   = new Map<string, { nama: string; hariTidakArr: string[] }>();
  for (const b of beban) {
    const pola = (ADMIN_SPLIT[b.jp] ?? [[b.jp]]).find(p => !isForbidden(p, ADMIN_FORBIDDEN)) ?? [b.jp];
    if (!needByGuru.has(b.guruId)) needByGuru.set(b.guruId, new Map());
    const m = needByGuru.get(b.guruId)!;
    for (const bs of pola) m.set(bs, (m.get(bs) ?? 0) + 1);
    if (!guruInfo.has(b.guruId)) guruInfo.set(b.guruId, { nama: b.guru.nama, hariTidakArr: hariTidak(b) });
  }
  for (const [guruId, needMap] of needByGuru) {
    const info = guruInfo.get(guruId)!;
    for (const [blockSize, needBlock] of needMap) {
      const availableBlock = countRawBlocks(blockSize, info.hariTidakArr);
      if (needBlock > availableBlock) {
        const status: BlockBottleneck["status"] =
          availableBlock <= 2 ? "CRITICAL" : availableBlock <= 5 ? "HIGH_RISK" : "BOTTLENECK";
        out.push({ target: "GURU", id: guruId, label: info.nama, blockSize, needBlock, availableBlock, status });
      }
    }
  }

  const kelasIds = [...new Set(beban.map(b => b.kelasId))];
  const needSekolah = new Map<number, number>();
  for (const b of beban) {
    const pola = (ADMIN_SPLIT[b.jp] ?? [[b.jp]]).find(p => !isForbidden(p, ADMIN_FORBIDDEN)) ?? [b.jp];
    for (const bs of pola) needSekolah.set(bs, (needSekolah.get(bs) ?? 0) + 1);
  }
  for (const [blockSize, needBlock] of needSekolah) {
    const availablePerKelas = countRawBlocks(blockSize, []);
    const availableBlock = availablePerKelas * Math.max(1, kelasIds.length);
    if (needBlock > availableBlock) {
      const status: BlockBottleneck["status"] =
        availableBlock <= 2 ? "CRITICAL" : availableBlock <= 5 ? "HIGH_RISK" : "BOTTLENECK";
      out.push({ target: "SEKOLAH", id: "SEKOLAH", label: "Sekolah", blockSize, needBlock, availableBlock, status });
    }
  }

  return out;
}

// ─── Core CSP State ──────────────────────────────────────────────────────────

type SchedulerState = ReturnType<typeof createSchedulerState>;

function createSchedulerState(
  allBeban: BebanItem[], slotKandidatByHari: Record<HariType, SlotKandidat[]>, semuaSlot: SlotRow[],
  lockedJadwal: { kelasId: string; guruId: string; hari: string; slotWaktuId: string }[],
  kelasBlocked: Map<string, Set<string>>, globalBlocked: Set<string>,
  guruBlockedFromEkskul: Map<string, Set<string>>, approvalByBebanId: Map<string, Set<ApprovalOptionKind>>,
  gapPenaltyMultiplier = 1,
) {
  const ignoreHariTidakIds = new Set<string>();
  for (const [bid, set] of approvalByBebanId) if (set.has("TAMBAH_HARI_GURU")) ignoreHariTidakIds.add(bid);
  const hariTidakFor = (b: BebanItem) => hariTidak(b, ignoreHariTidakIds.has(b.id));

  const kelasOccupied = new Map<string, Set<string>>();
  const guruOccupied  = new Map<string, Set<string>>();
  for (const lj of lockedJadwal) {
    ensureSet(kelasOccupied, lj.kelasId).add(slotKey(lj.hari, lj.slotWaktuId));
    ensureSet(guruOccupied,  lj.guruId ).add(slotKey(lj.hari, lj.slotWaktuId));
  }
  for (const [gid, slots] of guruBlockedFromEkskul)
    for (const s of slots) ensureSet(guruOccupied, gid).add(s);

  const guruMap = computeGuruMetrics(allBeban, slotKandidatByHari, guruOccupied, ignoreHariTidakIds);
  const guruRemainingJP = new Map<string, number>();
  for (const m of guruMap.values()) guruRemainingJP.set(m.guruId, m.totalJP);

  const usedDaysByBeban = new Map<string, Set<HariType>>();

  const isFree = (kelas: string, guru: string, hari: HariType, slotId: string): boolean => {
    const k = slotKey(hari, slotId);
    return !globalBlocked.has(k) && !kelasBlocked.get(kelas)?.has(k)
      && !kelasOccupied.get(kelas)?.has(k) && !guruOccupied.get(guru)?.has(k);
  };
  const mark   = (kelas: string, guru: string, hari: HariType, slotId: string) => {
    ensureSet(kelasOccupied, kelas).add(slotKey(hari, slotId));
    ensureSet(guruOccupied,  guru ).add(slotKey(hari, slotId));
  };
  const unmark = (kelas: string, guru: string, hari: HariType, slotId: string) => {
    kelasOccupied.get(kelas)?.delete(slotKey(hari, slotId));
    guruOccupied.get(guru)?.delete(slotKey(hari, slotId));
  };
  const isBlokTerpotong = (hari: HariType, block: SlotKandidat[]): boolean => {
    if (block.length <= 1) return false;
    const lo = block[0].urutan, hi = block[block.length - 1].urutan;
    return semuaSlot.some(s => s.hari === hari && s.jenisSlot === "NON_PELAJARAN" && s.urutan > lo && s.urutan < hi);
  };
  const guruFreeSlotCount = (guru: string): number =>
    HARI_LIST.reduce((acc, h) => acc + slotKandidatByHari[h as HariType].filter(s => !guruOccupied.get(guru)?.has(slotKey(h, s.id))).length, 0);

  const countValidBlocks = (b: BebanItem, jp: number): number => {
    const usedDays = usedDaysByBeban.get(b.id);
    let n = 0;
    for (const hari of HARI_LIST) {
      if (hariTidakFor(b).includes(hari)) continue;
      if (usedDays?.has(hari as HariType)) continue;
      const list = slotKandidatByHari[hari as HariType];
      for (let start = 0; start + jp <= list.length; start++) {
        const block = list.slice(start, start + jp);
        if (!block.every((s: SlotKandidat, i: number) => i === 0 || s.urutan === block[i - 1].urutan + 1)) continue;
        if (!block.every((s: SlotKandidat) => isFree(b.kelasId, b.guruId, hari as HariType, s.id))) continue;
        n++;
      }
    }
    return n;
  };

  const totalKelasSlot = HARI_LIST.reduce((acc, h) => acc + slotKandidatByHari[h as HariType].length, 0);

  const scoreSlot = (b: BebanItem, hari: HariType, block: SlotKandidat[], usedDays: Set<HariType>): number => {
    const guru = b.guruId, kelas = b.kelasId;
    const difficulty = Math.min(guruMap.get(guru)?.difficulty ?? 0, 10);
    const compactness = (kelasOccupied.get(kelas)?.size ?? 0) > 0 ? 1 : 0;
    const kelasTerisi = kelasOccupied.get(kelas)?.size ?? 0;
    const kelasBelumPenuh = kelasTerisi < totalKelasSlot * 0.7 ? 1 : 0;
    const remainingJP = guruRemainingJP.get(guru) ?? 0;
    const gapFlag = isBlokTerpotong(hari, block) ? 1 : 0;
    const singleSessionFlag = block.length === 1 ? 1 : 0;
    let loncatHariFlag = 0;
    if (usedDays.size > 0) {
      const idx = HARI_INDEX[hari] ?? 0;
      const minDist = Math.min(...[...usedDays].map(h => Math.abs((HARI_INDEX[h] ?? 0) - idx)));
      loncatHariFlag = minDist > 2 ? 1 : 0;
    }
    return 100 * difficulty + 50 * compactness + 20 * kelasBelumPenuh + Math.min(remainingJP, 10)
         - gapPenaltyMultiplier * 15 * gapFlag - 10 * singleSessionFlag - 5 * loncatHariFlag;
  };

  const tryPlace = (b: BebanItem, jp: number, hariValid: HariType[], usedDays: Set<HariType>): Placement | null => {
    type Cand = { hari: HariType; start: number; score: number };
    const candidates: Cand[] = [];
    const dayOrder = [...hariValid.filter(h => !usedDays.has(h)), ...hariValid.filter(h => usedDays.has(h))];
    for (const hari of dayOrder) {
      const list = slotKandidatByHari[hari as HariType];
      for (let start = 0; start + jp <= list.length; start++) {
        const block = list.slice(start, start + jp);
        if (!block.every((s: SlotKandidat, i: number) => i === 0 || s.urutan === block[i - 1].urutan + 1)) continue;
        if (!block.every((s: SlotKandidat) => isFree(b.kelasId, b.guruId, hari as HariType, s.id))) continue;
        candidates.push({ hari, start, score: scoreSlot(b, hari, block, usedDays) });
      }
    }
    if (!candidates.length) return null;
    candidates.sort((a, c) => c.score - a.score);
    const best = candidates[0];
    return { hari: best.hari, block: slotKandidatByHari[best.hari].slice(best.start, best.start + jp) };
  };

  const forwardCheckOk = (guru: string, hari: HariType, block: SlotKandidat[]): boolean => {
    for (const s of block) mark("__fc__", guru, hari, s.id);
    const remainingSlot = guruFreeSlotCount(guru);
    for (const s of block) unmark("__fc__", guru, hari, s.id);
    return (guruRemainingJP.get(guru) ?? 0) <= remainingSlot;
  };

  const placeSesi = (sesi: SesiUnit): Placement | null => {
    const hv = HARI_LIST.filter(h => !hariTidakFor(sesi.beban).includes(h)) as HariType[];
    const used = usedDaysByBeban.get(sesi.beban.id) ?? new Set<HariType>();
    const found = tryPlace(sesi.beban, sesi.jp, hv, used);
    if (!found) return null;
    if (!forwardCheckOk(sesi.beban.guruId, found.hari, found.block)) return null;
    for (const s of found.block) mark(sesi.beban.kelasId, sesi.beban.guruId, found.hari, s.id);
    ensureSet(usedDaysByBeban as unknown as Map<string, Set<string>>, sesi.beban.id).add(found.hari);
    guruRemainingJP.set(sesi.beban.guruId, (guruRemainingJP.get(sesi.beban.guruId) ?? sesi.jp) - sesi.jp);
    return found;
  };

  const releaseSesi = (ps: PlacedSesi) => {
    for (const s of ps.placement.block) unmark(ps.sesi.beban.kelasId, ps.sesi.beban.guruId, ps.placement.hari, s.id);
    usedDaysByBeban.get(ps.sesi.beban.id)?.delete(ps.placement.hari);
    guruRemainingJP.set(ps.sesi.beban.guruId, (guruRemainingJP.get(ps.sesi.beban.guruId) ?? 0) + ps.sesi.jp);
  };
  const reoccupySesi = (ps: PlacedSesi) => {
    for (const s of ps.placement.block) mark(ps.sesi.beban.kelasId, ps.sesi.beban.guruId, ps.placement.hari, s.id);
    ensureSet(usedDaysByBeban as unknown as Map<string, Set<string>>, ps.sesi.beban.id).add(ps.placement.hari);
    guruRemainingJP.set(ps.sesi.beban.guruId, (guruRemainingJP.get(ps.sesi.beban.guruId) ?? 0) - ps.sesi.jp);
  };

  return {
    guruMap, guruRemainingJP, kelasOccupied, guruOccupied, usedDaysByBeban,
    isFree, mark, unmark, isBlokTerpotong, guruFreeSlotCount, countValidBlocks,
    scoreSlot, tryPlace, forwardCheckOk, placeSesi, releaseSesi, reoccupySesi, hariTidakFor,
  };
}

// ─── PHASE 1A+1B+1C: domain calc → bottleneck sort → greedy assign (dynamic MRV) ─

function runGreedyPhase(
  state: SchedulerState, pendingInit: SesiUnit[], placed: PlacedSesi[],
): { gagal: SesiUnit[] } {
  let pending = [...pendingInit];
  const gagal: SesiUnit[] = [];

  const domainOf = (s: SesiUnit) => state.countValidBlocks(s.beban, s.jp);

  let domainCache = new Map<string, number>();
  const recomputeFor = (ids: Set<string>, all: SesiUnit[]) => {
    for (const s of all) if (ids.has(s.id) || !domainCache.has(s.id)) domainCache.set(s.id, domainOf(s));
  };
  recomputeFor(new Set(pending.map(s => s.id)), pending);

  const sortPending = () => {
    pending.sort((a, b) => {
      const da = domainCache.get(a.id) ?? 0, db = domainCache.get(b.id) ?? 0;
      if (da !== db) return da - db;
      if (b.jp !== a.jp) return b.jp - a.jp;
      const diffA = state.guruMap.get(a.beban.guruId)?.difficulty ?? 0;
      const diffB = state.guruMap.get(b.beban.guruId)?.difficulty ?? 0;
      if (diffB !== diffA) return diffB - diffA;
      const kgA = state.guruMap.get(a.beban.guruId)?.jumlahKelas ?? 0;
      const kgB = state.guruMap.get(b.beban.guruId)?.jumlahKelas ?? 0;
      if (kgB !== kgA) return kgB - kgA;
      const mcA = state.guruMap.get(a.beban.guruId)?.meetingCount ?? 0;
      const mcB = state.guruMap.get(b.beban.guruId)?.meetingCount ?? 0;
      if (mcB !== mcA) return mcB - mcA;
      const rjA = state.guruRemainingJP.get(a.beban.guruId) ?? 0;
      const rjB = state.guruRemainingJP.get(b.beban.guruId) ?? 0;
      return rjB - rjA;
    });
  };

  while (pending.length > 0) {
    sortPending();
    const sesi = pending.shift()!;
    const placement = state.placeSesi(sesi);

    if (placement) {
      placed.push({ sesi, placement });
      const affected = new Set(
        pending.filter(s => s.beban.guruId === sesi.beban.guruId || s.beban.kelasId === sesi.beban.kelasId).map(s => s.id),
      );
      recomputeFor(affected, pending);
    } else {
      gagal.push(sesi);
    }
  }

  return { gagal };
}

// ─── PHASE "Backtracking" ────────────────────────────────────────────────────

function runBacktrackPhase(
  state: SchedulerState, gagal: SesiUnit[], placed: PlacedSesi[],
): { gagal: SesiUnit[]; backtrackUsed: number } {
  let backtrackUsed = 0;
  const stillGagal: SesiUnit[] = [];

  for (const sesi of gagal) {
    let success = false;
    for (const bt of BACKTRACK_STEPS) {
      if (success || placed.length < bt) continue;
      const rollback = placed.splice(placed.length - bt, bt);
      for (const ps of rollback) state.releaseSesi(ps);
      const placement = state.placeSesi(sesi);
      if (placement) {
        placed.push({ sesi, placement });
        backtrackUsed++;
        for (const rb of rollback) {
          const p2 = state.placeSesi(rb.sesi);
          if (p2) placed.push({ sesi: rb.sesi, placement: p2 });
          else stillGagal.push(rb.sesi);
        }
        success = true;
      } else {
        for (const ps of rollback) state.reoccupySesi(ps);
        placed.push(...rollback);
      }
    }
    if (!success) stillGagal.push(sesi);
  }
  return { gagal: stillGagal, backtrackUsed };
}

// ─── PHASE "Relocate": single relocation / chain reassignment ────────────────
// Untuk tiap sesi GAGAL: cari slot yang valid dari sisi kelas & guru sesi ini,
// tapi sedang ditempati TEPAT SATU sesi lain ("blocker"). Kalau blocker itu
// bisa digeser ke slot lain yang kosong untuk dirinya sendiri, geser blocker,
// lalu taruh sesi gagal di slot yang baru kosong itu.
// Ini "single relocation" — jauh lebih murah dari Rescue/LNS: tidak
// menghancurkan banyak sesi sekaligus, cukup 1 slot spesifik + 1 kandidat geser.
// Kalau ada >1 blocker di satu slot, atau blocker itu tidak punya slot
// pengganti, kandidat itu dilewati (skip) — TIDAK brute-force ke kombinasi lain.

function runRelocatePhase(
  state: SchedulerState, gagalInit: SesiUnit[], placed: PlacedSesi[],
  slotKandidatByHari: Record<HariType, SlotKandidat[]>,
): { gagal: SesiUnit[]; relocateUsed: number } {
  let relocateUsed = 0;
  const stillGagal: SesiUnit[] = [];

  for (const sesi of gagalInit) {
    const b = sesi.beban;
    const usedDays = state.usedDaysByBeban.get(b.id) ?? new Set<HariType>();
    const hv = HARI_LIST.filter(h => !state.hariTidakFor(b).includes(h)) as HariType[];
    const dayOrder = [...hv.filter(h => !usedDays.has(h)), ...hv.filter(h => usedDays.has(h))] as HariType[];

    let success = false;
    for (const hari of dayOrder) {
      if (success) break;
      const list = slotKandidatByHari[hari];
      for (let start = 0; start + sesi.jp <= list.length; start++) {
        const block = list.slice(start, start + sesi.jp);
        if (!block.every((s, i) => i === 0 || s.urutan === block[i - 1].urutan + 1)) continue;
        if (block.every(s => state.isFree(b.kelasId, b.guruId, hari, s.id))) continue; // sudah kosong → harusnya sudah kepasang di greedy/backtrack

        // cari siapa saja yang menghalangi blok ini (dari sisi guru ATAU kelas sesi gagal)
        const blockers = new Set<PlacedSesi>();
        let hardBlocked = false;
        for (const s of block) {
          if (state.isFree(b.kelasId, b.guruId, hari, s.id)) continue;
          const occupants = placed.filter(ps =>
            ps.placement.hari === hari &&
            ps.placement.block.some(pb => pb.id === s.id) &&
            ps.sesi.beban.id !== b.id &&
            (ps.sesi.beban.guruId === b.guruId || ps.sesi.beban.kelasId === b.kelasId),
          );
          if (occupants.length === 0) { hardBlocked = true; break; } // diblokir slotTerkunci, bukan sesi yang bisa digeser
          for (const o of occupants) blockers.add(o);
        }
        if (hardBlocked || blockers.size !== 1) continue; // hanya tangani kasus single-blocker (murah & pasti)

        const blocker = [...blockers][0];
        const blockerIdx = placed.indexOf(blocker);
        if (blockerIdx === -1) continue;

        // lepas blocker, lalu cek slot jadi benar-benar kosong utk sesi gagal
        placed.splice(blockerIdx, 1);
        state.releaseSesi(blocker);

        const targetOk = block.every(s => state.isFree(b.kelasId, b.guruId, hari, s.id))
          && state.forwardCheckOk(b.guruId, hari, block);
        if (!targetOk) { state.reoccupySesi(blocker); placed.push(blocker); continue; }

        const targetPs: PlacedSesi = { sesi, placement: { hari, block } };
        state.reoccupySesi(targetPs);

        // cari slot pengganti utk blocker (slot lama sudah dipakai sesi gagal → tak akan kepilih lagi)
        const bkSesi = blocker.sesi;
        const bkUsedDays = new Set(state.usedDaysByBeban.get(bkSesi.beban.id) ?? new Set<HariType>());
        bkUsedDays.delete(blocker.placement.hari);
        const bkHv = HARI_LIST.filter(h => !state.hariTidakFor(bkSesi.beban).includes(h)) as HariType[];
        const altPlacement = state.tryPlace(bkSesi.beban, bkSesi.jp, bkHv, bkUsedDays);

        if (!altPlacement || !state.forwardCheckOk(bkSesi.beban.guruId, altPlacement.hari, altPlacement.block)) {
          // blocker tidak punya slot pengganti → batalkan semua, kembalikan seperti semula
          state.releaseSesi(targetPs);
          state.reoccupySesi(blocker);
          placed.push(blocker);
          continue;
        }

        const blockerNewPs: PlacedSesi = { sesi: bkSesi, placement: altPlacement };
        state.reoccupySesi(blockerNewPs);
        placed.push(targetPs, blockerNewPs);
        relocateUsed++;
        success = true;
        break;
      }
    }
    if (!success) stillGagal.push(sesi);
  }

  return { gagal: stillGagal, relocateUsed };
}

// ─── PHASE 3: Rescue Mode ─────────────────────────────────────────────────────

function runRescuePhase(
  state: SchedulerState, gagalInit: SesiUnit[], placed: PlacedSesi[],
): { gagal: SesiUnit[]; rollbackUsed: number } {
  if (gagalInit.length === 0 || gagalInit.length > RESCUE_MAX_GAGAL) return { gagal: gagalInit, rollbackUsed: 0 };

  let gagal = [...gagalInit];
  let rollbackUsed = 0;

  for (const step of RESCUE_ROLLBACK_STEPS) {
    if (gagal.length === 0) break;
    const n = Math.min(placed.length, step);
    if (n <= 0) break;
    const rollback = placed.splice(placed.length - n, n);
    for (const ps of rollback) state.releaseSesi(ps);
    rollbackUsed += n;

    const gagalUrut = [...gagal].sort((a, b) => {
      const da = state.countValidBlocks(a.beban, a.jp), db = state.countValidBlocks(b.beban, b.jp);
      if (da !== db) return da - db;
      if (b.jp !== a.jp) return b.jp - a.jp;
      const diffA = state.guruMap.get(a.beban.guruId)?.difficulty ?? 0;
      const diffB = state.guruMap.get(b.beban.guruId)?.difficulty ?? 0;
      return diffB - diffA;
    });

    const { gagal: gagal1 } = runGreedyPhase(state, gagalUrut, placed);
    const { gagal: gagal2 } = runGreedyPhase(state, rollback.map(r => r.sesi), placed);
    gagal = [...gagal1, ...gagal2];
    if (gagal.length === 0) break;
  }

  return { gagal, rollbackUsed };
}

// ─── PHASE 5: LNS ────────────────────────────────────────────────────────────

type LNSStrategy = "bottleneck" | "domainKecil" | "sesiGagal";

function runLNSRound(
  state: SchedulerState, placed: PlacedSesi[], gagal: SesiUnit[],
  destroyPercent: number, strategy: LNSStrategy,
  slotKandidatByHari: Record<HariType, SlotKandidat[]>,
): { placed: PlacedSesi[]; gagal: SesiUnit[]; backtrackUsed: number; rollbackUsed: number; relocateUsed: number } {
  const n = Math.max(1, Math.ceil(placed.length * destroyPercent));

  const scored = placed.map(ps => ({
    ps,
    difficulty: state.guruMap.get(ps.sesi.beban.guruId)?.difficulty ?? 0,
    domain: state.countValidBlocks(ps.sesi.beban, ps.sesi.jp),
  }));
  if (strategy === "bottleneck") scored.sort((a, b) => b.difficulty - a.difficulty);
  else if (strategy === "domainKecil") scored.sort((a, b) => a.domain - b.domain);
  else scored.sort(() => Math.random() - 0.5);

  const targets = new Set(scored.slice(0, n).map(s => s.ps));
  const remaining: PlacedSesi[] = [];
  const destroyed: SesiUnit[] = [];
  for (const ps of placed) {
    if (targets.has(ps)) { state.releaseSesi(ps); destroyed.push(ps.sesi); }
    else remaining.push(ps);
  }

  const toRepair = [...destroyed, ...gagal];
  const { gagal: gagalGreedy } = runGreedyPhase(state, toRepair, remaining);
  const { gagal: gagalBT, backtrackUsed } = runBacktrackPhase(state, gagalGreedy, remaining);
  const { gagal: gagalRL, relocateUsed } = runRelocatePhase(state, gagalBT, remaining, slotKandidatByHari);
  const { gagal: gagalFinal, rollbackUsed } = runRescuePhase(state, gagalRL, remaining);

  return { placed: remaining, gagal: gagalFinal, backtrackUsed, rollbackUsed, relocateUsed };
}

// ─── PHASE 7: Local Optimization ─────────────────────────────────────────────

function runLocalOptimization(state: SchedulerState, placed: PlacedSesi[]) {
  for (const ps of placed) {
    const otherDays = new Set(
      placed.filter(p => p.sesi.beban.id === ps.sesi.beban.id && p !== ps).map(p => p.placement.hari),
    );
    const hv = HARI_LIST.filter(h => !state.hariTidakFor(ps.sesi.beban).includes(h)) as HariType[];
    for (const s of ps.placement.block) state.unmark(ps.sesi.beban.kelasId, ps.sesi.beban.guruId, ps.placement.hari, s.id);
    const better = state.tryPlace(ps.sesi.beban, ps.sesi.jp, hv, otherDays);
    if (better && better.hari !== ps.placement.hari) {
      const scoreOld = state.scoreSlot(ps.sesi.beban, ps.placement.hari, ps.placement.block, otherDays);
      const scoreNew = state.scoreSlot(ps.sesi.beban, better.hari, better.block, otherDays);
      if (scoreNew > scoreOld + 50) {
        for (const s of better.block) state.mark(ps.sesi.beban.kelasId, ps.sesi.beban.guruId, better.hari, s.id);
        ps.placement = better;
        continue;
      }
    }
    for (const s of ps.placement.block) state.mark(ps.sesi.beban.kelasId, ps.sesi.beban.guruId, ps.placement.hari, s.id);
  }
}

// ─── Fitness ─────────────────────────────────────────────────────────────────

function evaluateSchedule(placed: PlacedSesi[], gagalCount: number, mapelHilangCount: number, semuaSlot: SlotRow[]): FitnessBreakdown {
  let gap = 0, singleSession = 0, loncatHari = 0;
  const isBlokTerpotong = (hari: HariType, block: SlotKandidat[]): boolean => {
    if (block.length <= 1) return false;
    const lo = block[0].urutan, hi = block[block.length - 1].urutan;
    return semuaSlot.some(s => s.hari === hari && s.jenisSlot === "NON_PELAJARAN" && s.urutan > lo && s.urutan < hi);
  };
  const byBeban = new Map<string, PlacedSesi[]>();
  for (const ps of placed) {
    if (!byBeban.has(ps.sesi.beban.id)) byBeban.set(ps.sesi.beban.id, []);
    byBeban.get(ps.sesi.beban.id)!.push(ps);
  }
  for (const list of byBeban.values()) {
    const hariUsed = list.map(p => HARI_INDEX[p.placement.hari] ?? 0).sort((a, b) => a - b);
    list.forEach((ps, i) => {
      if (ps.placement.block.length === 1) singleSession++;
      if (isBlokTerpotong(ps.placement.hari, ps.placement.block)) gap++;
      if (i > 0) {
        const dist = Math.abs((HARI_INDEX[ps.placement.hari] ?? 0) - hariUsed[i - 1]);
        if (dist > 2) loncatHari++;
      }
    });
  }
  const lubangGuru = 0;
  const bentrokGuru = 0, bentrokKelas = 0;
  const jpKurang = gagalCount, mapelHilang = mapelHilangCount;
  const fitness = 100000 * bentrokGuru + 100000 * bentrokKelas + 50000 * jpKurang + 5000 * mapelHilang
    + 500 * gap + 200 * singleSession + 100 * loncatHari + 50 * lubangGuru;
  return { fitness, bentrokGuru, bentrokKelas, jpKurang, mapelHilang, gap, singleSession, loncatHari, lubangGuru };
}

// ─── diagnosaGagal ────────────────────────────────────────────────────────────

function diagnosaGagal(
  kelasId: string, guruId: string, sesiList: number[], hariTidakArr: string[],
  slotKandidatByHari: Record<string, SlotKandidat[]>,
  kelasOccupied: Map<string, Set<string>>, guruOccupied: Map<string, Set<string>>,
  kelasBlocked: Map<string, Set<string>>, globalBlocked: Set<string>,
): { alasan: string; tipe: TipeAlasan; maxBlok: number } {
  const hv = HARI_LIST.filter(h => !hariTidakArr.includes(h));
  if (!hv.length) return { alasan: `Guru diblokir semua hari: ${hariTidakArr.join(", ")}`, tipe: "HARI_DIBLOKIR", maxBlok: 0 };

  let gFree = 0, kFree = 0, bothFree = 0, maxBlok = 0, run = 0;
  for (const hari of hv) {
    run = 0;
    for (const s of (slotKandidatByHari[hari as HariType] ?? [])) {
      const k = slotKey(hari, s.id);
      const gf = !guruOccupied.get(guruId)?.has(k);
      const kf = !globalBlocked.has(k) && !kelasBlocked.get(kelasId)?.has(k) && !kelasOccupied.get(kelasId)?.has(k);
      if (gf) gFree++;
      if (kf) kFree++;
      if (gf && kf) { bothFree++; run++; if (run > maxBlok) maxBlok = run; } else run = 0;
    }
  }

  const sm = Math.max(...sesiList);
  if (!gFree)    return { alasan: "Jadwal guru penuh — tidak ada slot kosong untuk guru ini",  tipe: "GURU_PENUH",  maxBlok: 0 };
  if (!kFree)    return { alasan: "Jadwal kelas penuh — tidak ada slot kosong untuk kelas ini", tipe: "KELAS_PENUH", maxBlok: 0 };
  if (!bothFree) return { alasan: `Guru dan kelas tidak pernah sama-sama kosong (guru: ${gFree} slot, kelas: ${kFree} slot)`, tipe: "KONFLIK_WAKTU", maxBlok: 0 };
  if (maxBlok < sm) return { alasan: `Perlu ${sm} JP berurutan, blok terpanjang tersisa hanya ${maxBlok} JP`, tipe: "BLOK_TIDAK_MUAT", maxBlok };
  return { alasan: `Tidak cukup hari berbeda untuk ${sesiList.length} sesi (${sesiList.join("+")} JP) — semua hari sudah terpakai`, tipe: "SESI_TIDAK_CUKUP", maxBlok };
}

// ─── buildResult ──────────────────────────────────────────────────────────────

function buildResult(
  placed: PlacedSesi[], gagalSesi: SesiUnit[], state: SchedulerState,
  periodeId: string, backtrackUsed: number, rollbackUsed: number,
  slotKandidatByHari: Record<HariType, SlotKandidat[]>, semuaSlot: SlotRow[],
  kelasBlocked: Map<string, Set<string>>, globalBlocked: Set<string>,
  relocateUsed = 0,
): PlanResult {
  const toInsert: InsertItem[] = [];
  for (const ps of placed) {
    for (const s of ps.placement.block) {
      toInsert.push({
        bebanMengajarId: ps.sesi.beban.id, guruId: ps.sesi.beban.guruId, kelasId: ps.sesi.beban.kelasId,
        hari: ps.placement.hari, slotWaktuId: s.id, periodeAkademikId: periodeId,
        isPecah11: ps.sesi.total === 2 && ps.sesi.jp === 1,
      });
    }
  }

  const gagal: GagalItem[] = [];
  let domainSum = 0;
  for (const sesi of gagalSesi) {
    const b = sesi.beban;
    domainSum += state.countValidBlocks(b, sesi.jp);
    const d = diagnosaGagal(b.kelasId, b.guruId, [sesi.jp], state.hariTidakFor(b), slotKandidatByHari, state.kelasOccupied, state.guruOccupied, kelasBlocked, globalBlocked);
    console.warn(`[scheduler] GAGAL — ${b.kelas.namaKelas} ${b.mapel.kodeMapel} sesi#${sesi.idx + 1}/${sesi.total} ${sesi.jp}JP (${b.guru.kodeGuru}): ${d.alasan}`);
    gagal.push({
      bebanMengajarId: b.id, guru: b.guru.nama, guruId: b.guruId, kelas: b.kelas.namaKelas, kelasId: b.kelasId,
      mapel: b.mapel.namaMapel, mapelId: b.mapelId, sesiJp: sesi.jp, alasan: d.alasan, tipeAlasan: d.tipe, maxBlokTersedia: d.maxBlok,
    });
  }

  const remainingJPByGuru = new Map<string, number>();
  for (const sesi of gagalSesi) remainingJPByGuru.set(sesi.beban.guruId, (remainingJPByGuru.get(sesi.beban.guruId) ?? 0) + sesi.jp);
  const remainingMapByGuru = new Map<string, number>();
  for (const m of state.guruMap.values()) {
    let domainFree = 0;
    for (const hari of HARI_LIST)
      for (const s of slotKandidatByHari[hari as HariType])
        if (!state.guruOccupied.get(m.guruId)?.has(slotKey(hari, s.id))) domainFree++;
    remainingMapByGuru.set(m.guruId, domainFree);
  }

  const guruStats: GuruStat[] = [...state.guruMap.values()].map(m => ({
    guruId: m.guruId, nama: m.nama, kodeGuru: m.kodeGuru, totalJP: m.totalJP, availableSlots: m.availableSlots,
    difficulty: Number.isFinite(m.difficulty) ? Math.round(m.difficulty * 1000) / 1000 : -1,
    meetingCount: m.meetingCount, jumlahKelas: m.jumlahKelas, hariTersedia: m.hariTersedia,
    remainingJP: remainingJPByGuru.get(m.guruId) ?? 0, remainingDomain: remainingMapByGuru.get(m.guruId) ?? 0,
    isBottleneck: false,
  }));

  const avgDomain = gagalSesi.length > 0 ? Math.round((domainSum / gagalSesi.length) * 100) / 100 : 0;
  const mapelHilangCount = new Set(gagalSesi.map(s => s.beban.id)).size;
  const fitness = evaluateSchedule(placed, gagal.length, mapelHilangCount, semuaSlot);
  const totalSesi = placed.length + gagalSesi.length;

  return { toInsert, gagal, totalSesi, guruStats, backtrackUsed, rollbackUsed, relocateUsed, avgDomain, placed, fitness };
}

// ─── loadSharedContext ────────────────────────────────────────────────────────

async function loadSharedContext(periodeId: string) {
  const [bebanList, semuaSlot, lockedJadwal, slotTerkunciList] = await Promise.all([
    prisma.bebanMengajar.findMany({ where: { periodeAkademikId: periodeId }, include: { guru: true, kelas: true, mapel: true } }),
    prisma.slotWaktu.findMany({ orderBy: [{ hari: "asc" }, { urutan: "asc" }] }),
    prisma.jadwal.findMany({ where: { periodeAkademikId: periodeId, isLocked: true } }),
    prisma.slotTerkunci.findMany({ where: { periodeAkademikId: periodeId }, include: { slotWaktuMulai: true } }),
  ]);

  const slotKandidatByHari: Record<HariType, SlotKandidat[]> = { SENIN: [], SELASA: [], RABU: [], KAMIS: [], JUMAT: [], SABTU: [] };
  for (const s of semuaSlot) if (s.jenisSlot === "PELAJARAN") slotKandidatByHari[s.hari as HariType].push({ id: s.id, urutan: s.urutan });

  const kelasBlocked = new Map<string, Set<string>>();
  const globalBlocked = new Set<string>();
  const guruBlockedFromEkskul = new Map<string, Set<string>>();

  const ekskulIds = [...new Set(slotTerkunciList.map((s: { ekstrakurikulerId: string | null }) => s.ekstrakurikulerId).filter((id: string | null): id is string => !!id))];
  if (ekskulIds.length > 0) {
    const rows = await prisma.ekstrakurikuler.findMany({ where: { id: { in: ekskulIds } }, select: { id: true, pembinaId: true } });
    const pembinaMap = new Map(rows.map((r: { id: string; pembinaId: string | null }) => [r.id, r.pembinaId] as [string, string | null]));
    for (const st of slotTerkunciList) {
      if (!st.ekstrakurikulerId) continue;
      const pid = pembinaMap.get(st.ekstrakurikulerId);
      if (!pid) continue;
      const hari = st.hari as HariType;
      const slots = semuaSlot.filter((s: SlotRow) => s.hari === hari && s.urutan >= st.slotWaktuMulai.urutan && s.urutan < st.slotWaktuMulai.urutan + st.durasiSlot);
      for (const s of slots) ensureSet(guruBlockedFromEkskul, pid as string).add(slotKey(hari, s.id));
    }
  }
  for (const st of slotTerkunciList) {
    const hari = st.hari as HariType;
    const slots = semuaSlot.filter((s: SlotRow) => s.hari === hari && s.urutan >= st.slotWaktuMulai.urutan && s.urutan < st.slotWaktuMulai.urutan + st.durasiSlot);
    for (const s of slots) {
      const k = slotKey(hari, s.id);
      if (st.kelasId) ensureSet(kelasBlocked, st.kelasId as string).add(k); else globalBlocked.add(k);
    }
  }

  const kelasIds = [...new Set((bebanList as BebanItem[]).map(b => b.kelasId))];
  const efektifMapelMap = await getEfektifMapelIdsBatch(kelasIds);
  const filteredBeban = (bebanList as BebanItem[]).filter(b => { const e = efektifMapelMap.get(b.kelasId); return !e || e.has(b.mapelId); });

  return { bebanList, filteredBeban, semuaSlot, lockedJadwal, slotKandidatByHari, kelasBlocked, globalBlocked, guruBlockedFromEkskul };
}

// ─── Bottleneck tracking lintas-phase ─────────────────────────────────────────

const guruGagalHistory = new Map<string, Set<string>>();
const guruPhaseHistory = new Map<string, Set<GenerateMode>>();

function recordPhaseRun(periodeId: string, mode: GenerateMode, gagal: GagalItem[]) {
  if (!guruGagalHistory.has(periodeId)) guruGagalHistory.set(periodeId, new Set());
  if (!guruPhaseHistory.has(periodeId)) guruPhaseHistory.set(periodeId, new Set());
  guruPhaseHistory.get(periodeId)!.add(mode);
  const gagalGuruSet = new Set(gagal.map(g => g.guruId).filter(Boolean));
  const history = guruGagalHistory.get(periodeId)!;
  if (history.size === 0) { for (const gid of gagalGuruSet) history.add(gid); }
  else { for (const gid of [...history]) if (!gagalGuruSet.has(gid)) history.delete(gid); }
}
function getBottleneckGuruIds(periodeId: string, totalPhasesPlanned: number): string[] {
  const phasesRun = guruPhaseHistory.get(periodeId)?.size ?? 0;
  if (phasesRun < totalPhasesPlanned) return [];
  return [...(guruGagalHistory.get(periodeId) ?? [])];
}
function resetBottleneckTracking(periodeId: string) {
  guruGagalHistory.delete(periodeId);
  guruPhaseHistory.delete(periodeId);
}

const lastFailedCountByPeriode = new Map<string, number>();

// ─── PHASE 0: Feasibility ─────────────────────────────────────────────────────

function checkFeasibility(bebanList: BebanItem[], semuaSlot: SlotRow[]) {
  const slotPelajaran = semuaSlot.filter(s => s.jenisSlot === "PELAJARAN");
  const jumlahSlotJP = slotPelajaran.length;
  const jumlahKelas = new Set(bebanList.map(b => b.kelasId)).size;
  const totalKapasitas = jumlahSlotJP * Math.max(1, jumlahKelas);
  const totalKebutuhanJP = bebanList.reduce((sum, b) => sum + b.jp, 0);
  return { feasible: totalKebutuhanJP <= totalKapasitas, jumlahSlotJP, jumlahKelas, totalKapasitas, totalKebutuhanJP };
}

// ─── PHASE 6: buildApprovalCases ─────────────────────────────────────────────

function buildApprovalCases(gagal: GagalItem[], filteredBeban: BebanItem[]): ApprovalCase[] {
  const bebanById = new Map(filteredBeban.map(b => [b.id, b]));
  const grouped = new Map<string, GagalItem[]>();
  for (const g of gagal) { if (!grouped.has(g.bebanMengajarId)) grouped.set(g.bebanMengajarId, []); grouped.get(g.bebanMengajarId)!.push(g); }

  const cases: ApprovalCase[] = [];
  for (const [bebanId, items] of grouped) {
    const b = bebanById.get(bebanId);
    if (!b) continue;
    const opsi: ApprovalOptionKind[] = [];
    if (b.jp === 2) opsi.push("SPLIT_211");
    if (Array.isArray(b.guru.hariTidakTersedia) && (b.guru.hariTidakTersedia as string[]).length > 0) opsi.push("TAMBAH_HARI_GURU");
    if (b.mapel.jumlahPertemuanMaks < 3) opsi.push("UBAH_MAKS_SESI", "TAMBAH_PERTEMUAN");
    opsi.push("GAP_TAMBAHAN");

    cases.push({
      bebanMengajarId: bebanId, mapel: b.mapel.namaMapel, mapelId: b.mapelId,
      kelas: b.kelas.namaKelas, kelasId: b.kelasId, guru: b.guru.nama, guruId: b.guruId,
      jp: b.jp, splitIdeal: items.map(i => i.sesiJp), status: items[0].alasan || "Tidak ditemukan slot.", opsi,
    });
  }
  return cases;
}

// ─── generateJadwal ──────────────────────────────────────────────────────────

export async function generateJadwal(periodeId: string, mode: GenerateMode = "normal"): Promise<GenerateResult> {
  const slotSebelum = await prisma.jadwal.count({ where: { periodeAkademikId: periodeId } });
  const { bebanList, filteredBeban, semuaSlot, lockedJadwal, slotKandidatByHari, kelasBlocked, globalBlocked, guruBlockedFromEkskul } = await loadSharedContext(periodeId);

  if (mode === "normal") { resetBottleneckTracking(periodeId); lastFailedCountByPeriode.delete(periodeId); }

  const feas = checkFeasibility(bebanList, semuaSlot);
  const blockBottlenecks = computeBlockBottlenecks(filteredBeban, slotKandidatByHari);
  if (blockBottlenecks.length > 0) {
    for (const bn of blockBottlenecks) console.warn(`[scheduler] ${bn.status} — ${bn.label} blok ${bn.blockSize}JP: butuh ${bn.needBlock}, tersedia ${bn.availableBlock}`);
  }
  if (!feas.feasible) {
    console.error(`[scheduler] GAGAL PHASE 0: kebutuhan ${feas.totalKebutuhanJP} JP > kapasitas ${feas.totalKapasitas}`);
    return {
      slotSebelum, slotSesudah: slotSebelum, lockedDipertahankan: lockedJadwal.length,
      totalSesi: 0, berhasil: 0,
      gagal: [{ bebanMengajarId: "", guru: "–", guruId: "", kelas: "–", kelasId: "", mapel: "–", mapelId: "", sesiJp: 0,
        alasan: `Kebutuhan JP (${feas.totalKebutuhanJP}) melebihi kapasitas slot (${feas.jumlahSlotJP} slot JP × ${feas.jumlahKelas} kelas = ${feas.totalKapasitas})`,
        tipeAlasan: "TIDAK_DIKETAHUI", maxBlokTersedia: 0 }],
      totalBebanAwal: bebanList.length, totalBebanDifilter: 0, runsUsed: 0, mode,
      guruStats: [], bottleneckGuruIds: [], rescueModeUsed: false,
      phaseStats: { mode, success: 0, failed: 1, backtrackUsed: 0, rollbackUsed: 0, relocateUsed: 0, avgDomain: 0, ruleRelaxed: [], lnsDestroyPercent: 0, lnsRoundsUsed: 0, fitness: 100000 },
      blockBottlenecks,
    };
  }

  const approvalByBebanId = new Map<string, Set<ApprovalOptionKind>>();
  const estimateDomain = (slotKandidatByHari_: typeof slotKandidatByHari) => (b: BebanItem, jp: number) => {
    let n = 0;
    for (const hari of HARI_LIST) {
      if (hariTidak(b).includes(hari)) continue;
      const list = slotKandidatByHari_[hari as HariType];
      for (let start = 0; start + jp <= list.length; start++) {
        const block = list.slice(start, start + jp);
        if (block.every((s: SlotKandidat, i: number) => i === 0 || s.urutan === block[i - 1].urutan + 1)) n++;
      }
    }
    return n;
  };

  if (mode === "normal") {
    let best: PlanResult | null = null;
    let runsUsed = 0;
    for (let run = 0; run < MAX_RUNS_ADMIN; run++) {
      runsUsed++;
      const state = createSchedulerState(filteredBeban, slotKandidatByHari, semuaSlot, lockedJadwal, kelasBlocked, globalBlocked, guruBlockedFromEkskul, approvalByBebanId);
      const sesiUnits = buildSesiUnits(filteredBeban, ADMIN_SPLIT, ADMIN_FORBIDDEN, approvalByBebanId, estimateDomain(slotKandidatByHari));
      const placed: PlacedSesi[] = [];
      const { gagal: gagalGreedy } = runGreedyPhase(state, sesiUnits, placed);
      const { gagal: gagalBT, backtrackUsed } = runBacktrackPhase(state, gagalGreedy, placed);
      const { gagal: gagalRL, relocateUsed } = runRelocatePhase(state, gagalBT, placed, slotKandidatByHari);
      const { gagal: gagalFinal, rollbackUsed } = runRescuePhase(state, gagalRL, placed);
      runLocalOptimization(state, placed);
      const result = buildResult(placed, gagalFinal, state, periodeId, backtrackUsed, rollbackUsed, slotKandidatByHari, semuaSlot, kelasBlocked, globalBlocked, relocateUsed);
      if (!best || result.fitness.fitness < best.fitness.fitness) best = result;
      if (result.gagal.length === 0) break;
    }
    lastFailedCountByPeriode.set(periodeId, best!.gagal.length);
    const r = await persistAndReturn(periodeId, mode, best!, slotSebelum, lockedJadwal.length, bebanList, filteredBeban, runsUsed, 0, 0, null);
    r.blockBottlenecks = blockBottlenecks;
    return r;
  }

  const referenceFailedCount = lastFailedCountByPeriode.get(periodeId) ?? Number.POSITIVE_INFINITY;

  let plan: { best: PlanResult; runsUsed: number; lnsDestroyPercent: number; lnsRounds: number };

  if (mode === "autofix") {
    let best: PlanResult | null = null;
    let runsUsed = 0;
    for (let run = 0; run < MAX_RUNS_ADMIN; run++) {
      runsUsed++;
      const state = createSchedulerState(filteredBeban, slotKandidatByHari, semuaSlot, lockedJadwal, kelasBlocked, globalBlocked, guruBlockedFromEkskul, approvalByBebanId);
      const sesiUnits = buildSesiUnits(filteredBeban, AUTOFIX_SPLIT, AUTOFIX_FORBIDDEN, approvalByBebanId, estimateDomain(slotKandidatByHari));
      const placed: PlacedSesi[] = [];
      const { gagal: gagalGreedy } = runGreedyPhase(state, sesiUnits, placed);
      const { gagal: gagalBT, backtrackUsed } = runBacktrackPhase(state, gagalGreedy, placed);
      const { gagal: gagalRL, relocateUsed } = runRelocatePhase(state, gagalBT, placed, slotKandidatByHari);
      const { gagal: gagalFinal, rollbackUsed } = runRescuePhase(state, gagalRL, placed);
      runLocalOptimization(state, placed);
      const result = buildResult(placed, gagalFinal, state, periodeId, backtrackUsed, rollbackUsed, slotKandidatByHari, semuaSlot, kelasBlocked, globalBlocked, relocateUsed);
      if (!best || result.fitness.fitness < best.fitness.fitness) best = result;
      if (result.gagal.length === 0) break;
    }
    plan = { best: best!, runsUsed, lnsDestroyPercent: 0, lnsRounds: 0 };
  } else if (mode === "phase3") {
    let best: PlanResult | null = null;
    let runsUsed = 0;
    for (let run = 0; run < MAX_RUNS_ADMIN; run++) {
      runsUsed++;
      const state = createSchedulerState(filteredBeban, slotKandidatByHari, semuaSlot, lockedJadwal, kelasBlocked, globalBlocked, guruBlockedFromEkskul, approvalByBebanId, 0.4);
      const sesiUnits = buildSesiUnits(filteredBeban, EMERGENCY_SPLIT, EMERGENCY_FORBIDDEN, approvalByBebanId, estimateDomain(slotKandidatByHari));
      const placed: PlacedSesi[] = [];
      const { gagal: gagalGreedy } = runGreedyPhase(state, sesiUnits, placed);
      const { gagal: gagalBT, backtrackUsed } = runBacktrackPhase(state, gagalGreedy, placed);
      const { gagal: gagalFinal, relocateUsed } = runRelocatePhase(state, gagalBT, placed, slotKandidatByHari);
      runLocalOptimization(state, placed);
      const result = buildResult(placed, gagalFinal, state, periodeId, backtrackUsed, 0, slotKandidatByHari, semuaSlot, kelasBlocked, globalBlocked, relocateUsed);
      if (!best || result.fitness.fitness < best.fitness.fitness) best = result;
      if (result.gagal.length === 0) break;
    }

    let lnsRounds = 0;
    let lnsDestroyPercent = 0;
    if (best!.gagal.length > 0) {
      const bebanById = new Map(filteredBeban.map(b => [b.id, b]));
      for (const destroyPercent of LNS_DESTROY_STEPS) {
        for (let round = 0; round < MAX_LNS_ROUNDS_PER_STEP; round++) {
          lnsRounds++;
          const state = createSchedulerState(filteredBeban, slotKandidatByHari, semuaSlot, lockedJadwal, kelasBlocked, globalBlocked, guruBlockedFromEkskul, approvalByBebanId, 0.4);
          for (const ps of best!.placed) {
            for (const s of ps.placement.block) state.mark(ps.sesi.beban.kelasId, ps.sesi.beban.guruId, ps.placement.hari, s.id);
            ensureSet(state.usedDaysByBeban as unknown as Map<string, Set<string>>, ps.sesi.beban.id).add(ps.placement.hari);
            state.guruRemainingJP.set(ps.sesi.beban.guruId, (state.guruRemainingJP.get(ps.sesi.beban.guruId) ?? ps.sesi.jp) - ps.sesi.jp);
          }
          const gagalSesiUnits = best!.gagal.map(g => {
            const b = bebanById.get(g.bebanMengajarId)!;
            return { id: `${g.bebanMengajarId}#gagal`, beban: b, jp: g.sesiJp, idx: 0, total: 1 } as SesiUnit;
          });
          const strategy: LNSStrategy = round % 3 === 0 ? "bottleneck" : round % 3 === 1 ? "domainKecil" : "sesiGagal";
          const lns = runLNSRound(state, [...best!.placed], gagalSesiUnits, destroyPercent, strategy, slotKandidatByHari);
          runLocalOptimization(state, lns.placed);
          const result = buildResult(lns.placed, lns.gagal, state, periodeId, lns.backtrackUsed, lns.rollbackUsed, slotKandidatByHari, semuaSlot, kelasBlocked, globalBlocked, lns.relocateUsed);
          if (result.fitness.fitness < best!.fitness.fitness) { best = result; lnsDestroyPercent = destroyPercent; }
          if (best!.gagal.length === 0) break;
        }
        if (best!.gagal.length === 0) break;
      }
    }
    plan = { best: best!, runsUsed, lnsDestroyPercent, lnsRounds };
  } else {
    plan = { best: { toInsert: [], gagal: [], totalSesi: 0, guruStats: [], backtrackUsed: 0, rollbackUsed: 0, relocateUsed: 0, avgDomain: 0, placed: [], fitness: evaluateSchedule([], 0, 0, semuaSlot) }, runsUsed: 0, lnsDestroyPercent: 0, lnsRounds: 0 };
  }

  // ── RULE MONOTONIC ──
  if (plan.best.gagal.length > referenceFailedCount) {
    console.warn(`[scheduler] RULE MONOTONIC: ${mode} menghasilkan ${plan.best.gagal.length} gagal (lebih buruk dari ${referenceFailedCount}) — DISCARD.`);
    const slotSesudah = await prisma.jadwal.count({ where: { periodeAkademikId: periodeId } });
    return {
      slotSebelum, slotSesudah, lockedDipertahankan: lockedJadwal.length,
      totalSesi: plan.best.totalSesi, berhasil: plan.best.totalSesi - plan.best.gagal.length, gagal: plan.best.gagal,
      totalBebanAwal: bebanList.length, totalBebanDifilter: bebanList.length - filteredBeban.length,
      runsUsed: plan.runsUsed, mode, guruStats: plan.best.guruStats, bottleneckGuruIds: [], rescueModeUsed: false,
      phaseStats: { mode, success: 0, failed: plan.best.gagal.length, backtrackUsed: plan.best.backtrackUsed, rollbackUsed: plan.best.rollbackUsed, relocateUsed: plan.best.relocateUsed, avgDomain: plan.best.avgDomain, ruleRelaxed: [], lnsDestroyPercent: plan.lnsDestroyPercent, lnsRoundsUsed: plan.lnsRounds, fitness: plan.best.fitness.fitness },
      approvalCases: buildApprovalCases(plan.best.gagal, filteredBeban), blockBottlenecks,
      discarded: true,
      discardNote: `Hasil ${GENERATE_MODE_LABEL[mode]} (${plan.best.gagal.length} gagal) lebih buruk dari sebelumnya (${referenceFailedCount} gagal) — jadwal TIDAK diubah sesuai RULE MONOTONIC.`,
    };
  }

  lastFailedCountByPeriode.set(periodeId, plan.best.gagal.length);
  const r = await persistAndReturn(periodeId, mode, plan.best, slotSebelum, lockedJadwal.length, bebanList, filteredBeban, plan.runsUsed, plan.lnsDestroyPercent, plan.lnsRounds, null);
  r.blockBottlenecks = blockBottlenecks;
  return r;
}

async function persistAndReturn(
  periodeId: string, mode: GenerateMode, best: PlanResult,
  slotSebelum: number, lockedDipertahankan: number,
  bebanList: BebanItem[], filteredBeban: BebanItem[], runsUsed: number,
  lnsDestroyPercent: number, lnsRoundsUsed: number, ruleRelaxedOverride: ApprovalOptionKind[] | null,
): Promise<GenerateResult> {
  const { toInsert, gagal, totalSesi, guruStats, backtrackUsed, rollbackUsed, relocateUsed, avgDomain, fitness } = best;

  await prisma.jadwal.deleteMany({ where: { periodeAkademikId: periodeId, isLocked: false } });
  if (toInsert.length > 0) await prisma.jadwal.createMany({ data: toInsert, skipDuplicates: true });

  console.info(`[scheduler] Mode=${mode} Done: ${runsUsed} run/round, ${gagal.length} gagal dari ${filteredBeban.length} beban, fitness=${fitness.fitness}.`);

  recordPhaseRun(periodeId, mode, gagal);
  const bottleneckGuruIds = getBottleneckGuruIds(periodeId, 3);
  const bottleneckSet = new Set(bottleneckGuruIds);
  const guruStatsFinal = guruStats.map(g => ({ ...g, isBottleneck: bottleneckSet.has(g.guruId) }));

  const phaseStats: PhaseStat = {
    mode, success: totalSesi - gagal.length, failed: gagal.length,
    backtrackUsed, rollbackUsed, relocateUsed, avgDomain, ruleRelaxed: ruleRelaxedOverride ?? [],
    lnsDestroyPercent, lnsRoundsUsed, fitness: fitness.fitness,
  };

  let approvalCases: ApprovalCase[] | undefined;
  if ((mode === "phase3" || mode === "approval") && gagal.length > 0) approvalCases = buildApprovalCases(gagal, filteredBeban);

  const slotSesudah = await prisma.jadwal.count({ where: { periodeAkademikId: periodeId } });

  return {
    slotSebelum, slotSesudah, lockedDipertahankan, totalSesi, berhasil: totalSesi - gagal.length, gagal,
    totalBebanAwal: bebanList.length, totalBebanDifilter: bebanList.length - filteredBeban.length,
    runsUsed, mode, guruStats: guruStatsFinal, bottleneckGuruIds, rescueModeUsed: rollbackUsed > 0,
    phaseStats, approvalCases,
  };
}

// ─── PHASE 6: Consent Mode ────────────────────────────────────────────────────

export async function runApprovalMode(periodeId: string, decisions: ApprovalDecision[]): Promise<GenerateResult> {
  const slotSebelum = await prisma.jadwal.count({ where: { periodeAkademikId: periodeId } });
  const { bebanList, filteredBeban, semuaSlot, lockedJadwal, slotKandidatByHari, kelasBlocked, globalBlocked, guruBlockedFromEkskul } = await loadSharedContext(periodeId);

  const approvalByBebanId = new Map<string, Set<ApprovalOptionKind>>();
  const allRelaxed = new Set<ApprovalOptionKind>();
  for (const d of decisions) {
    approvalByBebanId.set(d.bebanMengajarId, new Set(d.opsiDisetujui));
    for (const o of d.opsiDisetujui) allRelaxed.add(o);
  }

  const existingJadwal = await prisma.jadwal.findMany({
    where: { periodeAkademikId: periodeId, isLocked: false },
    select: { bebanMengajarId: true, hari: true, slotWaktuId: true },
  });
  const bebanById = new Map(filteredBeban.map(b => [b.id, b]));
  const slotById = new Map<string, SlotKandidat>(semuaSlot.map((s: SlotRow) => [s.id, { id: s.id, urutan: s.urutan }]));

  const byBeban = new Map<string, { hari: HariType; urutan: number; slotId: string }[]>();
  for (const row of existingJadwal) {
    const slot = slotById.get(row.slotWaktuId);
    if (!slot) continue;
    if (!byBeban.has(row.bebanMengajarId)) byBeban.set(row.bebanMengajarId, []);
    byBeban.get(row.bebanMengajarId)!.push({ hari: row.hari as HariType, urutan: slot.urutan, slotId: slot.id });
  }

  const placed: PlacedSesi[] = [];
  const placedBebanIds = new Set<string>();
  for (const [bebanId, rows] of byBeban) {
    const b = bebanById.get(bebanId);
    if (!b) continue;
    const byHari = new Map<HariType, { urutan: number; slotId: string }[]>();
    for (const r of rows) { if (!byHari.has(r.hari)) byHari.set(r.hari, []); byHari.get(r.hari)!.push({ urutan: r.urutan, slotId: r.slotId }); }
    let idx = 0;
    const placements: Placement[] = [];
    for (const [hari, list] of byHari) {
      list.sort((a, c) => a.urutan - c.urutan);
      let run: { urutan: number; slotId: string }[] = [];
      const flush = () => { if (run.length) { placements.push({ hari, block: run.map(r => ({ id: r.slotId, urutan: r.urutan })) }); run = []; } };
      for (const item of list) { if (run.length && item.urutan !== run[run.length - 1].urutan + 1) flush(); run.push(item); }
      flush();
    }
    const totalJP = placements.reduce((a, p) => a + p.block.length, 0);
    if (totalJP >= b.jp) {
      for (const p of placements) placed.push({ sesi: { id: `${bebanId}#${idx++}`, beban: b, jp: p.block.length, idx, total: placements.length }, placement: p });
      placedBebanIds.add(bebanId);
    }
  }

  let gagalSesiUnits: SesiUnit[] = [];
  for (const b of filteredBeban) {
    if (!placedBebanIds.has(b.id)) gagalSesiUnits.push({ id: `${b.id}#0`, beban: b, jp: b.jp, idx: 0, total: 1 });
  }

  const approvedIds = new Set(decisions.map(d => d.bebanMengajarId));
  const untouchedGagal = gagalSesiUnits.filter(s => !approvedIds.has(s.beban.id));

  // PENTING: untuk sesi yang di-approve, WAJIB dibangun ulang lewat pickBestSplitForBeban
  // (bukan dipakai mentah sebagai satu blok b.jp) — supaya opsi SPLIT_211 / UBAH_MAKS_SESI /
  // TAMBAH_PERTEMUAN / GAP_TAMBAHAN yang disetujui operator BENAR-BENAR mengubah pola sesi.
  // Sebelumnya bug ini bikin semua opsi relaksasi split tidak berefek sama sekali di Consent Mode.
  const estimateDomainApproval = (b: BebanItem, jp: number): number => {
    let n = 0;
    for (const hari of HARI_LIST) {
      if (hariTidak(b).includes(hari)) continue;
      const list = slotKandidatByHari[hari as HariType];
      for (let start = 0; start + jp <= list.length; start++) {
        const block = list.slice(start, start + jp);
        if (block.every((s: SlotKandidat, i: number) => i === 0 || s.urutan === block[i - 1].urutan + 1)) n++;
      }
    }
    return n;
  };
  const toRepair: SesiUnit[] = [];
  for (const b of filteredBeban) {
    if (placedBebanIds.has(b.id) || !approvedIds.has(b.id)) continue;
    const approved = approvalByBebanId.get(b.id);
    const jpMaksEff = approved?.has("GAP_TAMBAHAN") ? b.mapel.jpMaksBerurutan + 1 : b.mapel.jpMaksBerurutan;
    const maxSesiEff = (approved?.has("UBAH_MAKS_SESI") || approved?.has("TAMBAH_PERTEMUAN"))
      ? Math.max(3, b.mapel.jumlahPertemuanMaks + 1) : b.mapel.jumlahPertemuanMaks;
    const pola = pickBestSplitForBeban(b, EMERGENCY_SPLIT, EMERGENCY_FORBIDDEN, jpMaksEff, maxSesiEff, estimateDomainApproval, approved?.has("SPLIT_211"));
    pola.forEach((jp, idx) => toRepair.push({ id: `${b.id}#${idx}`, beban: b, jp, idx, total: pola.length }));
  }

  let best: PlanResult | null = null;
  let runsUsed = 0;

  for (let round = 0; round < 6; round++) {
    runsUsed++;
    const state = createSchedulerState(filteredBeban, slotKandidatByHari, semuaSlot, lockedJadwal, kelasBlocked, globalBlocked, guruBlockedFromEkskul, approvalByBebanId);
    for (const ps of placed) {
      for (const s of ps.placement.block) state.mark(ps.sesi.beban.kelasId, ps.sesi.beban.guruId, ps.placement.hari, s.id);
      ensureSet(state.usedDaysByBeban as unknown as Map<string, Set<string>>, ps.sesi.beban.id).add(ps.placement.hari);
      state.guruRemainingJP.set(ps.sesi.beban.guruId, (state.guruRemainingJP.get(ps.sesi.beban.guruId) ?? ps.sesi.jp) - ps.sesi.jp);
    }

    const roundPlaced = [...placed];
    const { gagal: gagalGreedy } = runGreedyPhase(state, toRepair, roundPlaced);
    const { gagal: gagalBT } = runBacktrackPhase(state, gagalGreedy, roundPlaced);
    const { gagal: gagalRL, relocateUsed } = runRelocatePhase(state, gagalBT, roundPlaced, slotKandidatByHari);
    const { gagal: gagalFinal, rollbackUsed } = runRescuePhase(state, gagalRL, roundPlaced);
    const roundGagal = [...gagalFinal, ...untouchedGagal];

    runLocalOptimization(state, roundPlaced);
    const result = buildResult(roundPlaced, roundGagal, state, periodeId, 0, rollbackUsed, slotKandidatByHari, semuaSlot, kelasBlocked, globalBlocked, relocateUsed);

    if (!best || result.fitness.fitness < best.fitness.fitness) best = result;
    if (result.gagal.length === untouchedGagal.length) break;
  }

  const referenceFailedCount = lastFailedCountByPeriode.get(periodeId) ?? Number.POSITIVE_INFINITY;
  if (best!.gagal.length > referenceFailedCount) {
    const slotSesudah = await prisma.jadwal.count({ where: { periodeAkademikId: periodeId } });
    return {
      slotSebelum, slotSesudah, lockedDipertahankan: lockedJadwal.length,
      totalSesi: best!.totalSesi, berhasil: best!.totalSesi - best!.gagal.length, gagal: best!.gagal,
      totalBebanAwal: bebanList.length, totalBebanDifilter: bebanList.length - filteredBeban.length,
      runsUsed, mode: "approval", guruStats: best!.guruStats, bottleneckGuruIds: [], rescueModeUsed: false,
      phaseStats: { mode: "approval", success: 0, failed: best!.gagal.length, backtrackUsed: 0, rollbackUsed: best!.rollbackUsed, relocateUsed: best!.relocateUsed, avgDomain: best!.avgDomain, ruleRelaxed: [...allRelaxed], lnsDestroyPercent: 0, lnsRoundsUsed: runsUsed, fitness: best!.fitness.fitness },
      approvalCases: buildApprovalCases(best!.gagal, filteredBeban),
      discarded: true,
      discardNote: `Consent Mode menghasilkan ${best!.gagal.length} gagal (lebih buruk dari ${referenceFailedCount} sebelumnya) — jadwal TIDAK diubah.`,
    };
  }

  lastFailedCountByPeriode.set(periodeId, best!.gagal.length);
  return persistAndReturn(periodeId, "approval", best!, slotSebelum, lockedJadwal.length, bebanList, filteredBeban, runsUsed, 0, runsUsed, [...allRelaxed]);
}

// ─── generateWithLimitedBacktrack (legacy) ───────────────────────────────────
export async function generateWithLimitedBacktrack(periodeId: string, _gagalBebanIds: string[]): Promise<GenerateResult> {
  return generateJadwal(periodeId, "autofix");
}
