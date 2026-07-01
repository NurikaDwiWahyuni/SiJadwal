/**
 * slotUtils.ts
 *
 * Logika non-JP:
 *   - SLOT SENDIRI (Upacara, Keagamaan, Senam, Istirahat):
 *       → punya slot tersendiri, JP di bawahnya tetap full durasi.
 *   - TEMPEL JP (selain 4 di atas — mis. GLS, Rapat, dll):
 *       → punya slot sendiri TAPI durasinya "dimakan" dari JP berikutnya.
 *         JP yang terkena dipotong di awal sesuai durasi non-JP tersebut.
 *         Contoh: GLS 15 mnt, jam mulai 07:30, 1JP = 40 mnt
 *           GLS  : 07:30–07:45  (slot NON_PELAJARAN)
 *           JP 1 : 07:45–08:10  (40 - 15 = 25 mnt, bukan 40 mnt)
 *           JP 2 : 08:10–08:50  (full 40 mnt)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SegmenInput = {
  id: number;
  nama: string;
  jenis: "PELAJARAN" | "NON_PELAJARAN";
  menit: number; // PELAJARAN = jumlah JP; NON_PELAJARAN = durasi menit
};

export type SlotBuilt = {
  label: string;
  jenis: "PELAJARAN" | "NON_PELAJARAN";
  jamMulai: string;
  jamSelesai: string;
  isJP: boolean;
};

export type SlotWaktuSimpan = {
  namaSlot: string;
  jenisSlot: "PELAJARAN" | "NON_PELAJARAN";
  jamMulai: string | null;
  jamSelesai: string | null;
};

export type ParsedSegmen = {
  segmen: SegmenInput[];
  jamMulai: string;
  menitPerJP: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function diffMinutes(from: string, to: string): number {
  const [h1, m1] = from.split(":").map(Number);
  const [h2, m2] = to.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

/**
 * Non-JP yang punya slot SENDIRI — JP setelahnya tetap full durasi.
 * Yang TIDAK termasuk di sini (tempel JP) akan memakan durasi JP berikutnya.
 */
const SLOT_SENDIRI = new Set(["upacara", "keagamaan", "senam", "istirahat"]);

export function isSlotSendiri(nama: string): boolean {
  return SLOT_SENDIRI.has(nama.trim().toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// buildDailySlots — satu-satunya sumber kebenaran untuk preview & simpan DB
// ─────────────────────────────────────────────────────────────────────────────

export function buildDailySlots(
  segmen: SegmenInput[],
  jamMulai: string,
  menitPerJP: number
): SlotBuilt[] {
  const result: SlotBuilt[] = [];
  let waktu = jamMulai;
  let jpCounter = 1;

  // "hutang" menit yang akan dipotong dari JP berikutnya (tempel JP)
  let potonganMenit = 0;

  for (const seg of segmen) {
    if (seg.jenis === "PELAJARAN") {
      const jumlahJP = Math.max(1, Math.floor(seg.menit));
      for (let i = 0; i < jumlahJP; i++) {
        // JP pertama dalam blok ini kena potongan dari non-JP "tempel" sebelumnya
        const durasi = i === 0
          ? Math.max(1, menitPerJP - potonganMenit)
          : menitPerJP;
        potonganMenit = 0; // potongan sudah dipakai, reset

        const selesai = addMinutes(waktu, durasi);
        result.push({
          label: `JP ${jpCounter}`,
          jenis: "PELAJARAN",
          jamMulai: waktu,
          jamSelesai: selesai,
          isJP: true,
        });
        waktu = selesai;
        jpCounter++;
      }
    } else {
      const nama = seg.nama?.trim() || "Kegiatan";
      const durasi = Math.max(1, Math.floor(seg.menit));
      const selesai = addMinutes(waktu, durasi);

      result.push({
        label: nama,
        jenis: "NON_PELAJARAN",
        jamMulai: waktu,
        jamSelesai: selesai,
        isJP: false,
      });
      waktu = selesai;

      if (!isSlotSendiri(nama)) {
        // Tempel JP: durasi non-JP ini akan dipotong dari JP berikutnya
        potonganMenit = durasi;
      }
      // Slot sendiri (upacara, senam, dll): JP berikutnya tetap full, potonganMenit tidak diubah
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// slotsToSegmen — kebalikan buildDailySlots, untuk hydrate editor dari DB
// ─────────────────────────────────────────────────────────────────────────────

let clientIdSeq = Date.now();
function nextId(): number { return ++clientIdSeq; }

export function slotsToSegmen(slots: SlotWaktuSimpan[]): ParsedSegmen {
  const fallback: ParsedSegmen = {
    segmen: [
      { id: nextId(), nama: "JP",        jenis: "PELAJARAN",     menit: 3 },
      { id: nextId(), nama: "Istirahat", jenis: "NON_PELAJARAN", menit: 15 },
      { id: nextId(), nama: "JP",        jenis: "PELAJARAN",     menit: 3 },
    ],
    jamMulai: "07:00",
    menitPerJP: 40,
  };

  if (!slots || slots.length === 0) return fallback;

  const jamMulai = slots[0].jamMulai ?? "07:00";

  // Deteksi menitPerJP dari JP yang TIDAK terpotong (ambil durasi terpanjang)
  let menitPerJP = 40;
  let maxDurasi = 0;
  for (const s of slots) {
    if (s.jenisSlot === "PELAJARAN" && s.jamMulai && s.jamSelesai) {
      const dur = diffMinutes(s.jamMulai, s.jamSelesai);
      if (dur > maxDurasi) { maxDurasi = dur; menitPerJP = dur; }
    }
  }

  const segmen: SegmenInput[] = [];
  let jpAcc = 0;

  function flushJP() {
    if (jpAcc > 0) {
      segmen.push({ id: nextId(), nama: "JP", jenis: "PELAJARAN", menit: jpAcc });
      jpAcc = 0;
    }
  }

  for (const s of slots) {
    if (s.jenisSlot === "PELAJARAN") {
      jpAcc++;
    } else {
      flushJP();
      let durasi = 15;
      if (s.jamMulai && s.jamSelesai) {
        const d = diffMinutes(s.jamMulai, s.jamSelesai);
        if (d > 0) durasi = d;
      }
      segmen.push({
        id: nextId(),
        nama: s.namaSlot || "Kegiatan",
        jenis: "NON_PELAJARAN",
        menit: durasi,
      });
    }
  }

  flushJP();
  if (segmen.length === 0) return fallback;
  return { segmen, jamMulai, menitPerJP };
}
