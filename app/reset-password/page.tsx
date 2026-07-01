"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("パスワードは6文字以上にしてください。");
      return;
    }
    if (password !== confirm) {
      setError("パスワードが一致しません。");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "変更に失敗しました。");
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

        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>パスワードを変更しました</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>ログインページへ移動します…</div>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: "center", color: C.muted }}>
            <div style={{ fontSize: 14 }}>リンクを確認中…</div>
            <div style={{ fontSize: 12, marginTop: 12 }}>
              <Link href="/forgot-password" style={{ color: C.accent }}>パスワードリセットをやり直す</Link>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, letterSpacing: 3, color: C.accent, fontWeight: 700, textAlign: "center" }}>NEW PASSWORD</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 10, marginBottom: 32, textAlign: "center" }}>新しいパスワードを設定</div>

            {error && (
              <div style={{ background: "rgba(255,92,108,0.12)", border: "1px solid rgba(255,92,108,0.3)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#FF7A8A", marginBottom: 20 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#7A85A6", fontWeight: 600, marginBottom: 8 }}>NEW PASSWORD</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6文字以上"
                  disabled={loading}
                  style={{ display: "block", width: "100%", background: C.input, border: `1px solid ${C.border2}`, borderRadius: 13, padding: "15px 16px", fontSize: 14, color: C.dim, outline: "none" }}
                />
              </div>
              <div>
                <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#7A85A6", fontWeight: 600, marginBottom: 8 }}>CONFIRM</div>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="もう一度入力"
                  disabled={loading}
                  style={{ display: "block", width: "100%", background: C.input, border: `1px solid ${C.border2}`, borderRadius: 13, padding: "15px 16px", fontSize: 14, color: C.dim, outline: "none" }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: C.accent, color: "#fff", padding: 16, borderRadius: 13,
                  fontWeight: 900, fontSize: 15, border: "none",
                  cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                  boxShadow: "0 12px 28px rgba(77,91,255,.32)",
                }}
              >
                {loading ? "変更中…" : "パスワードを変更"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
