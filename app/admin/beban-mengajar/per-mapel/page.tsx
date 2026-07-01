import { redirect } from "next/navigation";

// Halaman ini sudah digabung ke Master Data > Mata Pelajaran > Edit Mapel
// (lihat /admin/master/mapel/[id]). Redirect supaya link lama tidak rusak.
export default function BebanPerMapelRedirect() {
  redirect("/admin/master/mapel");
}
