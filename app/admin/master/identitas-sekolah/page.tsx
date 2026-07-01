import { prisma } from "@/lib/prisma";
import IdentitasForm from "./IdentitasForm";
import { getActivePeriode } from "@/lib/periode";
import { SEMESTER_LABEL } from "@/lib/constants";

export default async function IdentitasSekolahPage() {
  const [identitas, ttd, periode] = await Promise.all([
    prisma.identitasSekolah.findUnique({ where: { id: 1 } }),
    prisma.pengaturanTtd.findUnique({ where: { id: 1 } }),
    getActivePeriode(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Identitas Sekolah</h1>
        <p className="text-sm text-zinc-500">
          Data sekolah, periode aktif, dan tanda tangan untuk laporan.
        </p>
      </div>

      {periode ? (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p className="font-medium">
            Periode aktif: {periode.tahun} — {SEMESTER_LABEL[periode.semester]}
          </p>
          <p className="mt-0.5 text-xs text-blue-600">
            Untuk ganti periode, ubah <strong>Tahun Pelajaran</strong> dan/atau{" "}
            <strong>Semester</strong> di form ini lalu simpan. Jadwal lama tetap ada
            sampai Generate Ulang dijalankan.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Belum ada periode aktif.</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Isi Tahun Pelajaran dan Semester lalu simpan — periode akan aktif otomatis.
          </p>
        </div>
      )}

      <IdentitasForm
        defaultValues={{
          namaSekolah:    identitas?.namaSekolah    ?? "",
          npsn:           identitas?.npsn           ?? null,
          nss:            identitas?.nss            ?? null,
          alamat:         identitas?.alamat         ?? null,
          email:          identitas?.email          ?? null,
          kecamatan:      identitas?.kecamatan      ?? null,
          namaPemerintah: identitas?.namaPemerintah ?? null,
          namaDinas:      identitas?.namaDinas      ?? null,
          kurikulum:      identitas?.kurikulum      ?? null,
          tahunPelajaran: identitas?.tahunPelajaran ?? null,
          semester:       identitas?.semester       ?? "GANJIL",
          logoKiri:       identitas?.logoKiri       ?? null,
          logoKanan:      identitas?.logoKanan      ?? null,
          namaKepsek:     ttd?.namaKepsek           ?? null,
          nipKepsek:      ttd?.nipKepsek            ?? null,
          namaWaka:       ttd?.namaWaka             ?? null,
          nipWaka:        ttd?.nipWaka              ?? null,
        }}
      />
    </div>
  );
}
