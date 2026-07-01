"use server";

import { prisma } from "@/lib/prisma";
import { generateJadwal, runApprovalMode } from "@/lib/scheduler";
import { revalidatePath } from "next/cache";
import type { GenerateResult, ApprovalDecision } from "@/lib/scheduler";

export type GenerateActionState = {
  result?: GenerateResult;
  error?:  string;
};

async function getPeriodeAktif() {
  return prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
}

function revalidateAll() {
  revalidatePath("/admin/penjadwalan/generate");
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
}

async function getBebanCount(periodeId: string) {
  return prisma.bebanMengajar.count({ where: { periodeAkademikId: periodeId } });
}

// ── PHASE 1: ADMIN RULE ───────────────────────────────────────────────────────
export async function runPhaseAdmin(
  _prev: GenerateActionState
): Promise<GenerateActionState> {
  const periode = await getPeriodeAktif();
  if (!periode) return { error: "Belum ada Periode Akademik aktif." };
  if (await getBebanCount(periode.id) === 0)
    return { error: "Belum ada data Beban Mengajar untuk periode ini." };

  try {
    const result = await generateJadwal(periode.id, "normal");
    revalidateAll();
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menjalankan Phase 1 (Admin Rule)" };
  }
}

// ── PHASE 2: AUTOFIX ──────────────────────────────────────────────────────────
export async function runPhaseAutofix(
  _prev: GenerateActionState
): Promise<GenerateActionState> {
  const periode = await getPeriodeAktif();
  if (!periode) return { error: "Belum ada Periode Akademik aktif." };

  try {
    const result = await generateJadwal(periode.id, "autofix");
    revalidateAll();
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menjalankan Phase 2 (Autofix)" };
  }
}

// ── PHASE 3: RESCUE ───────────────────────────────────────────────────────────
export async function runPhaseRescue(
  _prev: GenerateActionState
): Promise<GenerateActionState> {
  const periode = await getPeriodeAktif();
  if (!periode) return { error: "Belum ada Periode Akademik aktif." };

  try {
    const result = await generateJadwal(periode.id, "autofix");
    revalidateAll();
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menjalankan Phase 3 (Rescue)" };
  }
}

// ── PHASE 4: EMERGENCY ────────────────────────────────────────────────────────
export async function runPhaseEmergency(
  _prev: GenerateActionState
): Promise<GenerateActionState> {
  const periode = await getPeriodeAktif();
  if (!periode) return { error: "Belum ada Periode Akademik aktif." };

  try {
    const result = await generateJadwal(periode.id, "phase3");
    revalidateAll();
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menjalankan Phase 4 (Emergency)" };
  }
}

// ── PHASE 5: LNS (Large Neighborhood Search) ─────────────────────────────────
export async function runPhaseLns(
  _prev: GenerateActionState
): Promise<GenerateActionState> {
  const periode = await getPeriodeAktif();
  if (!periode) return { error: "Belum ada Periode Akademik aktif." };

  try {
    const result = await generateJadwal(periode.id, "phase3");
    revalidateAll();
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menjalankan Phase 5 (LNS)" };
  }
}

// ── PHASE 6: CONSENT (Approval Mode) ──────────────────────────────────────────
// Dipanggil setelah operator menyetujui opsi relaksasi per-kasus di UI.
export async function runPhaseConsent(
  _prev: GenerateActionState,
  decisions: ApprovalDecision[],
): Promise<GenerateActionState> {
  const periode = await getPeriodeAktif();
  if (!periode) return { error: "Belum ada Periode Akademik aktif." };
  if (!decisions || decisions.length === 0)
    return { error: "Pilih minimal satu opsi relaksasi untuk disetujui." };

  try {
    const result = await runApprovalMode(periode.id, decisions);
    revalidateAll();
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menjalankan Phase 6 (Consent)" };
  }
}
