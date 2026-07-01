"use client";

import { useState, useEffect, useRef } from "react";

type JadwalSlot = {
  namaSlot: string;
  jamMulai: string | null;
  jamSelesai: string | null;
  kelas: string;
  mapel: string;
};
type JadwalMingguSlot = JadwalSlot & { hari: string };
type Ekskul = { nama: string; hari: string; jamMulai: string; jamSelesai: string; lokasi: string | null };
type GuruResult = {
  id: string; nama: string; kodeGuru: string; status: string;
  hariIni: string | null;
  jadwalHariIni: JadwalSlot[];
  jadwalMinggu: JadwalMingguSlot[];
  piket: string[]; piketHariIni: boolean; piketBesok: boolean; hariBesok: string | null;
  ekskul: Ekskul[];
};

const HARI_LABEL: Record<string, string> = {
  SENIN: "Senin", SELASA: "Selasa", RABU: "Rabu",
  KAMIS: "Kamis", JUMAT: "Jumat", SABTU: "Sabtu",
};
const HARI_ORDER = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

function fmt(mulai: string | null, selesai: string | null) {
  if (mulai && selesai) return `${mulai}–${selesai}`;
  return mulai ?? selesai ?? "";
}

function groupByHari(slots: JadwalMingguSlot[]) {
  const map: Record<string, JadwalMingguSlot[]> = {};
  for (const s of slots) { if (!map[s.hari]) map[s.hari] = []; map[s.hari].push(s); }
  return map;
}

export default function SearchSection() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GuruResult[] | null>(null);
  const [selected, setSelected] = useState<GuruResult | null>(null);
  const [tab, setTab] = useState<"hari-ini" | "mingguan">("hari-ini");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults(null); setSelected(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cari-guru?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.guru);
        if (data.guru.length === 1) setSelected(data.guru[0]);
        else setSelected(null);
      } finally { setLoading(false); }
    }, 400);
  }, [query]);

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-2.85z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ketik nama guru…"
          className="w-full rounded-xl border border-white/10 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 backdrop-blur-sm outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
        />
        {loading && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <svg className="h-4 w-4 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </span>
        )}
        {query && !loading && (
          <button onClick={() => { setQuery(""); setResults(null); setSelected(null); inputRef.current?.focus(); }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Daftar hasil */}
      {results && results.length > 1 && !selected && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm divide-y divide-white/5 animate-fade-in-up">
          {results.map((g) => (
            <button key={g.id} onClick={() => setSelected(g)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-xs font-bold text-blue-300">
                {g.nama.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{g.nama}</p>
                <p className="text-xs text-zinc-500">{g.kodeGuru} · {g.status}</p>
              </div>
              <svg className="ml-auto h-4 w-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Tidak ditemukan */}
      {results && results.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-8 text-center animate-fade-in">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-zinc-400">Guru &ldquo;{query}&rdquo; tidak ditemukan.</p>
          <p className="text-xs text-zinc-600 mt-1">Coba gunakan nama lengkap atau nama panggilan lain.</p>
        </div>
      )}

      {/* Kartu detail guru */}
      {selected && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1221]/80 backdrop-blur-md shadow-2xl animate-fade-in-up">
          {/* Header */}
          <div className="relative px-5 py-4 bg-gradient-to-r from-blue-900/60 to-indigo-900/40 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-bold text-white shadow-lg">
                {selected.nama.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{selected.nama}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  <span className="inline-block rounded bg-blue-500/20 text-blue-300 px-1.5 py-0.5 font-mono text-[10px] mr-1">
                    {selected.kodeGuru}
                  </span>
                  {selected.status}
                </p>
              </div>
              {results && results.length > 1 && (
                <button onClick={() => setSelected(null)}
                  className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-400 hover:text-white hover:border-white/20 transition-colors">
                  ← Ganti
                </button>
              )}
            </div>
          </div>

          {/* Peringatan piket */}
          {(selected.piketHariIni || selected.piketBesok) && (
            <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
              {selected.piketHariIni && (
                <p className="flex items-center gap-2 text-sm font-medium text-amber-300">
                  <span className="text-base">🔔</span> Anda bertugas piket hari ini.
                </p>
              )}
              {selected.piketBesok && (
                <p className="flex items-center gap-2 text-sm font-medium text-amber-300 mt-1">
                  <span className="text-base">📅</span>
                  Besok ({selected.hariBesok ? HARI_LABEL[selected.hariBesok] : ""}) jadwal piket Anda.
                </p>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(["hari-ini", "mingguan"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  tab === t
                    ? "text-blue-300 border-b-2 border-blue-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}>
                {t === "hari-ini"
                  ? `Hari Ini${selected.hariIni ? ` · ${HARI_LABEL[selected.hariIni]}` : ""}`
                  : "Jadwal Mingguan"}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-5">
            {tab === "hari-ini" && (
              <>
                <Section label="Mengajar Hari Ini">
                  {selected.jadwalHariIni.length === 0 ? (
                    <Empty text="Tidak ada jadwal mengajar hari ini." />
                  ) : (
                    <div className="space-y-1.5">
                      {selected.jadwalHariIni.map((j, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                          <span className="w-14 shrink-0 text-[10px] font-mono text-zinc-500">{j.namaSlot}</span>
                          <span className="w-20 shrink-0 text-[10px] text-zinc-500 whitespace-nowrap">{fmt(j.jamMulai, j.jamSelesai) || "—"}</span>
                          <span className="font-medium text-white text-xs">{j.kelas}</span>
                          <span className="ml-auto text-xs text-zinc-400">{j.mapel}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section label="Piket">
                  {selected.piket.length === 0 ? <Empty text="Tidak ada jadwal piket." /> : (
                    <div className="flex flex-wrap gap-2">
                      {selected.piket.map((h) => (
                        <span key={h} className={`rounded-full px-3 py-1 text-xs font-medium border ${
                          h === selected.hariIni
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                            : "bg-white/5 border-white/10 text-zinc-400"
                        }`}>{HARI_LABEL[h] ?? h}</span>
                      ))}
                    </div>
                  )}
                </Section>

                <Section label="Ekstrakurikuler">
                  {selected.ekskul.length === 0 ? <Empty text="Tidak ada ekstrakurikuler." /> : (
                    <div className="space-y-2">
                      {selected.ekskul.map((e, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-lg bg-white/5 px-3 py-2">
                          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-white">{e.nama}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              {HARI_LABEL[e.hari]}, {e.jamMulai}–{e.jamSelesai}
                              {e.lokasi ? ` · ${e.lokasi}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}

            {tab === "mingguan" && (
              <>
                <Section label="Jadwal Mengajar Mingguan">
                  {selected.jadwalMinggu.length === 0 ? <Empty text="Belum ada jadwal." /> : (
                    <div className="space-y-4">
                      {HARI_ORDER.filter((h) => groupByHari(selected.jadwalMinggu)[h]).map((hari) => {
                        const slots = groupByHari(selected.jadwalMinggu)[hari];
                        return (
                          <div key={hari}>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400/70 mb-1.5">
                              {HARI_LABEL[hari]}
                            </p>
                            <div className="space-y-1">
                              {slots.map((j, i) => (
                                <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                                  <span className="w-14 shrink-0 text-[10px] font-mono text-zinc-500">{j.namaSlot}</span>
                                  <span className="w-20 shrink-0 text-[10px] text-zinc-500 whitespace-nowrap">{fmt(j.jamMulai, j.jamSelesai) || "—"}</span>
                                  <span className="font-medium text-white text-xs">{j.kelas}</span>
                                  <span className="ml-auto text-xs text-zinc-400">{j.mapel}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-zinc-600 italic">{text}</p>;
}
