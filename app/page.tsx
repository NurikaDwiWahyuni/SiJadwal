import { prisma } from "@/lib/prisma";
import CariJadwalForm from "./CariJadwalForm";
import AnimatedBackground from "./AnimatedBackground";

export default async function HomePage() {
  const identitas = await prisma.identitasSekolah.findUnique({ where: { id: 1 } });
  const namaSekolah = identitas?.namaSekolah ?? "Sekolah Anda";

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
        <div style={{ width: "100%", maxWidth: 500 }}>

          {/* ── Selamat Datang ── */}
          <div style={{ textAlign: "center", marginBottom: 36, animation: "fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) both" }}>

            {/* Logo / ikon */}
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 80, height: 80, borderRadius: 24,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(245,158,11,0.35), 0 0 0 6px rgba(245,158,11,0.1)",
              marginBottom: 22,
              animation: "bounceIn 0.7s cubic-bezier(.22,.68,0,1.4) 0.1s both",
            }}>
              <img src="/logo-app.png" alt="SiJadwal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            {/* Selamat datang */}
            <p style={{
              fontSize: 13, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#f59e0b",
              marginBottom: 8,
              animation: "fadeUp 0.5s ease 0.15s both",
            }}>
              Selamat Datang di
            </p>

            {/* Nama aplikasi */}
            <h1 style={{
              fontSize: "clamp(36px, 8vw, 52px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              margin: "0 0 10px",
              animation: "fadeUp 0.5s ease 0.2s both",
            }}>
              <span style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ec4899 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                SiJadwal
              </span>
            </h1>

            {/* Tagline */}
            <p style={{
              fontSize: 14, color: "#78716c", margin: "0 0 16px", lineHeight: 1.6,
              animation: "fadeUp 0.5s ease 0.25s both",
            }}>
              Sistem Informasi Penjadwalan Sekolah
            </p>

            {/* Badge nama sekolah */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 99, padding: "7px 18px",
              animation: "fadeUp 0.5s ease 0.3s both",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#44403c" }}>{namaSekolah}</span>
            </div>
          </div>

          {/* ── Card form pencarian ── */}
          <div style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: 24,
            boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.8)",
            overflow: "hidden",
            marginBottom: 20,
            animation: "fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) 0.38s both",
          }}>
            {/* Rainbow strip */}
            <div style={{
              height: 4,
              background: "linear-gradient(90deg, #f59e0b, #f97316, #ec4899, #8b5cf6, #10b981, #f59e0b)",
              backgroundSize: "300% 100%",
              animation: "rainbowShift 4s linear infinite",
            }} />
            <div style={{ padding: "24px 28px 30px" }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: "#a8a29e",
                letterSpacing: "0.08em", textTransform: "uppercase",
                marginBottom: 14,
              }}>
                🔍 Cari Jadwal Guru
              </p>
              <CariJadwalForm />
            </div>
          </div>

          {/* ── Fitur ── */}
          <div style={{
            display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
            marginBottom: 24,
            animation: "fadeUp 0.5s ease 0.52s both",
          }}>
            {[
              { icon: "📅", label: "Jadwal Mengajar", color: "#fef9c3", border: "#fde68a" },
              { icon: "📋", label: "Piket Harian",    color: "#d1fae5", border: "#a7f3d0" },
              { icon: "⚽", label: "Ekstrakurikuler", color: "#ede9fe", border: "#c4b5fd" },
            ].map((f) => (
              <span key={f.label} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 99,
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
              padding: "6px 14px", borderRadius: 8,
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(0,0,0,0.06)",
              transition: "background 0.15s",
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
            0%   { opacity: 0; transform: scale(0.4); }
            70%  { transform: scale(1.08); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes pulse {
            0%,100% { opacity: 1; transform: scale(1); }
            50%     { opacity: 0.4; transform: scale(0.75); }
          }
          @keyframes rainbowShift {
            0%   { background-position: 0% 0%; }
            100% { background-position: 300% 0%; }
          }
        `}</style>
      </main>
    </>
  );
}
