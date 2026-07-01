import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getDashboardData() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });

  const [totalGuru, totalKelas, totalMapel, jpAgg, totalJadwal, totalBeban, guruStats] =
    await Promise.all([
      prisma.guru.count(),
      prisma.kelas.count(),
      prisma.mapel.count(),
      prisma.bebanMengajar.aggregate({
        _sum: { jp: true },
        where: periode ? { periodeAkademikId: periode.id } : undefined,
      }),
      prisma.jadwal.count({
        where: periode ? { periodeAkademikId: periode.id } : undefined,
      }),
      prisma.bebanMengajar.count({
        where: periode ? { periodeAkademikId: periode.id } : undefined,
      }),
      // JP per guru — untuk cek siapa yang terbanyak
      periode
        ? prisma.bebanMengajar.groupBy({
            by: ["guruId"],
            where: { periodeAkademikId: periode.id },
            _sum: { jp: true },
            orderBy: { _sum: { jp: "desc" } },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

  const kelengkapanPersen =
    totalBeban > 0 ? Math.round((totalJadwal / (jpAgg._sum.jp ?? totalBeban)) * 100) : 0;

  return {
    periode,
    totalGuru,
    totalKelas,
    totalMapel,
    totalJp: jpAgg._sum.jp ?? 0,
    totalJadwal,
    totalBeban,
    kelengkapanPersen: Math.min(kelengkapanPersen, 100),
  };
}

export default async function DashboardPage() {
  const d = await getDashboardData();

  const statCards = [
    {
      label: "Guru Terdaftar",
      value: d.totalGuru,
      href: "/admin/master/guru",
      color: "blue",
      icon: "👤",
      sub: "pengajar aktif",
    },
    {
      label: "Rombongan Belajar",
      value: d.totalKelas,
      href: "/admin/master/kelas",
      color: "indigo",
      icon: "🚪",
      sub: "kelas",
    },
    {
      label: "Mata Pelajaran",
      value: d.totalMapel,
      href: "/admin/master/mapel",
      color: "violet",
      icon: "📚",
      sub: "mapel",
    },
    {
      label: "Total JP / Minggu",
      value: d.totalJp,
      href: "/admin/beban-mengajar",
      color: "cyan",
      icon: "🕐",
      sub: "jam pelajaran",
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; ring: string; num: string }> = {
    blue:   { bg: "bg-blue-950/40",   text: "text-blue-400",   ring: "ring-blue-700/30",   num: "text-blue-300"  },
    indigo: { bg: "bg-indigo-950/40", text: "text-indigo-400", ring: "ring-indigo-700/30", num: "text-indigo-300"},
    violet: { bg: "bg-violet-950/40", text: "text-violet-400", ring: "ring-violet-700/30", num: "text-violet-300"},
    cyan:   { bg: "bg-cyan-950/40",   text: "text-cyan-400",   ring: "ring-cyan-700/30",   num: "text-cyan-300"  },
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Beranda</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {d.periode
              ? `Periode aktif: ${d.periode.tahun} — Semester ${d.periode.semester === "GANJIL" ? "Ganjil" : "Genap"}`
              : "Belum ada periode akademik yang diaktifkan."}
          </p>
        </div>
        {d.periode && (
          <Link
            href="/admin/penjadwalan/generate"
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            ⚡ Generate Jadwal
          </Link>
        )}
      </div>

      {/* ── Peringatan bila belum ada periode ── */}
      {!d.periode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex gap-4 items-start">
          <span className="text-2xl shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Periode Akademik belum diatur</p>
            <p className="text-xs text-amber-700 mt-1">
              Fitur beban mengajar, penjadwalan, dan laporan tidak akan berfungsi sebelum periode aktif tersedia.
            </p>
            <Link href="/admin/master/periode-akademik"
              className="mt-2 inline-block text-xs font-semibold text-amber-800 underline">
              Atur Periode Akademik →
            </Link>
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((c) => {
          const cls = colorMap[c.color];
          return (
            <Link key={c.label} href={c.href}
              className={`card-hover rounded-xl border border-zinc-200 bg-white p-5 shadow-sm block`}>
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{c.label}</p>
                <span className="text-lg">{c.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-zinc-900">{c.value}</p>
              <p className="mt-1 text-xs text-zinc-400">{c.sub}</p>
            </Link>
          );
        })}
      </div>

      {/* ── Status jadwal ── */}
      {d.periode && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Status Penjadwalan</p>
              <p className="text-xs text-zinc-500 mt-0.5">Periode {d.periode.tahun}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              d.kelengkapanPersen === 100
                ? "bg-green-100 text-green-700"
                : d.kelengkapanPersen >= 70
                ? "bg-amber-100 text-amber-700"
                : d.totalJadwal === 0
                ? "bg-zinc-100 text-zinc-500"
                : "bg-red-100 text-red-700"
            }`}>
              {d.totalJadwal === 0
                ? "Belum Digenerate"
                : d.kelengkapanPersen === 100
                ? "✓ Lengkap"
                : `${d.kelengkapanPersen}% Terisi`}
            </span>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
              <span>{d.totalJadwal} slot terjadwal</span>
              <span>{d.totalJp} JP target</span>
            </div>
            <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  d.kelengkapanPersen === 100
                    ? "bg-green-500"
                    : d.kelengkapanPersen >= 70
                    ? "bg-amber-400"
                    : "bg-red-400"
                }`}
                style={{ width: `${d.kelengkapanPersen}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/admin/penjadwalan/generate"
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
              ⚡ Generate / Perbarui Jadwal
            </Link>
            <Link href="/admin/penjadwalan/diagnostik"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              🔍 Diagnostik
            </Link>
            <Link href="/admin/laporan/jadwal"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              📄 Pratinjau & Ekspor
            </Link>
          </div>
        </div>
      )}

      {/* ── Aksi cepat ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { href: "/admin/master/guru",          icon: "👤", label: "Kelola Data Guru",          sub: "Tambah, ubah, atau hapus guru"              },
          { href: "/admin/master/mapel",         icon: "📚", label: "Kelola Mata Pelajaran",      sub: "Atur JP dan pengampu per kelas"             },
          { href: "/admin/beban-mengajar",       icon: "📋", label: "Beban Mengajar",             sub: "Lihat distribusi JP seluruh guru"           },
          { href: "/admin/master/slot-waktu",    icon: "🕐", label: "Konfigurasi Slot Waktu",     sub: "Jam pelajaran, istirahat, dan upacara"      },
          { href: "/admin/penjadwalan/slot-terkunci", icon: "🔒", label: "Slot Terkunci",        sub: "Blokir atau kunci slot tertentu"            },
          { href: "/admin/penjadwalan/cek-bentrok",   icon: "⚠", label: "Cek Konflik Jadwal",   sub: "Deteksi bentrok guru dan kelas"             },
        ].map((a) => (
          <Link key={a.href} href={a.href}
            className="card-hover flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <span className="text-xl mt-0.5 shrink-0">{a.icon}</span>
            <div>
              <p className="text-sm font-semibold text-zinc-900">{a.label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{a.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
