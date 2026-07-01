"use client";

import { useTransition } from "react";
import { lockAllJadwalKelas, unlockAllJadwalKelas } from "./actions";

type Props = {
  kelasId: string;
  periodeId: string;
  lockedCount: number;
  totalCount: number;
};

export default function BulkLockButtons({ kelasId, periodeId, lockedCount, totalCount }: Props) {
  const [isPending, startTransition] = useTransition();

  const allLocked = lockedCount === totalCount && totalCount > 0;
  const noneLocked = lockedCount === 0;

  return (
    <div className="flex items-center gap-1.5">
      {!allLocked && (
        <button
          onClick={() =>
            startTransition(() => lockAllJadwalKelas(kelasId, periodeId))
          }
          disabled={isPending || totalCount === 0}
          title="Kunci semua slot kelas ini — generator tidak akan mengubah apa pun"
          className="flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40 transition-colors"
        >
          {isPending ? "···" : "🔒 Kunci Semua"}
        </button>
      )}
      {!noneLocked && (
        <button
          onClick={() =>
            startTransition(() => unlockAllJadwalKelas(kelasId, periodeId))
          }
          disabled={isPending || totalCount === 0}
          title="Bebaskan semua slot — generator boleh mengubah semua saat generate ulang"
          className="flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
        >
          {isPending ? "···" : "🔓 Bebas Semua"}
        </button>
      )}
      {totalCount > 0 && (
        <span className="text-[11px] text-zinc-400">
          {lockedCount}/{totalCount} terkunci
        </span>
      )}
    </div>
  );
}
