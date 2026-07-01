// lib/mapel-color.tsx
//
// Warna berdasarkan TINGKAT KELAS (VII / VIII / IX), bukan per mapel.
// Tujuan: satu pandangan → langsung tahu ini jadwal kelas tingkat berapa.
//
// VII  → Biru  (cool, tenang)
// VIII → Hijau Toska (segar, berbeda jauh dari biru)
// IX   → Oranye/Amber (hangat, kontras kuat dari dua di atas)
//
// Warna dipilih agar jauh secara hue (biru ~220°, toska ~175°, oranye ~30°)
// sehingga mudah dibedakan bahkan oleh yang buta warna parsial.

// ─── Palette tingkat ─────────────────────────────────────────────────────────

type ColorSet = {
  bg:     string;
  text:   string;
  border: string;
  dot:    string;
};

const TINGKAT_COLOR: Record<string, ColorSet> = {
  VII: {
    bg:     "bg-blue-100",
    text:   "text-blue-800",
    border: "border-blue-300",
    dot:    "bg-blue-600",
  },
  VIII: {
    bg:     "bg-teal-100",
    text:   "text-teal-800",
    border: "border-teal-300",
    dot:    "bg-teal-600",
  },
  IX: {
    bg:     "bg-orange-100",
    text:   "text-orange-800",
    border: "border-orange-300",
    dot:    "bg-orange-600",
  },
  // Fallback untuk kelas di luar VII-IX (mis. kelas X, XI, XII, atau slot terkunci)
  DEFAULT: {
    bg:     "bg-zinc-100",
    text:   "text-zinc-700",
    border: "border-zinc-300",
    dot:    "bg-zinc-500",
  },
};

/**
 * Deteksi tingkat dari nama kelas.
 * Contoh: "VII-1" → "VII", "VIII-4" → "VIII", "IX-2" → "IX"
 * Cukup cek apakah nama kelas mengandung angka Romawi di awal.
 */
export function tingkatFromNamaKelas(namaKelas: string): string {
  const upper = namaKelas.toUpperCase();
  if (upper.startsWith("IX"))   return "IX";
  if (upper.startsWith("VIII")) return "VIII";
  if (upper.startsWith("VII"))  return "VII";
  if (upper.startsWith("VI"))   return "VI";
  if (upper.startsWith("V"))    return "V";
  if (upper.startsWith("IV"))   return "IV";
  if (upper.startsWith("XII"))  return "XII";
  if (upper.startsWith("XI"))   return "XI";
  if (upper.startsWith("X"))    return "X";
  return "DEFAULT";
}

/** Ambil ColorSet berdasarkan nama kelas (mis. "VIII-2"). */
export function kelasColor(namaKelas: string): ColorSet {
  const tingkat = tingkatFromNamaKelas(namaKelas);
  return TINGKAT_COLOR[tingkat] ?? TINGKAT_COLOR.DEFAULT;
}

/**
 * @deprecated Gunakan kelasColor(namaKelas) sebagai gantinya.
 * Dipertahankan agar komponen lama yang masih pakai mapelColor tidak error.
 * Akan dihapus setelah semua komponen dimigrasikan.
 */
export function mapelColor(kodeMapel: string): ColorSet {
  // Hash fallback — hasilkan warna dari TINGKAT_COLOR pool
  const pool = Object.values(TINGKAT_COLOR);
  let hash = 0;
  for (let i = 0; i < kodeMapel.length; i++) {
    hash = (hash * 31 + kodeMapel.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}

// ─── Components ───────────────────────────────────────────────────────────────

type MapelBadgeProps = {
  nama:       string;
  kode:       string;         // kodeMapel — dipakai untuk label saja
  namaKelas?: string;         // ← baru: jika ada, warna mengikuti tingkat kelas
  size?:      "sm" | "md";
};

/**
 * Badge pil berwarna.
 * - Jika `namaKelas` diberikan → warna berdasarkan tingkat kelas.
 * - Jika tidak → fallback ke warna lama berdasarkan kodeMapel (deprecated path).
 */
export function MapelBadge({ nama, kode, namaKelas, size = "md" }: MapelBadgeProps) {
  const c = namaKelas ? kelasColor(namaKelas) : mapelColor(kode);
  const sizeCls = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${c.bg} ${c.text} ${c.border} ${sizeCls}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
      {nama}
    </span>
  );
}

/** Titik warna kecil saja (untuk teks inline). */
export function MapelDot({ kode, namaKelas }: { kode: string; namaKelas?: string }) {
  const c = namaKelas ? kelasColor(namaKelas) : mapelColor(kode);
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${c.dot}`} />;
}

/** Legend tingkat kelas — tampilkan di header halaman jadwal. */
export function TingkatLegend() {
  return (
    <div className="flex items-center gap-3 text-xs text-zinc-500">
      <span className="font-medium text-zinc-400">Tingkat:</span>
      {(["VII", "VIII", "IX"] as const).map((t) => {
        const c = TINGKAT_COLOR[t];
        return (
          <span key={t} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${c.bg} ${c.text} ${c.border}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
            {t}
          </span>
        );
      })}
    </div>
  );
}
