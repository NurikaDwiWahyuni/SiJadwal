"use client";

import { useTransition } from "react";
import { removeConstraint, removeAllConstraintKelas } from "./actions";

export function UnlockButton({ jadwalId }: { jadwalId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => removeConstraint(jadwalId))}
      disabled={pending}
      title="Hapus penguncian — slot ini bisa digenerate ulang"
      className="rounded px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors"
    >
      {pending ? "···" : "🔓 Unlock"}
    </button>
  );
}

export function UnlockAllButton({
  kelasId,
  periodeId,
  count,
}: {
  kelasId: string;
  periodeId: string;
  count: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm(`Hapus semua ${count} penguncian pada kelas ini?`)) return;
        startTransition(() => removeAllConstraintKelas(kelasId, periodeId));
      }}
      disabled={pending}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
    >
      {pending ? "···" : `🔓 Unlock semua (${count})`}
    </button>
  );
}
