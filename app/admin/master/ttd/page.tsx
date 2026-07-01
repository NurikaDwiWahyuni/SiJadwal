import { redirect } from "next/navigation";

// Halaman Tanda Tangan sudah digabung ke Identitas Sekolah.
export default function TtdPage() {
  redirect("/admin/master/identitas-sekolah");
}
