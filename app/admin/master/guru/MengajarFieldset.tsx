"use client";

import { Fragment, useMemo, useState } from "react";
import { MapelBadge } from "@/lib/mapel-color";

type MapelOpt = { id: string; namaMapel: string; kodeMapel: string };
type KelasOpt = { id: string; namaKelas: string };
type Assignment = { mapelId: string; kelasId: string; jp: number };

type Props = {
  mapelList: MapelOpt[];
  kelasList: KelasOpt[];
  existing: Assignment[];
  periodeAktif: boolean;
  maksJp: number | null;
};

/**
 * Fieldset checklist Mapel x Kelas untuk satu guru. Ditempel di dalam
 * <form> milik GuruForm (tidak punya elemen <form> sendiri) supaya data
 * guru dan penugasan mengajarnya tersimpan sekaligus dalam satu submit.
 *
 * Satu guru boleh mencentang banyak mapel, dan untuk tiap mapel boleh
 * mencentang banyak kelas sekaligus — sesuai kebutuhan: relasi
 * guru-mapel-kelas itu fleksibel, bukan satu-ke-satu.
 */
export default function MengajarFieldset({
  mapelList,
  kelasList,
  existing,
  periodeAktif,
  maksJp,
}: Props) {
  const [selected, setSelected] = useState<Map<string, number>>(
    () => new Map(existing.map((e) => [`${e.mapelId}:${e.kelasId}`, e.jp]))
  );
  const [openMapel, setOpenMapel] = useState<Set<string>>(
    () => new Set(existing.map((e) => e.mapelId))
  );
  const [query, setQuery] = useState("");

  function toggle(mapelId: string, kelasId: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      const key = `${mapelId}:${kelasId}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, 2);
      }
      return next;
    });
  }

  function setJp(mapelId: string, kelasId: string, jp: number) {
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(`${mapelId}:${kelasId}`, jp);
      return next;
    });
  }

  function toggleOpen(mapelId: string) {
    setOpenMapel((prev) => {
      const next = new Set(prev);
      if (next.has(mapelId)) next.delete(mapelId);
      else next.add(mapelId);
      return next;
    });
  }

  const filteredKelas = useMemo(
    () => kelasList.filter((k) => k.namaKelas.toLowerCase().includes(query.toLowerCase())),
    [kelasList, query]
  );

  const totalJp = Array.from(selected.values()).reduce((s, v) => s + v, 0);
  const totalKelas = new Set(Array.from(selected.keys()).map((k) => k.split(":")[1])).size;
  const totalMapelDipilih = new Set(Array.from(selected.keys()).map((k) => k.split(":")[0])).size;

  // Status JP vs batas maksimum
  const jpStatus: "over" | "under" | "ok" | "no-limit" =
    maksJp === null || maksJp === undefined
      ? "no-limit"
      : totalJp > maksJp
      ? "over"
      : totalJp < maksJp
      ? "under"
      : "ok";

  const sisaJp = maksJp !== null && maksJp !== undefined ? maksJp - totalJp : null;

  return (
    <div className="space-y-3 border-t border-zinc-200 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Mengajar Apa Saja</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Centang mapel dan kelas yang diampu. Boleh pilih lebih dari satu
            mapel, dan lebih dari satu kelas untuk tiap mapel.
          </p>
        </div>
        {selected.size > 0 && (
          <div
            className={`shrink-0 rounded-md px-3 py-1.5 text-right text-xs ${
              jpStatus === "over"
                ? "bg-red-50 text-red-700"
                : jpStatus === "under"
                ? "bg-amber-50 text-amber-700"
                : jpStatus === "ok"
                ? "bg-green-50 text-green-700"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            <p className="font-medium">
              {totalMapelDipilih} mapel · {totalKelas} kelas
            </p>
            <p>
              {totalJp} JP/minggu
              {maksJp !== null && maksJp !== undefined && ` dari maks ${maksJp} JP`}
            </p>
          </div>
        )}
      </div>

      {/* Announce / warning JP */}
      {selected.size > 0 && maksJp !== null && maksJp !== undefined && (
        <>
          {jpStatus === "over" && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <span className="mt-0.5 text-base">⚠️</span>
              <span>
                <strong>JP melebihi batas!</strong> Total {totalJp} JP/minggu melampaui
                batas maksimum {maksJp} JP. Kelebihan:{" "}
                <strong>{totalJp - maksJp} JP</strong>. Kurangi pilihan kelas/mapel atau
                turunkan JP-nya.
              </span>
            </div>
          )}
          {jpStatus === "under" && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span className="mt-0.5 text-base">ℹ️</span>
              <span>
                <strong>JP belum terpenuhi.</strong> Total {totalJp} JP/minggu, masih
                kurang <strong>{Math.abs(sisaJp!)} JP</strong> dari batas maksimum{" "}
                {maksJp} JP.
              </span>
            </div>
          )}
          {jpStatus === "ok" && (
            <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <span className="mt-0.5 text-base">✅</span>
              <span>
                JP terpenuhi tepat sesuai batas maksimum ({maksJp} JP/minggu).
              </span>
            </div>
          )}
        </>
      )}

      {!periodeAktif ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Belum ada Periode Akademik aktif. Aktifkan dulu di Master Data &gt;
          Periode Akademik sebelum mengatur penugasan mengajar.
        </div>
      ) : mapelList.length === 0 ? (
        <p className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-400">
          Belum ada data mata pelajaran. Tambahkan mapel dulu di Master Data
          &gt; Mata Pelajaran.
        </p>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kelas..."
            className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />

          <div className="space-y-2">
            {mapelList.map((m) => {
              const countInMapel = kelasList.filter((k) =>
                selected.has(`${m.id}:${k.id}`)
              ).length;
              const isOpen = openMapel.has(m.id);
              return (
                <div
                  key={m.id}
                  className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleOpen(m.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-zinc-50"
                  >
                    <div className="flex items-center gap-2">
                      <MapelBadge nama={m.namaMapel} kode={m.kodeMapel} />
                      {countInMapel > 0 && (
                        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
                          {countInMapel} kelas
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">
                      {isOpen ? "Sembunyikan ▲" : "Pilih kelas ▼"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 p-3 sm:grid-cols-3 md:grid-cols-4">
                      {filteredKelas.map((k) => {
                        const key = `${m.id}:${k.id}`;
                        const checked = selected.has(key);
                        return (
                          <label
                            key={k.id}
                            className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition-colors ${
                              checked
                                ? "border-zinc-900 bg-zinc-50"
                                : "border-zinc-200 hover:bg-zinc-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(m.id, k.id)}
                              className="shrink-0 rounded border-zinc-300"
                            />
                            <span className="flex-1 truncate">{k.namaKelas}</span>
                            {checked && (
                              <input
                                type="number"
                                min={1}
                                value={selected.get(key)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  setJp(
                                    m.id,
                                    k.id,
                                    Math.max(1, parseInt(e.target.value, 10) || 1)
                                  )
                                }
                                title="JP/minggu"
                                className="w-12 shrink-0 rounded border border-zinc-300 px-1 py-0.5 text-xs"
                              />
                            )}
                          </label>
                        );
                      })}
                      {filteredKelas.length === 0 && (
                        <p className="col-span-full text-xs text-zinc-400">
                          Tidak ada kelas yang cocok dengan pencarian.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Data terpilih dikirim sebagai array paralel, dibaca server
              action dengan formData.getAll(...) */}
          {Array.from(selected.entries()).map(([key, jp]) => {
            const [mapelId, kelasId] = key.split(":");
            return (
              <Fragment key={key}>
                <input type="hidden" name="mengajarMapelId" value={mapelId} />
                <input type="hidden" name="mengajarKelasId" value={kelasId} />
                <input type="hidden" name="mengajarJp" value={jp} />
              </Fragment>
            );
          })}
        </>
      )}
    </div>
  );
}
