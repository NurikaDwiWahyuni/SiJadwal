"use client";

import { useTransition } from "react";
import { hapusSemuaPiket } from "./actions";

export default function HapusPiketButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Hapus semua jadwal piket periode ini? Tindakan ini tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      await hapusSemuaPiket();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {pending ? "Menghapus…" : "Hapus Semua Piket"}
    </button>
  );
}
