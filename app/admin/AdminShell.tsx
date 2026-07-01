"use client";

import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";
import SidebarNav from "./SidebarNav";

const BREAKPOINT = 1100;

export default function AdminShell({
  nama,
  role,
  periodeLabel,
  children,
}: {
  nama: string;
  role: string;
  periodeLabel: string | null;
  children: React.ReactNode;
}) {
  // isDesktop = layar lebar → sidebar statis, selalu kelihatan, dorong konten.
  // !isDesktop (sempit / split-screen / HP) → sidebar overlay, default tertutup,
  // bisa dibuka-tutup manual lewat tombol toggle.
  const [isDesktop, setIsDesktop] = useState(true);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const applyByWidth = () => {
      const desktop = window.innerWidth >= BREAKPOINT;
      setIsDesktop(desktop);
      setOpen(desktop); // statis-kebuka di desktop, tertutup di mobile/split
    };
    applyByWidth();
    setHydrated(true);
    window.addEventListener("resize", applyByWidth);
    return () => window.removeEventListener("resize", applyByWidth);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100vw",
        background: "var(--bg)",
        position: "relative",
        overflowX: "hidden", // root shell tidak boleh melebarkan viewport
      }}
    >

      {/* ── Sidebar: statis di desktop, overlay di layar sempit ── */}
      <aside
        style={{
          position: isDesktop ? "relative" : "fixed",
          top: 0,
          left: 0,
          width: 230,
          minWidth: 230,
          flexShrink: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 40,
          transform: isDesktop ? "none" : (open ? "translateX(0)" : "translateX(-100%)"),
          transition: !isDesktop && hydrated ? "transform 0.2s ease" : "none",
          boxShadow: !isDesktop && open ? "2px 0 16px rgba(0,0,0,0.12)" : "none",
        }}
      >
        <SidebarNav nama={nama} role={role} periodeLabel={periodeLabel} />
        <div style={{ padding: "0 16px 14px", flexShrink: 0, background: "var(--sb-bg)", borderRight: "1px solid var(--sb-border)" }}>
          <LogoutButton />
        </div>
      </aside>

      {/* ── Backdrop, cuma di mode overlay (layar sempit) saat lagi kebuka ── */}
      {!isDesktop && open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.25)", zIndex: 30 }}
        />
      )}

      {/* ── Tombol toggle, cuma muncul di layar sempit/split ── */}
      {!isDesktop && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          style={{
            position: "fixed",
            top: 14,
            left: open ? 242 : 14,
            zIndex: 50,
            width: 36,
            height: 36,
            borderRadius: 9,
            border: "1px solid var(--sb-border, #e2e8f0)",
            background: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            cursor: "pointer",
            transition: hydrated ? "left 0.2s ease" : "none",
          }}
        >
          {open ? "◀" : "☰"}
        </button>
      )}

      {/* ── Konten utama ──
          flex: 1 + minWidth: 0 + width: 100% = flex item ini TIDAK BOLEH
          melebar mengikuti ukuran konten anaknya (mis. tabel lebar).
          Scroll horizontal harus terjadi DI DALAM children (overflow-x-auto
          pada wrapper tabel), bukan mendorong <main> ini sendiri. */}
      <main
        className="overflow-y-auto"
        style={{
          flex: "1 1 0%",
          width: "100%",
          minWidth: 0,
          minHeight: 0,
          height: "100vh",
          maxWidth: "100%",
          overflowX: "hidden",
          padding: isDesktop ? "32px 36px" : "32px 20px 32px 64px",
        }}
      >
        <div style={{ maxWidth: 1400, width: "100%", margin: "0 auto" }} className="anim-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
