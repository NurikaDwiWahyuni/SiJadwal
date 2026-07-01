"use client";

import { useState, useEffect, useRef } from "react";

type JadwalSlot     = { namaSlot: string; jamMulai: string | null; jamSelesai: string | null; kelas: string; mapel: string };
type JadwalMingguSlot = JadwalSlot & { hari: string };
type Ekskul         = { nama: string; hari: string; jamMulai: string; jamSelesai: string; lokasi: string | null };
type GuruResult     = {
  id: string; nama: string; kodeGuru: string; status: string;
  hariIni: string | null;
  jadwalHariIni: JadwalSlot[];
  jadwalMinggu: JadwalMingguSlot[];
  piket: string[]; piketHariIni: boolean; piketBesok: boolean; hariBesok: string | null;
  ekskul: Ekskul[];
};

const HARI: Record<string, string> = { SENIN:"Senin", SELASA:"Selasa", RABU:"Rabu", KAMIS:"Kamis", JUMAT:"Jumat", SABTU:"Sabtu" };

function jam(m: string | null, s: string | null) {
  if (m && s) return `${m}–${s}`;
  return m ?? s ?? "—";
}

function groupHari(slots: JadwalMingguSlot[]) {
  const r: Record<string, JadwalMingguSlot[]> = {};
  for (const s of slots) { if (!r[s.hari]) r[s.hari] = []; r[s.hari].push(s); }
  return r;
}

export default function CariJadwalForm() {
  const [query,    setQuery]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [results,  setResults]  = useState<GuruResult[] | null>(null);
  const [selected, setSelected] = useState<GuruResult | null>(null);
  const [tab,      setTab]      = useState<"hari-ini" | "mingguan">("hari-ini");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) { setResults(null); setSelected(null); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/cari-guru?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.guru);
        if (data.guru.length === 1) setSelected(data.guru[0]); else setSelected(null);
      } finally { setLoading(false); }
    }, 380);
  }, [query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Search input */}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ketik nama guru… (min. 2 huruf)"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "13px 16px 13px 42px",
            border: "1.5px solid #e2e8f0",
            borderRadius: 12,
            fontSize: 15,
            fontFamily: "inherit",
            color: "#0f172a",
            background: "#f8fafc",
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#3b82f6";
            e.target.style.boxShadow   = "0 0 0 3px rgba(59,130,246,0.12)";
            e.target.style.background  = "#fff";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e2e8f0";
            e.target.style.boxShadow   = "none";
            e.target.style.background  = "#f8fafc";
          }}
        />
        {loading && (
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#94a3b8" }}>
            Mencari…
          </span>
        )}
      </div>

      {/* List hasil > 1 */}
      {results && results.length > 1 && !selected && (
        <div style={{ borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          {results.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setSelected(g)}
              style={{
                width: "100%", textAlign: "left",
                padding: "11px 16px",
                border: "none",
                borderTop: i > 0 ? "1px solid #f1f5f9" : "none",
                background: "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 10,
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f7ff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #2563eb, #60a5fa)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 13, fontWeight: 700,
              }}>
                {g.nama.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>{g.nama}</p>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{g.kodeGuru} · {g.status}</p>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>→</span>
            </button>
          ))}
        </div>
      )}

      {/* Tidak ditemukan */}
      {results && results.length === 0 && (
        <div style={{ textAlign: "center", padding: "28px 0" }}>
          <p style={{ fontSize: 28, margin: "0 0 8px" }}>🔎</p>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>Guru &ldquo;{query}&rdquo; tidak ditemukan.</p>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>Coba cek ejaan atau gunakan nama lain.</p>
        </div>
      )}

      {/* Kartu detail guru */}
      {selected && (
        <div style={{ borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }} className="anim-scale-in">

          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
            padding: "18px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 16, fontWeight: 700,
                flexShrink: 0,
              }}>
                {selected.nama.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>{selected.nama}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "2px 0 0" }}>
                  {selected.kodeGuru} · {selected.status}
                </p>
              </div>
            </div>
            {results && results.length > 1 && (
              <button
                onClick={() => setSelected(null)}
                style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit" }}
              >
                ← Ganti
              </button>
            )}
          </div>

          {/* Peringatan piket */}
          {(selected.piketHariIni || selected.piketBesok) && (
            <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", padding: "10px 20px" }}>
              {selected.piketHariIni && (
                <p style={{ fontSize: 13, fontWeight: 600, color: "#92400e", margin: "0 0 2px", display: "flex", alignItems: "center", gap: 6 }}>
                  🔔 Hari ini jadwal piket Anda.
                </p>
              )}
              {selected.piketBesok && (
                <p style={{ fontSize: 13, fontWeight: 600, color: "#92400e", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  🔔 Besok ({selected.hariBesok ? HARI[selected.hariBesok] : ""}) jadwal piket Anda.
                </p>
              )}
            </div>
          )}

          {/* Tab */}
          <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
            {(["hari-ini", "mingguan"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: "12px 8px",
                  fontSize: 13, fontWeight: tab === t ? 700 : 500,
                  color: tab === t ? "#1d4ed8" : "#94a3b8",
                  background: "none", border: "none",
                  borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent",
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {t === "hari-ini" ? `Hari Ini${selected.hariIni ? ` (${HARI[selected.hariIni]})` : ""}` : "Jadwal Mingguan"}
              </button>
            ))}
          </div>

          {/* Isi tab */}
          <div style={{ background: "#fff", padding: "20px" }}>

            {/* ── HARI INI ── */}
            {tab === "hari-ini" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Bagian judul="Jadwal Mengajar Hari Ini">
                  {selected.jadwalHariIni.length === 0
                    ? <Kosong teks="Tidak ada jadwal mengajar hari ini." />
                    : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {selected.jadwalHariIni.map((j, i) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 12px", borderRadius: 10,
                            background: "#f8fafc", border: "1px solid #f1f5f9",
                          }}>
                            <span style={{ fontSize: 11, color: "#94a3b8", minWidth: 40, fontWeight: 500 }}>{j.namaSlot}</span>
                            <span style={{ fontSize: 11, color: "#94a3b8", minWidth: 72, whiteSpace: "nowrap" }}>{jam(j.jamMulai, j.jamSelesai)}</span>
                            <span style={{
                              fontSize: 11, fontWeight: 700, color: "#1d4ed8",
                              background: "#eff6ff", borderRadius: 6, padding: "2px 7px",
                            }}>{j.kelas}</span>
                            <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{j.mapel}</span>
                          </div>
                        ))}
                      </div>
                    )}
                </Bagian>

                <Bagian judul="Jadwal Piket">
                  {selected.piket.length === 0
                    ? <Kosong teks="Tidak ada jadwal piket." />
                    : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {selected.piket.map((h) => (
                          <span key={h} style={{
                            padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                            background: h === selected.hariIni ? "#1d4ed8" : "#f1f5f9",
                            color: h === selected.hariIni ? "#fff" : "#475569",
                          }}>{HARI[h] ?? h}</span>
                        ))}
                      </div>
                    )}
                </Bagian>

                <Bagian judul="Ekstrakurikuler yang Dibina">
                  {selected.ekskul.length === 0
                    ? <Kosong teks="Tidak ada ekstrakurikuler." />
                    : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {selected.ekskul.map((e, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 16 }}>⚽</span>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>{e.nama}</p>
                              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                                {HARI[e.hari]}, {e.jamMulai}–{e.jamSelesai}{e.lokasi ? ` · ${e.lokasi}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </Bagian>
              </div>
            )}

            {/* ── MINGGUAN ── */}
            {tab === "mingguan" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Bagian judul="Jadwal Mengajar Mingguan">
                  {selected.jadwalMinggu.length === 0
                    ? <Kosong teks="Belum ada jadwal mengajar." />
                    : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {Object.entries(groupHari(selected.jadwalMinggu)).map(([hari, slots]) => (
                          <div key={hari}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>
                              {HARI[hari] ?? hari}
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {slots.map((j, i) => (
                                <div key={i} style={{
                                  display: "flex", alignItems: "center", gap: 10,
                                  padding: "7px 12px", borderRadius: 9,
                                  background: "#f8fafc", border: "1px solid #f1f5f9",
                                }}>
                                  <span style={{ fontSize: 11, color: "#94a3b8", minWidth: 40, fontWeight: 500 }}>{j.namaSlot}</span>
                                  <span style={{ fontSize: 11, color: "#94a3b8", minWidth: 72, whiteSpace: "nowrap" }}>{jam(j.jamMulai, j.jamSelesai)}</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", borderRadius: 6, padding: "2px 7px" }}>{j.kelas}</span>
                                  <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{j.mapel}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </Bagian>

                <Bagian judul="Jadwal Piket">
                  {selected.piket.length === 0
                    ? <Kosong teks="Tidak ada jadwal piket." />
                    : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {selected.piket.map((h) => (
                          <span key={h} style={{ padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "#f1f5f9", color: "#475569" }}>
                            {HARI[h] ?? h}
                          </span>
                        ))}
                      </div>
                    )}
                </Bagian>

                <Bagian judul="Ekstrakurikuler yang Dibina">
                  {selected.ekskul.length === 0
                    ? <Kosong teks="Tidak ada ekstrakurikuler." />
                    : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {selected.ekskul.map((e, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 16 }}>⚽</span>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>{e.nama}</p>
                              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                                {HARI[e.hari]}, {e.jamMulai}–{e.jamSelesai}{e.lokasi ? ` · ${e.lokasi}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </Bagian>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8", margin: "0 0 8px" }}>
        {judul}
      </p>
      {children}
    </div>
  );
}

function Kosong({ teks }: { teks: string }) {
  return <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>{teks}</p>;
}
