import Link from "next/link";
import { prisma } from "@/lib/prisma";
import GenerateButton from "./GenerateButton";

export default async function GenerateJadwalPage() {
  const periode = await prisma.periodeAkademik.findFirst({ where: { statusAktif: true } });

  const [bebanCount, lockedCount, slotTerkunciCount, slotPelajaranCount, guruCount, kelasCount] =
    await Promise.all([
      periode ? prisma.bebanMengajar.count({ where: { periodeAkademikId: periode.id } }) : Promise.resolve(0),
      periode ? prisma.jadwal.count({ where: { periodeAkademikId: periode.id, isLocked: true } }) : Promise.resolve(0),
      periode ? prisma.slotTerkunci.count({ where: { periodeAkademikId: periode.id } }) : Promise.resolve(0),
      prisma.slotWaktu.count({ where: { jenisSlot: "PELAJARAN" } }),
      prisma.guru.count(),
      prisma.kelas.count(),
    ]);

  return (
    <div className="max-w-2xl space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">⚡</span>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Generate Jadwal</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Sistem menyusun jadwal pelajaran secara otomatis berdasarkan beban mengajar,
          ketersediaan guru, dan batasan slot yang telah dikonfigurasi.
        </p>
      </div>

      {!periode ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-4 items-start">
          <span className="text-2xl shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-amber-900">Periode akademik belum aktif</p>
            <p className="text-sm text-amber-700 mt-1">
              Aktifkan periode akademik terlebih dahulu sebelum menjalankan proses generate.
            </p>
            <Link href="/admin/master/periode-akademik"
              className="mt-2 inline-block text-sm font-semibold text-amber-800 underline">
              Atur Periode Akademik →
            </Link>
          </div>
        </div>
      ) : bebanCount === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-4 items-start">
          <span className="text-2xl shrink-0">📋</span>
          <div>
            <p className="font-semibold text-amber-900">Data beban mengajar belum tersedia</p>
            <p className="text-sm text-amber-700 mt-1">
              Isi data beban mengajar untuk periode ini sebelum menjalankan generate jadwal.
            </p>
            <Link href="/admin/beban-mengajar"
              className="mt-2 inline-block text-sm font-semibold text-amber-800 underline">
              Isi Beban Mengajar →
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── Ringkasan kesiapan data ── */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <p className="text-sm font-semibold text-zinc-900">Kesiapan Data</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Periode {periode.tahun} · {periode.semester === "GANJIL" ? "Ganjil" : "Genap"}
              </p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-zinc-100">
              <StatBox icon="👤" label="Guru" value={guruCount} />
              <StatBox icon="🚪" label="Kelas" value={kelasCount} />
              <StatBox icon="📋" label="Penugasan Mengajar" value={bebanCount} />
            </div>
            <div className="grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100">
              <StatBox icon="🕐" label="Slot Pelajaran/Hari" value={slotPelajaranCount} />
              <StatBox
                icon="🔒"
                label="Slot JP Terkunci"
                value={lockedCount}
                note={lockedCount > 0 ? "Tidak akan diubah" : "Belum ada"}
                accent={lockedCount > 0 ? "amber" : undefined}
              />
              <StatBox
                icon="🚫"
                label="Slot Waktu Diblokir"
                value={slotTerkunciCount}
                note="Upacara, istirahat, dll"
              />
            </div>
          </div>

          {/* ── Aturan generate ── */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 space-y-2">
            <p className="text-sm font-semibold text-blue-900">Batasan yang selalu berlaku</p>
            <ul className="space-y-1.5 text-xs text-blue-800">
              {[
                "Tidak ada bentrok guru — satu guru hanya mengajar satu kelas di waktu bersamaan",
                "Tidak ada bentrok kelas — satu kelas hanya menerima satu mapel per slot waktu",
                "Satu mapel tidak muncul dua kali dalam satu hari untuk kelas yang sama",
                "Blok JP harus berurutan tanpa jeda istirahat di tengahnya",
                "Setiap sesi mapel dijadwalkan di hari yang berbeda (tidak menumpuk dalam satu hari)",
              ].map((rule, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-400 shrink-0 mt-0.5">✓</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <GenerateButton lockedCount={lockedCount} />
        </>
      )}
    </div>
  );
}

function StatBox({
  icon, label, value, note, accent,
}: {
  icon: string;
  label: string;
  value: number;
  note?: string;
  accent?: "amber";
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <p className="text-[11px] text-zinc-500 font-medium">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${accent === "amber" ? "text-amber-600" : "text-zinc-900"}`}>
        {value}
      </p>
      {note && <p className="text-[10px] text-zinc-400 mt-0.5">{note}</p>}
    </div>
  );
}
