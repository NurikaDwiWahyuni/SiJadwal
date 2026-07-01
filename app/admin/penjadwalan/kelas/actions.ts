"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { HariType } from "@/lib/constants";

export type InputManualState = {
  error?: string;
  success?: string;
};

export async function inputManualJadwal(
  _prev: InputManualState,
  formData: FormData,
): Promise<InputManualState> {
  const periodeId   = formData.get("periodeId")   as string;
  const bebanId     = formData.get("bebanId")     as string;
  const kelasId     = formData.get("kelasId")     as string;
  const slotWaktuId = formData.get("slotWaktuId") as string;
  const hari        = formData.get("hari")         as HariType;

  if (!periodeId || !bebanId || !kelasId || !slotWaktuId || !hari) {
    return { error: "Data tidak lengkap." };
  }

  const beban = await prisma.bebanMengajar.findUnique({
    where: { id: bebanId },
    include: { guru: true, mapel: true, kelas: true },
  });
  if (!beban) return { error: "Beban mengajar tidak ditemukan." };

  // ── VALIDASI 1: 1 mapel per kelas TIDAK BOLEH di hari yang sama ──────────
  const jadwalHariSama = await prisma.jadwal.findMany({
    where: { periodeAkademikId: periodeId, kelasId, hari, bebanMengajarId: bebanId },
    include: { slotWaktu: true },
  });
  if (jadwalHariSama.length > 0) {
    return {
      error: `${beban.mapel.namaMapel} sudah ada di hari ini untuk ${beban.kelas.namaKelas}. ` +
             `Satu mapel tidak boleh muncul dua kali di hari yang sama.`,
    };
  }

  // ── VALIDASI 2: slot harus PELAJARAN & tidak terkunci ────────────────────
  const slot = await prisma.slotWaktu.findUnique({ where: { id: slotWaktuId } });
  if (!slot || slot.jenisSlot !== "PELAJARAN") {
    return { error: "Slot yang dipilih bukan slot pelajaran." };
  }

  const terkunci = await prisma.slotTerkunci.findFirst({
    where: {
      periodeAkademikId: periodeId, hari, slotWaktuMulaiId: slotWaktuId,
      OR: [{ kelasId: null }, { kelasId }],
    },
  });
  if (terkunci) return { error: "Slot ini terkunci dan tidak bisa diisi manual." };

  // ── VALIDASI 3: tidak bentrok kelas / guru ────────────────────────────────
  const bentrokKelas = await prisma.jadwal.findFirst({
    where: { periodeAkademikId: periodeId, kelasId, hari, slotWaktuId },
  });
  if (bentrokKelas) return { error: "Slot ini sudah dipakai kelas ini di jam yang sama." };

  const bentrokGuru = await prisma.jadwal.findFirst({
    where: { periodeAkademikId: periodeId, guruId: beban.guruId, hari, slotWaktuId },
  });
  if (bentrokGuru) {
    return { error: `${beban.guru.nama} sudah mengajar kelas lain di slot ini.` };
  }

  // ── VALIDASI 4: JP sudah penuh? ───────────────────────────────────────────
  const sudahTerjadwal = await prisma.jadwal.count({
    where: { periodeAkademikId: periodeId, bebanMengajarId: bebanId },
  });
  if (sudahTerjadwal >= beban.jp) {
    return {
      error: `${beban.mapel.namaMapel} di ${beban.kelas.namaKelas} sudah penuh ` +
             `(${sudahTerjadwal}/${beban.jp} JP terjadwal).`,
    };
  }

  // ── VALIDASI 5 (KRUSIAL): jika sudah ada JP di hari ini mapel ini,
  //    slot baru HARUS berurutan langsung (urutan ±1 dari yang ada) ──────────
  // Cek semua jadwal mapel ini yang sudah ada di hari+kelas ini
  // (kasus same-day autofix: [2,1] → 2 JP di hari A, lalu 1 JP harus berurutan)
  const semuaSlotHari = await prisma.slotWaktu.findMany({
    where: { hari },
    orderBy: { urutan: "asc" },
  });

  // Ambil jadwal beban ini di semua hari (untuk cek berurutan jika sameday)
  const jadwalBebanHariIni = await prisma.jadwal.findMany({
    where: { periodeAkademikId: periodeId, bebanMengajarId: bebanId, hari },
    include: { slotWaktu: true },
  });

  if (jadwalBebanHariIni.length > 0) {
    // Ada JP mapel ini di hari yang sama (kasus same-day split [2,1])
    // Pastikan slot baru langsung berurutan dengan blok yang ada
    const urutanAda = jadwalBebanHariIni.map(j => j.slotWaktu.urutan).sort((a, b) => a - b);
    const urutanBaru = slot.urutan;
    const minAda = urutanAda[0];
    const maxAda = urutanAda[urutanAda.length - 1];

    // Cek apakah ada slot NON_PELAJARAN di antara slot yang ada dan slot baru
    const urutanMin = Math.min(urutanBaru, minAda);
    const urutanMax = Math.max(urutanBaru, maxAda);
    const adaNonJpDiAntara = semuaSlotHari.some(
      s => s.jenisSlot === "NON_PELAJARAN" && s.urutan > urutanMin && s.urutan < urutanMax
    );

    // Slot baru harus tepat sebelum atau sesudah blok yang ada (urutan - 1 atau + 1)
    const berurutan = urutanBaru === minAda - 1 || urutanBaru === maxAda + 1;

    if (!berurutan || adaNonJpDiAntara) {
      const contohSlot = urutanBaru < minAda
        ? `JP ${urutanBaru} tidak bisa digabung dengan blok JP ${minAda}–${maxAda}`
        : `JP ${urutanBaru} tidak bisa digabung dengan blok JP ${minAda}–${maxAda}`;
      return {
        error: `Slot harus berurutan langsung dengan JP ${beban.mapel.namaMapel} yang sudah ada di hari ini ` +
               `(blok JP urutan ${minAda}–${maxAda}). ${contohSlot}.` +
               (adaNonJpDiAntara ? " Ada istirahat/kegiatan di antara slot." : ""),
      };
    }
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  await prisma.jadwal.create({
    data: {
      periodeAkademikId: periodeId,
      bebanMengajarId:   bebanId,
      guruId:            beban.guruId,
      kelasId,
      hari,
      slotWaktuId,
      isLocked: true, // manual = langsung terkunci
    },
  });

  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
  revalidatePath("/admin/penjadwalan/generate");

  const sisa = beban.jp - sudahTerjadwal - 1;
  return {
    success: `✓ ${beban.mapel.namaMapel} — ${beban.guru.kodeGuru} masuk ke ${slot.namaSlot} hari ${hari}` +
             (sisa > 0 ? `. Sisa ${sisa} JP lagi.` : ". JP lengkap! 🎉"),
  };
}

export async function hapusJadwalManual(jadwalId: string) {
  await prisma.jadwal.delete({ where: { id: jadwalId } });
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");
}
