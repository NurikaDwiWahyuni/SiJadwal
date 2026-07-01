import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getActivePeriode } from "@/lib/periode";
import { SEMESTER_LABEL } from "@/lib/constants";
import AdminShell from "./AdminShell";

export const metadata: Metadata = { title: "SiJadwal — Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const periode = await getActivePeriode();
  const periodeLabel = periode ? `${periode.tahun} · ${SEMESTER_LABEL[periode.semester]}` : null;

  return (
    <AdminShell nama={session.nama} role={session.role} periodeLabel={periodeLabel}>
      {children}
    </AdminShell>
  );
}
