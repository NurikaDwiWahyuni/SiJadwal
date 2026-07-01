"use client";

export default function AnimatedBackground() {
  return (
    <>
      <style>{`
        /* ── Latar utama ── */
        .bg-root {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: #fffdf7;
        }

        /* Gradien bergerak */
        .bg-mesh {
          position: absolute;
          inset: -50%;
          width: 200%;
          height: 200%;
          background:
            radial-gradient(ellipse 60% 50% at 20% 20%, rgba(251,191,36,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 80% 10%, rgba(167,243,208,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 55% 45% at 60% 80%, rgba(196,181,253,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 40% 50% at 10% 70%, rgba(253,186,116,0.10) 0%, transparent 60%),
            #fffdf7;
          animation: meshMove 18s ease-in-out infinite alternate;
        }
        @keyframes meshMove {
          0%   { transform: translate(0%,    0%)    scale(1); }
          33%  { transform: translate(-3%,   2%)    scale(1.04); }
          66%  { transform: translate(2%,   -3%)    scale(0.97); }
          100% { transform: translate(-1%,   1%)    scale(1.02); }
        }

        /* Bola melayang 1 */
        .orb-1 {
          position: absolute;
          width: 480px; height: 480px;
          border-radius: 50%;
          top: -100px; left: -80px;
          background: radial-gradient(circle at 40% 40%, rgba(251,191,36,0.22), transparent 70%);
          animation: float1 9s ease-in-out infinite;
          filter: blur(2px);
        }
        /* Bola melayang 2 */
        .orb-2 {
          position: absolute;
          width: 380px; height: 380px;
          border-radius: 50%;
          bottom: -60px; right: -60px;
          background: radial-gradient(circle at 60% 60%, rgba(16,185,129,0.16), transparent 70%);
          animation: float2 11s ease-in-out infinite;
          filter: blur(3px);
        }
        /* Bola melayang 3 */
        .orb-3 {
          position: absolute;
          width: 280px; height: 280px;
          border-radius: 50%;
          top: 40%; right: 10%;
          background: radial-gradient(circle at 50% 50%, rgba(139,92,246,0.13), transparent 70%);
          animation: float3 13s ease-in-out infinite;
          filter: blur(2px);
        }
        /* Bola melayang 4 (kecil, hangat) */
        .orb-4 {
          position: absolute;
          width: 200px; height: 200px;
          border-radius: 50%;
          top: 60%; left: 15%;
          background: radial-gradient(circle at 50% 50%, rgba(249,115,22,0.10), transparent 70%);
          animation: float4 10s ease-in-out infinite;
          filter: blur(1px);
        }

        @keyframes float1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(40px, 30px) scale(1.08); }
        }
        @keyframes float2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-30px,-40px) scale(1.06); }
        }
        @keyframes float3 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-20px, 30px) scale(1.1); }
          80%      { transform: translate(20px,-20px) scale(0.95); }
        }
        @keyframes float4 {
          0%,100% { transform: translate(0,0); }
          50%      { transform: translate(30px,-25px) scale(1.12); }
        }

        /* Grid titik samar */
        .bg-dots {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        /* Garis diagonal samar */
        .bg-lines {
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 60px,
            rgba(251,191,36,0.03) 60px,
            rgba(251,191,36,0.03) 61px
          );
        }

        /* Partikel kecil melayang */
        .particle {
          position: absolute;
          border-radius: 50%;
          animation: particleFloat linear infinite;
          opacity: 0;
        }
        @keyframes particleFloat {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-120px) translateX(var(--dx)) scale(0.5); opacity: 0; }
        }
      `}</style>

      <div className="bg-root" aria-hidden>
        <div className="bg-mesh" />
        <div className="orb-1" />
        <div className="orb-2" />
        <div className="orb-3" />
        <div className="orb-4" />
        <div className="bg-dots" />
        <div className="bg-lines" />

        {/* Partikel kecil */}
        {[
          { size: 6,  top: "75%", left: "12%",  color: "rgba(251,191,36,0.5)",  dur: "7s",  delay: "0s" },
          { size: 4,  top: "80%", left: "28%",  color: "rgba(16,185,129,0.4)",  dur: "9s",  delay: "1s" },
          { size: 8,  top: "85%", left: "45%",  color: "rgba(139,92,246,0.35)", dur: "11s", delay: "2s" },
          { size: 5,  top: "70%", left: "62%",  color: "rgba(249,115,22,0.4)",  dur: "8s",  delay: "0.5s" },
          { size: 7,  top: "78%", left: "78%",  color: "rgba(251,191,36,0.4)",  dur: "10s", delay: "3s" },
          { size: 4,  top: "88%", left: "20%",  color: "rgba(16,185,129,0.3)",  dur: "6s",  delay: "1.5s" },
          { size: 5,  top: "72%", left: "55%",  color: "rgba(249,115,22,0.35)", dur: "12s", delay: "4s" },
          { size: 6,  top: "82%", left: "88%",  color: "rgba(139,92,246,0.3)",  dur: "8.5s",delay: "2.5s" },
        ].map((p, i) => (
          <span
            key={i}
            className="particle"
            style={{
              width: p.size, height: p.size,
              top: p.top, left: p.left,
              background: p.color,
              animationDuration: p.dur,
              animationDelay: p.delay,
              ["--dx" as string]: `${(i % 2 === 0 ? 1 : -1) * (10 + i * 5)}px`,
            }}
          />
        ))}
      </div>
    </>
  );
}
