"use client";

import { logoutAction } from "./actions";

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="logout-btn"
        style={{
          width: "100%",
          textAlign: "left",
          fontSize: 12,
          color: "#a8a29e",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 8px",
          borderRadius: 7,
          fontFamily: "inherit",
          transition: "color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "#dc2626";
          (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "#a8a29e";
          (e.currentTarget as HTMLButtonElement).style.background = "none";
        }}
      >
        ← Logout
      </button>
    </form>
  );
}
