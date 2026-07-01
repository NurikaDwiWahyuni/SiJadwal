"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem  = { href: string; label: string; icon: string };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "",
    items: [{ href: "/admin/dashboard", label: "Beranda", icon: "🏠" }],
  },
  {
    title: "Data Utama",
    items: [
      { href: "/admin/master/identitas-sekolah", label: "Identitas Sekolah", icon: "🏫" },
      { href: "/admin/master/guru",              label: "Guru",              icon: "👤" },
      { href: "/admin/master/kelas",             label: "Kelas",             icon: "🚪" },
      { href: "/admin/master/mapel",             label: "Mata Pelajaran",    icon: "📚" },
      { href: "/admin/master/ekstrakurikuler",   label: "Ekstrakurikuler",   icon: "⚽" },
      { href: "/admin/master/slot-waktu",        label: "Slot Waktu",        icon: "🕐" },
    ],
  },
  {
    title: "",
    items: [{ href: "/admin/beban-mengajar", label: "Beban Mengajar", icon: "📋" }],
  },
  {
    title: "Penjadwalan",
    items: [
      { href: "/admin/penjadwalan/slot-terkunci",   label: "Slot Terkunci",    icon: "🔒" },
      { href: "/admin/penjadwalan/generate",        label: "Generate Jadwal",  icon: "⚡" },
      { href: "/admin/penjadwalan/diagnostik",      label: "Diagnostik",       icon: "🔍" },
      { href: "/admin/penjadwalan/kelas",           label: "Jadwal per Kelas", icon: "📅" },
      { href: "/admin/penjadwalan/guru",            label: "Jadwal per Guru",  icon: "📅" },
      { href: "/admin/penjadwalan/cek-bentrok",     label: "Cek Konflik",      icon: "⚠️" },
      { href: "/admin/penjadwalan/ekstrakurikuler", label: "Jadwal Ekskul",    icon: "🗓️" },
    ],
  },
  {
    title: "",
    items: [{ href: "/admin/piket", label: "Piket Guru", icon: "📌" }],
  },
  {
    title: "Laporan",
    items: [
      { href: "/admin/laporan/jadwal", label: "Pratinjau & Ekspor", icon: "📄" },
    ],
  },
];

export default function SidebarNav({
  nama,
  role,
  periodeLabel,
}: {
  nama: string;
  role: string;
  periodeLabel: string | null;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  const initials = nama
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col" style={{ background: "var(--sb-bg)", borderRight: "1px solid var(--sb-border)", flex: 1, minHeight: 0 }}>

      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid var(--sb-border)" }}>
        <div className="flex items-center gap-3 mb-4">
          {/* Icon sekolah */}
          <div style={{
            width: 38, height: 38,
            borderRadius: 10,
            background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
            boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>
            🏫
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>SiJadwal</p>
            <p style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>Sistem Penjadwalan</p>
          </div>
        </div>

        {/* Periode aktif */}
        {periodeLabel ? (
          <div style={{
            background: "var(--brand-50)",
            border: "1px solid var(--brand-100)",
            borderRadius: 8,
            padding: "7px 11px",
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
              Periode Aktif
            </p>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--brand-600)" }}>{periodeLabel}</p>
          </div>
        ) : (
          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 8, padding: "7px 11px",
          }}>
            <p style={{ fontSize: 11, color: "#b45309" }}>⚠️ Belum ada periode aktif</p>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: "thin" }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: group.title ? 20 : 8 }}>
            {group.title && (
              <p style={{
                padding: "0 10px",
                marginBottom: 4,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--sb-label)",
              }}>
                {group.title}
              </p>
            )}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {group.items.map((item, ii) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 12px",
                        borderRadius: 9,
                        fontSize: 13.5,
                        fontWeight: active ? 600 : 500,
                        color: active ? "var(--sb-active-text)" : "var(--sb-text)",
                        background: active ? "var(--sb-active-bg)" : "transparent",
                        textDecoration: "none",
                        transition: "background 0.15s, color 0.15s",
                        animation: `slideInLeft 0.3s cubic-bezier(.22,.68,0,1.2) ${ii * 40}ms both`,
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = "var(--sb-hover-bg)";
                          (e.currentTarget as HTMLElement).style.color = "var(--sb-hover-text)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "var(--sb-text)";
                        }
                      }}
                    >
                      {active && (
                        <span style={{
                          position: "absolute", left: 0, top: 7, bottom: 7,
                          width: 3, borderRadius: "0 3px 3px 0",
                          background: "var(--sb-active-bar)",
                        }} />
                      )}
                      <span style={{ fontSize: 15, lineHeight: 1, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.label}
                      </span>
                      {active && (
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: "var(--brand-500)", flexShrink: 0,
                        }} />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div style={{ borderTop: "1px solid var(--sb-border)", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 12, fontWeight: 700,
            boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {nama}
            </p>
            <p style={{ fontSize: 11, color: "var(--text-3)", textTransform: "capitalize" }}>
              {role.toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
