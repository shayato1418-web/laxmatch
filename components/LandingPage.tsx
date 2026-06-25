"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const C = {
  bg: "#0A0F1F",
  nav: "#0B1120",
  accent: "#4D5BFF",
  text: "#EAF0FF",
  muted: "#8A94B2",
  sub: "#9AA4C2",
  dim: "#C7D0EA",
  border: "#1A2138",
  border2: "#222A42",
  card: "#111728",
  cardBorder: "#1F2740",
  green: "#25D07D",
} as const;

export default function LandingPage() {
  const [heroImageExists, setHeroImageExists] = useState(false);

  useEffect(() => {
    fetch("/hero.jpg", { method: "HEAD" })
      .then((res) => {
        if (res.ok) setHeroImageExists(true);
      })
      .catch(() => {
        setHeroImageExists(false);
      });
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Noto Sans JP', sans-serif", display: "flex", flexDirection: "column" }}>

      {/* ── Navbar ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 48px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 21, letterSpacing: 0.5 }}>
            LAX<span style={{ color: C.accent }}>·</span>MATCH
          </span>
          <nav style={{ display: "flex", gap: 28, fontSize: 13.5, fontWeight: 700, color: C.sub }}>
            <a href="#features" style={{ color: C.sub, textDecoration: "none" }}>特徴</a>
            <a href="#how" style={{ color: C.sub, textDecoration: "none" }}>使い方</a>
            <a href="#faq" style={{ color: C.sub, textDecoration: "none" }}>FAQ</a>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/login" style={{ fontSize: 13.5, fontWeight: 700, color: C.dim, textDecoration: "none" }}>ログイン</Link>
          <Link href="/register" style={{ background: C.accent, color: "#fff", fontSize: 13.5, fontWeight: 800, padding: "11px 20px", borderRadius: 11, textDecoration: "none" }}>
            無料ではじめる
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, padding: "60px 48px 50px", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 12, letterSpacing: 4, color: C.accent, fontWeight: 700 }}>
            FOR UNIVERSITY LACROSSE
          </div>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 96, lineHeight: 0.88, letterSpacing: -3, textTransform: "uppercase", marginTop: 20 }}>
            PRACTICE<br />
            <span style={{ color: C.accent }}>MATCH</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, marginTop: 26, lineHeight: 1.35 }}>
            練習試合、もっとかんたんに。
          </div>
          <div style={{ fontSize: 15, color: C.muted, marginTop: 16, lineHeight: 1.8, maxWidth: 460 }}>
            渉外担当の「相手探し」を最短化。空き日程を登録して、<br />
            条件の合うチームとすぐにマッチング。連絡もアプリ内で完結。
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
            <Link href="/register" style={{
              background: C.accent, color: "#fff", fontSize: 15, fontWeight: 800,
              padding: "16px 30px", borderRadius: 13, textDecoration: "none",
              boxShadow: "0 12px 28px rgba(77,91,255,.35)",
            }}>
              無料ではじめる
            </Link>
            <a href="#how" style={{
              border: `1px solid #2C3658`, color: C.dim, fontSize: 15, fontWeight: 700,
              padding: "16px 28px", borderRadius: 13, textDecoration: "none",
            }}>
              使い方を見る
            </a>
          </div>
        </div>

        {heroImageExists ? (
          <div style={{ position: "relative", width: "100%", minHeight: 520, overflow: "hidden", borderRadius: 20, border: `1px solid ${C.border2}` }}>
            <Image
              src="/hero.jpg"
              alt="Hero image"
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 1200px) 100vw, 600px"
            />
          </div>
        ) : (
          <div style={{
            position: "relative",
            background: "linear-gradient(145deg, #111728 0%, #1a2645 60%, #0d1830 100%)",
            border: `1px solid ${C.border2}`,
            borderRadius: 20,
            padding: "52px 48px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            overflow: "hidden",
          }}>
            {/* Glow */}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 38%, rgba(77,91,255,0.22) 0%, transparent 65%)", pointerEvents: "none" }} />

            {/* β badge */}
            <div style={{
              position: "relative",
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(77,91,255,0.13)",
              border: `1px solid rgba(77,91,255,0.35)`,
              borderRadius: 20, padding: "8px 18px",
              marginBottom: 32,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent }} />
              <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: 1.5 }}>
                β版登録受付中
              </span>
            </div>

            {/* Sub copy */}
            <div style={{ position: "relative", fontSize: 24, fontWeight: 900, lineHeight: 1.5, marginBottom: 14 }}>
              渉外担当の相手探しを<br />もっとかんたんに
            </div>
            <div style={{ position: "relative", fontSize: 14, color: C.muted, lineHeight: 1.9, marginBottom: 40, maxWidth: 340 }}>
              チームを登録して空き日程を公開するだけ。<br />
              条件の合う相手からすぐにマッチ申請が届きます。
            </div>

            {/* CTA button */}
            <Link href="/register" style={{
              position: "relative",
              display: "block",
              width: "100%",
              background: C.accent,
              color: "#fff",
              fontSize: 17,
              fontWeight: 900,
              padding: "20px",
              borderRadius: 14,
              textDecoration: "none",
              textAlign: "center",
              boxShadow: "0 16px 44px rgba(77,91,255,.42)",
              letterSpacing: 0.3,
            }}>
              無料ではじめる →
            </Link>
            <div style={{ position: "relative", fontSize: 12, color: "#5A647F", marginTop: 16 }}>
              クレジットカード不要 · いつでも退会可能
            </div>
          </div>
        )}
      </div>

      {/* ── Features ── */}
      <div id="features" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, padding: "0 48px 56px" }}>
        {[
          { n: "01", title: "空き日程をワンタップ登録", desc: "週カレンダーで空きを公開。相手チームから直接マッチ申請が届きます。" },
          { n: "02", title: "条件でマッチング",         desc: "地域・リーグ・形式で絞り込み。最適な練習試合相手をすぐ発見。" },
          { n: "03", title: "チャットで即調整",         desc: "会場・時間・形式をその場で確定。渉外のやり取りが一本化。" },
        ].map((f) => (
          <div key={f.n} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 26 }}>
            <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 13, color: C.accent, fontWeight: 700 }}>{f.n}</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 12 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 9, lineHeight: 1.8 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* ── How it works ── */}
      <div id="how" style={{ padding: "0 48px 64px" }}>
        <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, letterSpacing: 3, color: C.accent, fontWeight: 700 }}>HOW IT WORKS</div>
        <div style={{ fontSize: 28, fontWeight: 900, marginTop: 12, marginBottom: 32 }}>3ステップで始める</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
          {[
            { step: "STEP 01", title: "チームを登録",     desc: "大学名・地域・リーグを設定して空き日程を公開するだけ。" },
            { step: "STEP 02", title: "相手を見つける",   desc: "条件に合うチームを検索、マッチ申請を一クリックで送信。" },
            { step: "STEP 03", title: "チャットで確定",   desc: "日時・会場・形式をアプリ内チャットで即座に調整して成立。" },
          ].map((s) => (
            <div key={s.step} style={{ background: "#0B1120", border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>{s.step}</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 12 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 9, lineHeight: 1.8 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        marginTop: "auto",
        borderTop: `1px solid ${C.border}`,
        padding: "24px 48px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 12, color: "#5A647F" }}>
          © 2026 Lax Match 運営事務局
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          <Link href="/terms"   style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>利用規約</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>プライバシーポリシー</Link>
        </div>
      </footer>
    </div>
  );
}
