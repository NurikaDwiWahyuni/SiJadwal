"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapelBadge } from "@/lib/mapel-color";
import { deleteBeban } from "./actions";

type BebanRow = {
  id: string;
  jp: number;
  guru: { id: string; nama: string; kodeGuru: string; totalJp: number };
  kelas: { id: string; namaKelas: string };
  mapel: { id: string; namaMapel: string; kodeMapel: string };
};

type GroupBy = "guru" | "kelas" | "mapel";

const GROUP_LABEL: Record<GroupBy, string> = {
  guru: "Guru",
  kelas: "Kelas",
  mapel: "Mata Pelajaran",
};

function matchesQuery(b: BebanRow, q: string) {
  if (!q) return true;
  const hay = `${b.guru.nama} ${b.guru.kodeGuru} ${b.kelas.namaKelas} ${b.mapel.namaMapel} ${b.mapel.kodeMapel}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

export default function BebanMengajarView({
  data,
  initialQuery = "",
  initialGroupBy = "guru",
}: {
  data: BebanRow[];
  initialQuery?: string;
  initialGroupBy?: GroupBy;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [groupBy, setGroupBy] = useState<GroupBy>(initialGroupBy);

  const filtered = useMemo(
    () => data.filter((b) => matchesQuery(b, query)),
    [data, query]
  );

  const groups = useMemo(() => {
    type Group = {
      key: string;
      label: string;
      sub: string;
      totalJpGuru?: number; // hanya untuk groupBy=guru
      rows: BebanRow[];
    };
    const map = new Map<string, Group>();

    for (const b of filtered) {
      let key: string;
      let label: string;
      let sub: string;
      let totalJpGuru: number | undefined;

      if (groupBy === "guru") {
        key = b.guru.id;
        label = b.guru.nama;
        sub = b.guru.kodeGuru;
        totalJpGuru = b.guru.totalJp;
      } else if (groupBy === "kelas") {
        key = b.kelas.id;
        label = b.kelas.namaKelas;
        sub = "";
      } else {
        key = b.mapel.id;
        label = b.mapel.namaMapel;
        sub = b.mapel.kodeMapel;
      }

      const g = map.get(key);
      if (g) {
        g.rows.push(b);
      } else {
        map.set(key, { key, label, sub, totalJpGuru, rows: [b] });
      }
    }

    const list = Array.from(map.values());
    for (const g of list) {
      g.rows.sort((a, b) => {
        if (groupBy === "guru") {
          return a.kelas.namaKelas.localeCompare(b.kelas.namaKelas) || a.mapel.namaMapel.localeCompare(b.mapel.namaMapel);
        }
        if (groupBy === "kelas") {
          return a.mapel.namaMapel.localeCompare(b.mapel.namaMapel) || a.guru.nama.localeCompare(b.guru.nama);
        }
        return a.kelas.namaKelas.localeCompare(b.kelas.namaKelas) || a.guru.nama.localeCompare(b.guru.nama);
      });
    }
    list.sort((a, b) => a.label.localeCompare(b.label));
    return list;
  }, [filtered, groupBy]);

  const totalJpAll = filtered.reduce((s, b) => s + b.jp, 0);
  const totalGuru = new Set(filtered.map((b) => b.guru.id)).size;
  const totalKelas = new Set(filtered.map((b) => b.kelas.id)).size;
  const totalMapel = new Set(filtered.map((b) => b.mapel.id)).size;

  return (
    <div className="space-y-4">
      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard label="Penugasan" value={filtered.length} />
        <SummaryCard label="Guru terlibat" value={totalGuru} />
        <SummaryCard label="Mapel" value={totalMapel} />
        <SummaryCard label="Kelas" value={totalKelas} />
        <SummaryCard label="Total JP/minggu" value={totalJpAll} />
      </div>

      {/* Info cara kerja JP */}
      <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
        <strong>Cara kerja JP:</strong> JP per guru dihitung otomatis dari jumlah JP semua mapel yang mereka ampu di tiap kelas.
        Misalnya guru Poni Kemala mengampu B.Indo di 4 kelas masing-masing 5 JP/minggu → total JP-nya 20 JP.
        JP mapel per kelas diatur di halaman <Link href="/admin/master/mapel" className="underline font-semibold">Master Mapel</Link> (form pengampu per kelas).
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari guru, mapel, atau kelas..."
          className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Kelompokkan per:</span>
          <div className="flex rounded-md border border-zinc-300 bg-white p-0.5">
            {(Object.keys(GROUP_LABEL) as GroupBy[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  groupBy === g ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {GROUP_LABEL[g]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400">
          {data.length === 0 ? "Belum ada data beban mengajar." : "Tidak ada hasil yang cocok."}
        </div>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <GroupCard key={g.key} group={g} groupBy={groupBy} />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

function GroupCard({
  group,
  groupBy,
}: {
  group: {
    key: string;
    label: string;
    sub: string;
    totalJpGuru?: number;
    rows: BebanRow[];
  };
  groupBy: GroupBy;
}) {
  const rows = group.rows;
  const jpSum = rows.reduce((s, b) => s + b.jp, 0); // JP mapel ini saja
  const distinctMapel = new Set(rows.map((r) => r.mapel.id)).size;
  const distinctKelas = new Set(rows.map((r) => r.kelas.id)).size;
  const distinctGuru = new Set(rows.map((r) => r.guru.id)).size;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-900">{group.label}</span>
          {group.sub && (
            <span className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
              {group.sub}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {groupBy === "guru" && (
            <>
              <Pill>{distinctMapel} mapel</Pill>
              <Pill>{distinctKelas} kelas</Pill>
              {/* JP dari filter ini */}
              <Pill>{jpSum} JP (filter ini)</Pill>
              {/* Total JP guru dari semua mapel */}
              {group.totalJpGuru !== undefined && (
                <span className="rounded-full bg-zinc-900 text-white px-2.5 py-0.5 font-semibold text-[11px]">
                  {group.totalJpGuru} JP total
                </span>
              )}
            </>
          )}
          {groupBy === "kelas" && (
            <>
              <Pill highlight={distinctMapel > 1}>{distinctMapel} mapel</Pill>
              <Pill>{distinctGuru} guru</Pill>
              <Pill>{jpSum} JP/minggu</Pill>
            </>
          )}
          {groupBy === "mapel" && (
            <>
              <Pill highlight={distinctGuru > 1}>
                {distinctGuru} guru{distinctGuru > 1 ? " (beda kelas)" : ""}
              </Pill>
              <Pill>{distinctKelas} kelas</Pill>
              <Pill>{jpSum} JP/minggu total</Pill>
            </>
          )}
        </div>
      </div>

      <table className="w-full text-sm">
        <tbody className="divide-y divide-zinc-100">
          {rows.map((b) => (
            <tr key={b.id} className="hover:bg-zinc-50/50">
              {/* Kolom mapel */}
              {groupBy !== "mapel" && (
                <td className="w-44 px-4 py-2.5">
                  <MapelBadge nama={b.mapel.namaMapel} kode={b.mapel.kodeMapel} />
                </td>
              )}
              {/* Kolom kelas atau guru */}
              {groupBy === "guru" && (
                <td className="px-4 py-2.5 font-medium text-zinc-900">{b.kelas.namaKelas}</td>
              )}
              {groupBy === "kelas" && (
                <td className="px-4 py-2.5 text-zinc-700">
                  {b.guru.nama}{" "}
                  <span className="font-mono text-[11px] text-zinc-400">({b.guru.kodeGuru})</span>
                </td>
              )}
              {groupBy === "mapel" && (
                <>
                  <td className="w-36 px-4 py-2.5 font-medium text-zinc-900">{b.kelas.namaKelas}</td>
                  <td className="px-4 py-2.5 text-zinc-600 text-xs">
                    {b.guru.nama}{" "}
                    <span className="font-mono text-zinc-400">({b.guru.kodeGuru})</span>
                  </td>
                </>
              )}
              {/* JP per kelas — tombol stepper tidak bisa di sini (readonly), arahkan ke edit */}
              <td className="w-28 px-4 py-2.5">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-zinc-800">{b.jp}</span>
                  <span className="text-xs text-zinc-400">JP/mgg</span>
                </div>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex justify-end gap-3 text-xs">
                  <Link
                    href={`/admin/master/mapel/${b.mapel.id}`}
                    className="text-zinc-600 hover:underline"
                  >
                    Edit JP
                  </Link>
                  <form action={deleteBeban}>
                    <input type="hidden" name="id" value={b.id} />
                    <button type="submit" className="text-red-600 hover:underline">
                      Hapus
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pill({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] ${highlight ? "bg-amber-100 font-medium text-amber-700" : "bg-zinc-100 text-zinc-500"}`}>
      {children}
    </span>
  );
}
