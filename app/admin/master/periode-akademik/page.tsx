import { redirect } from "next/navigation";

/**
 * Halaman Periode Akademik sudah dihapus dari sistem.
 * Tahun & semester dikelola di Identitas Sekolah.
 */
export default function PeriodeAkademikPage() {
  redirect("/admin/master/identitas-sekolah");
}
