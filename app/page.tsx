import { prisma } from "@/lib/prisma";
import CariJadwalForm from "./CariJadwalForm";
import AnimatedBackground from "./AnimatedBackground";

export default async function HomePage() {
  const identitas = await prisma.identitasSekolah.findUnique({ where: { id: 1 } });
  const namaSekolah = identitas?.namaSekolah ?? "Sistem Penjadwalan Sekolah";

  return (
    <>
      <AnimatedBackground />

      <main style={{
        minHeight: "100vh",
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
      }}>
        <div style={{ width: "100%", maxWidth: 480 }}>

          {/* ── Header ── */}
          <div style={{ textAlign: "center", marginBottom: 32, animation: "fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) both" }}>

            {/* Ikon */}
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 72, height: 72, borderRadius: 22,
              background: "#fff",
              boxShadow: "0 4px 24px rgba(251,191,36,0.2), 0 0 0 1px rgba(0,0,0,0.06)",
              fontSize: 34, marginBottom: 20,
              animation: "bounceIn 0.7s cubic-bezier(.22,.68,0,1.4) 0.1s both",
            }}>🏫</div>

            {/* Badge sekolah */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(251,191,36,0.3)",
              borderRadius: 99, padding: "5px 14px",
              marginBottom: 14,
              animation: "fadeUp 0.5s ease 0.15s both",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#92400e", letterSpacing: "0.04em" }}>{namaSekolah}</span>
            </div>

            <h1 style={{
              fontSize: "clamp(28px, 6vw, 42px)",
              fontWeight: 800,
              color: "#1c1917",
              letterSpacing: "-0.035em",
              lineHeight: 1.1,
              margin: "0 0 12px",
              animation: "fadeUp 0.5s ease 0.2s both",
            }}>
              Cari Jadwal{" "}
              <span style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ec4899 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Guru
              </span>
            </h1>

            <p style={{
              fontSize: 15, color: "#78716c", margin: 0, lineHeight: 1.65,
              animation: "fadeUp 0.5s ease 0.28s both",
            }}>
              Jadwal mengajar, piket harian & ekstrakurikuler<br />semua ada di sini.
            </p>
          </div>

          {/* ── Card form ── */}
          <div style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: 24,
            boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.8)",
            overflow: "hidden",
            marginBottom: 16,
            animation: "fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) 0.35s both",
          }}>
            {/* Rainbow strip */}
            <div style={{
              height: 4,
              background: "linear-gradient(90deg, #f59e0b 0%, #f97316 25%, #ec4899 50%, #8b5cf6 75%, #10b981 100%)",
              backgroundSize: "200% 100%",
              animation: "rainbowShift 4s linear infinite",
            }} />
            <div style={{ padding: "28px 28px 32px" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#a8a29e", margin: "0 0 16px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                🔍 Pencarian Guru
              </p>
              <CariJadwalForm />
            </div>
          </div>

          {/* ── Pill fitur ── */}
          <div style={{
            display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
            marginBottom: 20,
            animation: "fadeUp 0.5s ease 0.5s both",
          }}>
            {[
              { icon: "📅", label: "Jadwal Mengajar", color: "#fef3c7", border: "#fde68a" },
              { icon: "📋", label: "Piket Harian",    color: "#d1fae5", border: "#a7f3d0" },
              { icon: "⚽", label: "Ekstrakurikuler", color: "#ede9fe", border: "#c4b5fd" },
            ].map((f) => (
              <span key={f.label} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 99,
                background: f.color, border: `1px solid ${f.border}`,
                fontSize: 12, fontWeight: 600, color: "#44403c",
              }}>
                {f.icon} {f.label}
              </span>
            ))}
          </div>

          {/* ── Link admin ── */}
          <div style={{ textAlign: "center", animation: "fadeUp 0.5s ease 0.6s both" }}>
            <a href="/login" style={{
              fontSize: 12, color: "#a8a29e", textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 8,
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}>
              🔐 <span style={{ textDecorationLine: "underline", textDecorationStyle: "dotted" }}>
                Masuk sebagai Admin
              </span>
            </a>
          </div>
        </div>

        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes bounceIn {
            0%   { opacity: 0; transform: scale(0.5); }
            70%  { transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes pulse {
            0%,100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.4; transform: scale(0.75); }
          }
          @keyframes rainbowShift {
            0%   { background-position: 0% 0%; }
            100% { background-position: 200% 0%; }
          }
        `}</style>
      </main>
    </>
  );
}
