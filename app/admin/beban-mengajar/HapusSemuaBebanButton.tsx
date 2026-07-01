"use client";

import { useTransition } from "react";
import { hapusSemuaBeban } from "./actions";

export default function HapusSemuaBebanButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        "Hapus SEMUA Beban Mengajar (dan jadwal yang sudah ter-generate) pada periode aktif? Guru, Kelas, dan Mapel tidak akan terhapus. Tindakan ini tidak bisa dibatalkan."
      )
    )
      return;
    startTransition(async () => {
      try {
        await hapusSemuaBeban();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Gagal menghapus beban mengajar.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {pending ? "Menghapus…" : "Hapus Semua Beban"}
    </button>
  );
}
