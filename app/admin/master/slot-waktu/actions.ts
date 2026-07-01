"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { HARI_LIST } from "@/lib/constants";
import { buildDailySlots } from "@/lib/slotUtils";
import type { SegmenInput } from "@/lib/slotUtils";

// ── Types ─────────────────────────────────────────────────────────────────────
// SegmenInput TIDAK diekspor dari sini (file "use server" tidak boleh ekspor type).
// Import SegmenInput langsung dari @/lib/slotUtils di file client.

export type GenerateSlotState = {
  error?:        string;
  success?:      string;
  needsConfirm?: boolean;
  jadwalCount?:  number;
  slotCount?:    number;
};

// ── Generate otomatis ─────────────────────────────────────────────────────────

const generateSchema = z.object({
  hari:         z.enum(HARI_LIST),
  jamMulai:     z.string().min(1, "Jam mulai wajib diisi"),
  menitPerJP:   z.coerce.number().int().min(1).max(120),
  segmenJson:   z.string(),
  forceReset:   z.coerce.boolean().optional().default(false),
  previewCount: z.coerce.number().optional(),
});

export async function generateSlotOtomatis(
  _prev: GenerateSlotState,
  formData: FormData
): Promise<GenerateSlotState> {
  const parsed = generateSchema.safeParse({
    hari:         formData.get("hari"),
    jamMulai:     formData.get("jamMulai"),
    menitPerJP:   formData.get("menitPerJP"),
    segmenJson:   formData.get("segmenJson"),
    forceReset:   formData.get("forceReset"),
    previewCount: formData.get("previewCount"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  let segmen: SegmenInput[];
  try {
    segmen = JSON.parse(parsed.data.segmenJson);
  } catch {
    return { error: "Format segmen tidak valid" };
  }
  if (!segmen.length) return { error: "Tambahkan minimal 1 segmen" };

  const { hari, jamMulai, menitPerJP, forceReset } = parsed.data;

  // 1. Cek apakah sudah ada jadwal lama untuk slot hari ini
  const existingSlots = await prisma.slotWaktu.findMany({
    where: { hari },
    select: { id: true },
  });
  const existingSlotIds = existingSlots.map((s) => s.id);

  const jadwalCount = existingSlotIds.length > 0
    ? await prisma.jadwal.count({ where: { slotWaktuId: { in: existingSlotIds } } })
    : 0;

  // 2. Ada jadwal dan belum konfirmasi → kembalikan needsConfirm, jangan hapus dulu
  if (jadwalCount > 0 && !forceReset) {
    return { needsConfirm: true, jadwalCount, slotCount: existingSlots.length };
  }

  // 3. Hapus semua slot + jadwal lama (disposable cache)
  if (existingSlotIds.length > 0) {
    await prisma.jadwal.deleteMany({ where: { slotWaktuId: { in: existingSlotIds } } });
    await prisma.slotTerkunci.deleteMany({ where: { slotWaktuMulaiId: { in: existingSlotIds } } });
    await prisma.slotWaktu.deleteMany({ where: { hari } });
  }

  // 4. Build ulang dari builder (source of truth)
  const builtSlots = buildDailySlots(segmen, jamMulai, menitPerJP);
  if (builtSlots.length === 0) {
    return { error: "Tidak ada slot yang berhasil dibangun dari konfigurasi ini" };
  }

  // 5. Simpan dengan nomor urut bersih 1..N
  await prisma.slotWaktu.createMany({
    data: builtSlots.map((s, idx) => ({
      hari,
      urutan:    idx + 1,
      namaSlot:  s.label,
      jenisSlot: s.jenis,
      jamMulai:  s.jamMulai,
      jamSelesai: s.jamSelesai,
    })),
  });

  revalidatePath("/admin/master/slot-waktu");
  revalidatePath("/admin/penjadwalan/generate");

  return {
    success: `Slot hari ${hari} berhasil disimpan — ${builtSlots.length} slot (${builtSlots.filter((s) => s.isJP).length} JP).${
      jadwalCount > 0 ? ` ${jadwalCount} hasil generate sebelumnya dihapus.` : ""
    }`,
  };
}

// ── Update jam per-slot ───────────────────────────────────────────────────────

export async function updateJamSlot(formData: FormData) {
  const id       = formData.get("id") as string;
  const jamMulai  = formData.get("jamMulai") as string;
  const jamSelesai = formData.get("jamSelesai") as string;
  if (!id) return;
  await prisma.slotWaktu.update({
    where: { id },
    data: { jamMulai: jamMulai || null, jamSelesai: jamSelesai || null },
  });
  revalidatePath("/admin/master/slot-waktu");
}

// ── Delete slot ───────────────────────────────────────────────────────────────

export async function deleteSlot(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.jadwal.deleteMany({ where: { slotWaktuId: id } });
  await prisma.slotTerkunci.deleteMany({ where: { slotWaktuMulaiId: id } });
  await prisma.slotWaktu.delete({ where: { id } });
  revalidatePath("/admin/master/slot-waktu");
}
