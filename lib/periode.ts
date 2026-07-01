import { prisma } from "@/lib/prisma";

/**
 * Ambil periode akademik aktif.
 * Periode dikelola otomatis oleh sistem — admin tidak perlu tahu.
 * Tahun & semester diambil dari IdentitasSekolah, bukan dari halaman Periode.
 *
 * Kalau belum ada periode (fresh install), auto-bootstrap dari IdentitasSekolah.
 * Kalau IdentitasSekolah juga kosong, kembalikan null — halaman akan tampilkan
 * pesan "Isi Identitas Sekolah dulu".
 */
export async function getActivePeriode() {
  // Coba ambil langsung
  const aktif = await prisma.periodeAkademik.findFirst({
    where: { statusAktif: true },
  });
  if (aktif) return aktif;

  // Belum ada — coba bootstrap dari IdentitasSekolah
  const identitas = await prisma.identitasSekolah.findUnique({ where: { id: 1 } });
  if (!identitas?.tahunPelajaran) return null;

  // Buat / aktifkan periode dari identitas
  const periode = await prisma.periodeAkademik.upsert({
    where: {
      tahun_semester: {
        tahun: identitas.tahunPelajaran,
        semester: identitas.semester,
      },
    },
    update: { statusAktif: true },
    create: {
      tahun: identitas.tahunPelajaran,
      semester: identitas.semester,
      statusAktif: true,
    },
  });

  return periode;
}
