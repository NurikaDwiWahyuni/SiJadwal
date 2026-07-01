import GuruForm from "../GuruForm";
import { createGuru } from "../actions";

export default async function GuruBaruPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Tambah Guru</h1>
        <p className="text-sm text-zinc-500">
          Isi data guru. Penugasan mapel &amp; kelas diatur di Master Data &gt; Mata Pelajaran.
        </p>
      </div>
      <GuruForm action={createGuru} submitLabel="Simpan Guru" />
    </div>
  );
}
