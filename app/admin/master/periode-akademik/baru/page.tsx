import PeriodeForm from "../PeriodeForm";
import { createPeriode } from "../actions";

export default function PeriodeBaruPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Tambah Periode Akademik</h1>
        <p className="text-sm text-zinc-500">
          Periode pertama yang dibuat akan otomatis menjadi aktif.
        </p>
      </div>
      <PeriodeForm action={createPeriode} submitLabel="Simpan Periode" />
    </div>
  );
}
