"use client";

import { useTransition } from "react";
import { toggleJadwalLock } from "./actions";

type Props = {
  jadwalId: string;
  isLocked: boolean;
};

export default function LockToggle({ jadwalId, isLocked }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      toggleJadwalLock(jadwalId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={
        isLocked
          ? "Terkunci — klik untuk unlock (boleh digenerate ulang)"
          : "Bebas — klik untuk lock (pertahankan saat generate)"
      }
      className={`shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-all disabled:opacity-40 ${
        isLocked
          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
          : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
      }`}
    >
      {isPending ? (
        <span className="animate-pulse">···</span>
      ) : isLocked ? (
        <><span>🔒</span><span className="hidden sm:inline">Terkunci</span></>
      ) : (
        <><span>🔓</span><span className="hidden sm:inline">Bebas</span></>
      )}
    </button>
  );
}
