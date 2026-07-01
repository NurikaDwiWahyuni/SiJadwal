"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginFormState } from "./actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    loginAction,
    {}
  );
  const [showPass, setShowPass] = useState(false);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Error */}
      {state.error && (
        <div className="anim-fade-up" style={{
          background: "var(--err-bg)",
          border: "1px solid var(--err-border)",
          borderRadius: 10,
          padding: "11px 14px",
          fontSize: 13,
          color: "var(--err-text)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>⚠️</span> {state.error}
        </div>
      )}

      {/* Username */}
      <div>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 7 }}>
          Username
        </label>
        <input
          name="username"
          autoFocus
          required
          placeholder="Masukkan username"
          className="field"
          style={{ fontSize: 15 }}
        />
      </div>

      {/* Password */}
      <div>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 7 }}>
          Password
        </label>
        <div style={{ position: "relative" }}>
          <input
            name="password"
            type={showPass ? "text" : "password"}
            required
            placeholder="Masukkan password"
            className="field"
            style={{ fontSize: 15, paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 16, padding: 4, color: "var(--text-3)",
              lineHeight: 1,
            }}
            title={showPass ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        style={{
          marginTop: 4,
          width: "100%",
          padding: "13px 20px",
          borderRadius: 11,
          border: "none",
          cursor: pending ? "not-allowed" : "pointer",
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "inherit",
          color: "#fff",
          background: pending ? "#fcd34d" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          boxShadow: pending ? "none" : "0 4px 14px rgba(245,158,11,0.35)",
          transition: "all 0.15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: pending ? 0.85 : 1,
        }}
      >
        {pending ? (
          <>
            <span style={{
              width: 16, height: 16,
              border: "2px solid rgba(255,255,255,0.4)",
              borderTop: "2px solid #fff",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
            }} />
            Sedang masuk…
          </>
        ) : (
          <>Masuk ke Sistem →</>
        )}
      </button>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </form>
  );
}
