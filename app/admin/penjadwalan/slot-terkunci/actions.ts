"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { HARI_LIST } from "@/lib/constants";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export type SlotTerkunciFormState = {
  error?: string;
  success?: string;
};

// ────────────────────────────────────────────────────────────
// Schema
// ────────────────────────────────────────────────────────────

const setSchema = z.object({
  id: z.string().trim().optional(),
  kelasId: z.string().trim().optional(),
  hari: z.enum(HARI_LIST),
  slotWaktuId: z.string().trim().min(1),
  // "mapel" | "ekskul" | "blocked"
  // "blocked" = slot dikunci untuk acara tertentu (Upacara, Sholat Jumat, dll)
  type: z.enum(["mapel", "ekskul", "blocked"]),
  refId: z.string().trim().optional(),
  // Label wajib untuk tipe "blocked" — nama acara yang mengisi slot ini
  label: z.string().trim().max(60).optional(),
  durasiSlot: z.number().int().min(1).max(12).optional(),
});

export type SetSlotTerkunciInput = {
  id?: string;
  kelasId?: string;
  hari: string;
  slotWaktuId: string;
  type: "mapel" | "ekskul" | "blocked";
  refId?: string;
  /** Nama acara untuk tipe blocked, mis. "Upacara", "Sholat Jumat", "Rapat Guru" */
  label?: string;
  durasiSlot?: number;
};

// ────────────────────────────────────────────────────────────
// Actions
// ────────────────────────────────────────────────────────────

/**
 * Set atau update sebuah slot terkunci.
 * - type="mapel"   → refId = mapelId
 * - type="ekskul"  → refId = ekstrakurikulerId
 * - type="blocked" → label = nama acara (wajib), slot dikosongkan paksa untuk generator
 *
 * Slot terkunci TETAP dihitung dalam urutan jam pelajaran (tidak dihapus dari posisinya).
 * Generator hanya akan melewati slot ini dan menempatkan pelajaran di slot berikutnya.
 */
export async function setSlotTerkunci(input: SetSlotTerkunciInput) {
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Data tidak valid");
  }

  const { type, refId, kelasId, hari, slotWaktuId, id, label, durasiSlot } = parsed.data;

  if ((type === "mapel" || type === "ekskul") && !refId) {
    throw new Error("refId wajib diisi untuk tipe mapel/ekskul");
  }

  if (type === "blocked" && (!label || label.trim() === "")) {
    throw new Error("Label wajib diisi untuk slot yang diblokir (mis. Upacara, Sholat Jumat)");
  }

  const periode = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });
  if (!periode) {
    throw new Error("Belum ada Periode Akademik yang aktif");
  }

  const data = {
    kelasId: kelasId || null,
    hari,
    slotWaktuMulaiId: slotWaktuId,
    durasiSlot: durasiSlot ?? 1,
    periodeAkademikId: periode.id,
    mapelId: type === "mapel" ? (refId ?? null) : null,
    ekstrakurikulerId: type === "ekskul" ? (refId ?? null) : null,
    // Simpan label: untuk blocked = nama acara, untuk mapel/ekskul = null
    label: type === "blocked" ? (label ?? null) : null,
  };

  if (id) {
    await prisma.slotTerkunci.update({ where: { id }, data });
  } else {
    await prisma.slotTerkunci.create({ data });
  }

  revalidatePath("/admin/penjadwalan/slot-terkunci");
}

/**
 * Hapus kunci dari sebuah slot.
 */
export async function clearSlotTerkunci(id: string) {
  if (!id) return;
  await prisma.slotTerkunci.delete({ where: { id } });
  revalidatePath("/admin/penjadwalan/slot-terkunci");
}

/**
 * @deprecated Pakai setSlotTerkunci via SlotCell
 */
export async function createSlotTerkunci(
  _prevState: SlotTerkunciFormState,
  _formData: FormData
): Promise<SlotTerkunciFormState> {
  return { error: "Gunakan UI baru (SlotCell) untuk mengunci slot." };
}
