"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";

const C = {
  bg: "#0A0F1F",
  accent: "#4D5BFF",
  text: "#EAF0FF",
  muted: "#8A94B2",
  dim: "#C7D0EA",
  border2: "#232C45",
  input: "#121829",
  green: "#25D07D",
  red: "#FF5C6C",
} as const;

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("メールアドレスを入力してください。");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordForEmail(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Link href="/lp" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 20, letterSpacing: 0.5, color: C.text, textDecoration: "none", display: "block", textAlign: "center", marginBottom: 40 }}>
          LAX<span style={{ color: C.accent }}>·</span>MATCH
        </Link>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>📧</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>メールを送信しました</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 32 }}>
              <span style={{ color: C.dim, fontWeight: 700 }}>{email}</span> に<br />
              パスワードリセット用のリンクを送信しました。<br />
              メールをご確認ください。
            </div>
            <Link href="/login" style={{ display: "inline-block", background: C.accent, color: "#fff", padding: "14px 32px", borderRadius: 12, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
              ログインページへ
            </Link>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, letterSpacing: 3, color: C.accent, fontWeight: 700, textAlign: "center" }}>RESET PASSWORD</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 10, marginBottom: 8, textAlign: "center" }}>パスワードをリセット</div>
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 32, lineHeight: 1.7 }}>
              登録済みのメールアドレスを入力してください。<br />パスワードリセット用のリンクを送信します。
            </div>

            {error && (
              <div style={{ background: "rgba(255,92,108,0.12)", border: "1px solid rgba(255,92,108,0.3)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#FF7A8A", marginBottom: 20 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#7A85A6", fontWeight: 600, marginBottom: 8 }}>
                EMAIL
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@lacrosse.jp"
                disabled={loading}
                style={{
                  display: "block", width: "100%",
                  background: C.input, border: `1px solid ${C.border2}`, borderRadius: 13,
                  padding: "15px 16px", fontSize: 14, color: C.dim, outline: "none",
                  marginBottom: 24,
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  display: "block", width: "100%",
                  background: C.accent, color: "#fff", padding: 16, borderRadius: 13,
                  fontWeight: 900, fontSize: 15, border: "none",
                  cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                  boxShadow: "0 12px 28px rgba(77,91,255,.32)",
                }}
              >
                {loading ? "送信中…" : "リセットメールを送信"}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Link href="/login" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>
                ← ログインページへ戻る
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
