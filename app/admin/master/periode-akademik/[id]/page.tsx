import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PeriodeForm from "../PeriodeForm";
import { updatePeriode } from "../actions";

export default async function PeriodeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const periode = await prisma.periodeAkademik.findUnique({ where: { id } });

  if (!periode) {
    notFound();
  }

  const boundUpdatePeriode = updatePeriode.bind(null, id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Edit Periode Akademik</h1>
        <p className="text-sm text-zinc-500">
          Perbarui data periode &quot;{periode.tahun}&quot;.
        </p>
      </div>
      <PeriodeForm
        action={boundUpdatePeriode}
        submitLabel="Simpan Perubahan"
        defaultValues={{ tahun: periode.tahun, semester: periode.semester }}
      />
    </div>
  );
}
