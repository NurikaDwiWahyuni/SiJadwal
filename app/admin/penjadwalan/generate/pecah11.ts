"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { HARI_LIST, type HariType } from "@/lib/constants";

export type Pecah11Result = {
  berhasil:    number;
  gagal:       number;
  gagalDetail: { kelas: string; mapel: string; guru: string; alasan: string }[];
};

// ─── Types internal ───────────────────────────────────────────────────────────

type SlotInfo = { id: string; hari: string; urutan: number };

type BebanKurang = {
  id:       string;
  jp:       number;
  guruId:   string;
  kelasId:  string;
  guruNama: string;
  kodeGuru: string;
  kelasNama: string;
  mapelNama: string;
  kodeMapel: string;
  hariTidak: string[];
  // slot yang sudah terjadwal sebelum fase ini
  existing: { hari: string; slotWaktuId: string }[];
  // slot yang baru ditempatkan fase ini (mutable)
  placed:   { hari: string; slotId: string }[];
};

type PlacedEntry = {
  bebanId:  string;
  guruId:   string;
  kelasId:  string;
  hari:     string;
  slotId:   string;
};

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/**
 * FASE 3 — Pecah sisa JP yang belum terjadwal, 1 JP per slot per hari berbeda.
 *
 * Algoritma:
 * 1. Greedy: untuk setiap beban yang kurang JP, cari slot bebas di hari baru.
 * 2. Jika tidak ada slot bebas → coba SWAP:
 *    - Temukan beban lain yang menempati slot di hari itu
 *    - Cek apakah beban itu bisa dipindah ke hari/slot lain yang bebas
 *    - Jika bisa → pindahkan, ambil slot yang dikosongkan
 * 3. Ulangi dengan shuffled order hingga MAX_RUNS kali untuk hasil terbaik.
 *
 * Tidak ada constraint "harus hari berbeda" di fase ini —
 * fase 3 adalah last resort, tujuannya: semua JP masuk tanpa bentrok.
 * Yang penting: guru tidak bentrok, kelas tidak bentrok.
 */
export async function pecah2JpJadi11(): Promise<Pecah11Result> {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });
  if (!periode) throw new Error("Belum ada periode aktif");

  // ── Fetch data ─────────────────────────────────────────────────────────────

  const [semuaBeban, semuaJadwal, slotAll] = await Promise.all([
    prisma.bebanMengajar.findMany({
      where: { periodeAkademikId: periode.id },
      include: {
        guru:  { select: { id: true, nama: true, kodeGuru: true, hariTidakTersedia: true } },
        kelas: { select: { id: true, namaKelas: true } },
        mapel: { select: { id: true, namaMapel: true, kodeMapel: true } },
        jadwal: {
          where:  { periodeAkademikId: periode.id },
          select: { hari: true, slotWaktuId: true },
        },
      },
    }),
    prisma.jadwal.findMany({
      where:  { periodeAkademikId: periode.id },
      select: { guruId: true, kelasId: true, hari: true, slotWaktuId: true },
    }),
    prisma.slotWaktu.findMany({
      where:   { jenisSlot: "PELAJARAN" },
      orderBy: [{ hari: "asc" }, { urutan: "asc" }],
      select:  { id: true, hari: true, urutan: true },
    }),
  ]);

  // Beban yang belum terpenuhi
  const bebanKurangRaw = semuaBeban.filter((b) => b.jadwal.length < b.jp);
  if (bebanKurangRaw.length === 0) return { berhasil: 0, gagal: 0, gagalDetail: [] };

  // Semua slot per hari (urut)
  const slotByHari = new Map<string, SlotInfo[]>();
  for (const s of slotAll) {
    if (!slotByHari.has(s.hari)) slotByHari.set(s.hari, []);
    slotByHari.get(s.hari)!.push(s);
  }

  // ── Fungsi solve — satu attempt dengan order tertentu ──────────────────────

  function solve(order: BebanKurang[]): {
    placed:  PlacedEntry[];
    gagal:   BebanKurang[];
  } {
    // occupied sets — rebuild dari semuaJadwal (existing) setiap attempt
    const guruOcc  = new Map<string, Set<string>>();
    const kelasOcc = new Map<string, Set<string>>();

    for (const j of semuaJadwal) {
      const k = `${j.hari}|${j.slotWaktuId}`;
      if (!guruOcc.has(j.guruId))   guruOcc.set(j.guruId, new Set());
      if (!kelasOcc.has(j.kelasId)) kelasOcc.set(j.kelasId, new Set());
      guruOcc.get(j.guruId)!.add(k);
      kelasOcc.get(j.kelasId)!.add(k);
    }

    function isFree(guruId: string, kelasId: string, hari: string, slotId: string): boolean {
      const k = `${hari}|${slotId}`;
      return !guruOcc.get(guruId)?.has(k) && !kelasOcc.get(kelasId)?.has(k);
    }

    function occupy(guruId: string, kelasId: string, hari: string, slotId: string) {
      const k = `${hari}|${slotId}`;
      if (!guruOcc.has(guruId))   guruOcc.set(guruId, new Set());
      if (!kelasOcc.has(kelasId)) kelasOcc.set(kelasId, new Set());
      guruOcc.get(guruId)!.add(k);
      kelasOcc.get(kelasId)!.add(k);
    }

    function release(guruId: string, kelasId: string, hari: string, slotId: string) {
      const k = `${hari}|${slotId}`;
      guruOcc.get(guruId)?.delete(k);
      kelasOcc.get(kelasId)?.delete(k);
    }

    /**
     * Cari slot bebas untuk (guruId, kelasId) di hari mana saja kecuali hariTidak.
     * Tidak ada constraint "hanya hari baru" — fase 3 boleh hari yang sudah ada.
     */
    function findFreeSlot(
      guruId:    string,
      kelasId:   string,
      hariTidak: string[],
      hariUsed:  Set<string>, // hari yang sudah dipilih DI FASE INI untuk beban ini
    ): { hari: string; slotId: string } | null {
      // Prioritas: hari belum dipakai fase ini → hari sudah dipakai fase ini
      const allHari = [
        ...HARI_LIST.filter(h => !hariTidak.includes(h) && !hariUsed.has(h)),
        ...HARI_LIST.filter(h => !hariTidak.includes(h) &&  hariUsed.has(h)),
      ];
      for (const hari of allHari) {
        for (const slot of (slotByHari.get(hari) ?? [])) {
          if (isFree(guruId, kelasId, hari, slot.id)) {
            return { hari, slotId: slot.id };
          }
        }
      }
      return null;
    }

    const placed:    PlacedEntry[] = [];
    const gagal:     BebanKurang[] = [];
    // placed fase ini: dipakai untuk swap
    const phaseEntries: PlacedEntry[] = [];

    for (const b of order) {
      const jpKurang  = b.jp - b.existing.length - b.placed.length;
      const hariUsed  = new Set<string>(); // hari yang sudah dipilih fase ini untuk b
      let   terpenuhi = 0;

      for (let jp = 0; jp < jpKurang; jp++) {
        // ── Coba greedy dulu ─────────────────────────────────────────────────
        const found = findFreeSlot(b.guruId, b.kelasId, b.hariTidak, hariUsed);
        if (found) {
          occupy(b.guruId, b.kelasId, found.hari, found.slotId);
          const entry: PlacedEntry = { bebanId: b.id, guruId: b.guruId, kelasId: b.kelasId, hari: found.hari, slotId: found.slotId };
          placed.push(entry);
          phaseEntries.push(entry);
          hariUsed.add(found.hari);
          terpenuhi++;
          continue;
        }

        // ── Greedy gagal → coba swap dengan beban yang sudah placed ──────────
        let swapped = false;

        for (const cand of shuffle([...phaseEntries])) {
          // Jangan swap dengan beban yang sama
          if (cand.bebanId === b.id) continue;

          // Cari beban asal cand
          const candBeban = order.find(x => x.id === cand.bebanId);
          if (!candBeban) continue;

          // Coba bebaskan slot cand, lalu:
          // 1. apakah b bisa masuk ke slot itu?
          // 2. apakah cand bisa dipindah ke slot lain?
          if (!isFree(b.guruId, b.kelasId, cand.hari, cand.slotId)) continue;

          // Bebaskan slot cand sementara
          release(cand.guruId, cand.kelasId, cand.hari, cand.slotId);

          // Cek b bisa masuk ke slot cand
          const bCanUse = isFree(b.guruId, b.kelasId, cand.hari, cand.slotId)
            && !b.hariTidak.includes(cand.hari);

          if (bCanUse) {
            // Cari slot alternatif untuk cand
            const hariUsedCand = new Set(
              phaseEntries
                .filter(e => e.bebanId === cand.bebanId && e !== cand)
                .map(e => e.hari)
            );
            const alt = findFreeSlot(cand.guruId, cand.kelasId, candBeban.hariTidak, hariUsedCand);

            if (alt) {
              // Swap berhasil: cand pindah ke alt, b masuk ke slot cand
              occupy(cand.guruId, cand.kelasId, alt.hari,   alt.slotId);
              occupy(b.guruId,    b.kelasId,    cand.hari, cand.slotId);

              // Update cand entry
              const candIdx = phaseEntries.indexOf(cand);
              phaseEntries[candIdx] = { ...cand, hari: alt.hari, slotId: alt.slotId };
              const placedIdx = placed.indexOf(cand);
              if (placedIdx >= 0) placed[placedIdx] = phaseEntries[candIdx];

              const newEntry: PlacedEntry = { bebanId: b.id, guruId: b.guruId, kelasId: b.kelasId, hari: cand.hari, slotId: cand.slotId };
              placed.push(newEntry);
              phaseEntries.push(newEntry);
              hariUsed.add(cand.hari);
              terpenuhi++;
              swapped = true;
              break;
            }
          }

          // Swap tidak berhasil — kembalikan slot cand
          occupy(cand.guruId, cand.kelasId, cand.hari, cand.slotId);
        }

        if (!swapped) {
          // Benar-benar tidak ada slot tersisa
          break;
        }
      }

      if (terpenuhi < jpKurang) {
        gagal.push(b);
      }
    }

    return { placed, gagal };
  }

  // ── Jalankan beberapa kali dengan order berbeda, ambil yang terbaik ─────────

  const MAX_RUNS = 30;

  const bebanKurang: BebanKurang[] = bebanKurangRaw.map((b) => ({
    id:        b.id,
    jp:        b.jp,
    guruId:    b.guruId,
    kelasId:   b.kelasId,
    guruNama:  b.guru.nama,
    kodeGuru:  b.guru.kodeGuru,
    kelasNama: b.kelas.namaKelas,
    mapelNama: b.mapel.namaMapel,
    kodeMapel: b.mapel.kodeMapel,
    hariTidak: Array.isArray(b.guru.hariTidakTersedia) ? (b.guru.hariTidakTersedia as string[]) : [],
    existing:  b.jadwal,
    placed:    [],
  }));

  let best: { placed: PlacedEntry[]; gagal: BebanKurang[] } | null = null;

  for (let run = 0; run < MAX_RUNS; run++) {
    const order  = shuffle([...bebanKurang]);
    const result = solve(order);
    if (!best || result.gagal.length < best.gagal.length) best = result;
    if (best.gagal.length === 0) break;
  }

  const { placed, gagal } = best!;

  // ── Simpan ke DB ───────────────────────────────────────────────────────────

  if (placed.length > 0) {
    await prisma.jadwal.createMany({
      data: placed.map((p) => ({
        periodeAkademikId: periode.id,
        bebanMengajarId:   p.bebanId,
        guruId:            p.guruId,
        kelasId:           p.kelasId,
        hari:              p.hari as never,
        slotWaktuId:       p.slotId,
        isLocked:          false,
        isPecah11:         true,  // ← field ada di schema, gunakan kembali
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/admin/penjadwalan/generate");
  revalidatePath("/admin/laporan/jadwal");
  revalidatePath("/admin/penjadwalan/kelas");
  revalidatePath("/admin/penjadwalan/guru");

  const berhasil = bebanKurang.length - gagal.length;

  return {
    berhasil,
    gagal: gagal.length,
    gagalDetail: gagal.map((b) => ({
      kelas:  b.kelasNama,
      mapel:  b.mapelNama,
      guru:   `${b.guruNama} (${b.kodeGuru})`,
      alasan: "Semua slot habis — guru & kelas tidak punya slot bebas tersisa meski setelah swap",
    })),
  };
}
