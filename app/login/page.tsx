import LoginForm from "./LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg, #fafaf9 0%, #fff7ed 50%, #fefce8 100%)",
      padding: "24px 16px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Dekorasi lingkaran latar */}
      <div style={{
        position: "absolute", top: "-80px", right: "-80px",
        width: 320, height: 320, borderRadius: "50%",
        background: "rgba(59,130,246,0.08)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-60px", left: "-60px",
        width: 240, height: 240, borderRadius: "50%",
        background: "rgba(99,102,241,0.07)", pointerEvents: "none",
      }} />

      {/* Card login */}
      <div className="anim-scale-in" style={{
        width: "100%", maxWidth: 420,
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.05)",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}>

        {/* Header card */}
        <div style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
          padding: "36px 32px 28px",
          textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: 16,
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: 30,
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}>
            🏫
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
            SiJadwal
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
            Sistem Penjadwalan Sekolah
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: "32px 32px 28px" }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
            Selamat datang! 👋
          </p>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24 }}>
            Masuk untuk mengelola jadwal pelajaran
          </p>

          <LoginForm />

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link
              href="/"
              style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}
            >
              ← Kembali ke halaman cari jadwal guru
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
