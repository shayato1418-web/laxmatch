"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";

const C = {
  bg: "#0A0F1F",
  panel: "#0B1120",
  accent: "#4D5BFF",
  text: "#EAF0FF",
  muted: "#8A94B2",
  dim: "#C7D0EA",
  border: "#1A2138",
  border2: "#232C45",
  input: "#121829",
  muted2: "#7A85A6",
} as const;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      const stored = localStorage.getItem("currentUser");
      const loggedIn = stored ? JSON.parse(stored) : null;
      router.push(loggedIn?.role === "manager" ? "/admin" : "/explore");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || authLoading;

  return (
    <div className="login-bg-mobile" style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Chrome bar */}
      <div className="chrome-bar" style={{ height: 42, background: C.panel, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {["#FF5F57","#FEBC2E","#28C840"].map((c) => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ minWidth: 360, background: "#161E33", border: `1px solid ${C.border2}`, borderRadius: 8, padding: "6px 16px", fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: C.muted, textAlign: "center" }}>
            laxmatch.jp/login
          </div>
        </div>
        <div style={{ width: 54 }} />
      </div>

      {/* Body */}
      <div className="login-body" style={{ flex: 1, display: "grid", gridTemplateColumns: "1.1fr 1fr", overflow: "hidden" }}>

        {/* Left panel — visual */}
        <div className="login-left" style={{
          position: "relative",
          background: "linear-gradient(135deg, #0d1830 0%, #1a2645 50%, #0a1220 100%)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 60%, rgba(77,91,255,0.20) 0%, transparent 55%), radial-gradient(circle at 80% 20%, rgba(37,208,125,0.08) 0%, transparent 45%)" }} />

          {/* Logo */}
          <div style={{ position: "absolute", left: 48, top: 44, fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 23, letterSpacing: 0.5, zIndex: 1 }}>
            LAX<span style={{ color: C.accent }}>·</span>MATCH
          </div>

          {/* Bottom text */}
          <div style={{ position: "absolute", left: 48, bottom: 56, zIndex: 1 }}>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 54, lineHeight: 0.92, letterSpacing: -1.5, textTransform: "uppercase" }}>
              PRACTICE<br />MATCH
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 18 }}>練習試合、もっとかんたんに。</div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="login-right" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px" }}>
          <div className="login-mobile-logo" style={{ display: "none", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: 0.5, marginBottom: 0 }}>
            LAX<span style={{ color: C.accent }}>·</span>MATCH
          </div>
          {/* Mobile hero — 44px "WELCOME BACK" with gradient */}
          <div className="login-hero" style={{ display: "none" }}>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 44, lineHeight: 0.95, letterSpacing: "-1.5px", textTransform: "uppercase", marginTop: 26, marginBottom: 18 }}>
              WELCOME<br />
              <span style={{ background: "linear-gradient(110deg, #6E8BFF, #3FC7FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>BACK</span>
            </div>
          </div>
          <div className="login-welcome-label" style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, letterSpacing: 3, color: C.accent, fontWeight: 700 }}>WELCOME BACK</div>
          <div className="login-title" style={{ fontSize: 30, fontWeight: 900, marginTop: 10 }}>ログイン</div>
          <div style={{ fontSize: 13.5, color: C.muted, marginTop: 8 }}>渉外アカウントでサインインしてください</div>

          {error && (
            <div style={{ marginTop: 16, background: "rgba(255,92,108,0.12)", border: "1px solid rgba(255,92,108,0.3)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#FF7A8A" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
            {/* Email */}
            <div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.muted2, fontWeight: 600 }}>EMAIL / ID</div>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                style={{
                  display: "block", width: "100%", marginTop: 8,
                  background: C.input, border: `1px solid ${C.border2}`, borderRadius: 13,
                  padding: "15px 16px", fontSize: 14, color: C.dim, outline: "none",
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginTop: 18 }}>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.muted2, fontWeight: 600 }}>PASSWORD</div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginTop: 8, background: C.input, border: `1px solid ${C.border2}`,
                borderRadius: 13, padding: "15px 16px",
              }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  style={{ background: "transparent", border: "none", fontSize: showPw ? 14 : 18, color: C.dim, outline: "none", flex: 1, letterSpacing: showPw ? 0 : 3 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: C.accent, letterSpacing: 1, background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPw ? "隠す" : "表示"}
                </button>
              </div>
            </div>

            {/* Remember & forgot */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#9AA4C2", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ display: "none" }}
                />
                <div style={{ width: 16, height: 16, borderRadius: 5, background: remember ? C.accent : "transparent", border: `1px solid ${remember ? C.accent : C.border2}` }} />
                ログイン状態を保持
              </label>
              <a href="#" style={{ fontSize: 12.5, color: C.muted, textDecoration: "none" }}>パスワードを忘れた方</a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="login-submit-btn"
              style={{
                display: "block", width: "100%", marginTop: 24,
                background: C.accent, color: "#fff",
                textAlign: "center", padding: 16, borderRadius: 13,
                fontWeight: 900, fontSize: 15,
                boxShadow: "0 12px 28px rgba(77,91,255,.32)",
                border: "none", cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "ログイン中…" : "ログイン"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
            <div style={{ flex: 1, height: 1, background: C.border2 }} />
            <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: "#55617F", letterSpacing: 1 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: C.border2 }} />
          </div>

          {/* University email */}
          <button
            type="button"
            onClick={() => router.push("/register?type=university")}
            className="login-register-btn"
            style={{ border: `1px solid #2C3658`, borderRadius: 13, padding: 15, textAlign: "center", fontWeight: 700, fontSize: 14, color: C.dim, background: "none", cursor: "pointer", width: "100%" }}
          >
            大学メールアドレスで続ける
          </button>

          {/* Register link */}
          <div style={{ marginTop: 26, textAlign: "center", fontSize: 13, color: C.muted }}>
            アカウントがない方は{" "}
            <Link href="/register" style={{ color: C.accent, fontWeight: 700, textDecoration: "none" }}>新規登録</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
