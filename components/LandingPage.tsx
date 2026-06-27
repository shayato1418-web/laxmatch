"use client";

import { useState } from "react";
import Link from "next/link";

const C = {
  accent: "#4D5BFF",
  muted:  "#8A94B2",
  sub:    "#9AA4C2",
  dim:    "#C7D0EA",
  border: "#1A2138",
  card:   "#111728",
  cardBorder: "#1F2740",
  green:  "#25D07D",
} as const;

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="lp">

      {/* ── Navbar ── */}
      <header className="lp-header">
        <div className="lp-logo-area">
          <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 21, letterSpacing: 0.5 }}>
            LAX<span style={{ color: C.accent }}>·</span>MATCH
          </span>
          <nav className="lp-nav">
            <a href="#features">特徴</a>
            <a href="#how">使い方</a>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
        <div className="lp-header-right">
          <Link href="/login" className="lp-login">ログイン</Link>
          <Link href="/register" className="lp-cta-btn">無料ではじめる</Link>
          <button
            className={`lp-hamburger${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="メニュー"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <div className={`lp-mobile-menu${menuOpen ? " open" : ""}`}>
        <Link href="/login" onClick={() => setMenuOpen(false)} style={{ color: C.sub, textDecoration: "none", padding: "15px 0", fontSize: 15, fontWeight: 700, borderBottom: `1px solid ${C.border}`, display: "block" }}>
          ログイン
        </Link>
        <a href="#features" onClick={() => setMenuOpen(false)}>特徴</a>
        <a href="#how"      onClick={() => setMenuOpen(false)}>使い方</a>
        <a href="#faq"      onClick={() => setMenuOpen(false)}>FAQ</a>
      </div>

      {/* ── Hero ── */}
      <div className="lp-hero">
        {/* Left: copy */}
        <div>
          <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 12, letterSpacing: 4, color: C.accent, fontWeight: 700 }}>
            FOR UNIVERSITY LACROSSE
          </div>
          <div className="lp-hero-title">
            PRACTICE<br />
            <span style={{ color: C.accent }}>MATCH</span>
          </div>
          <div className="lp-hero-sub">練習試合、もっとかんたんに。</div>
          <div className="lp-hero-desc">
            渉外担当の「相手探し」を最短化。空き日程を登録して、<br />
            条件の合うチームとすぐにマッチング。連絡もアプリ内で完結。
          </div>
          <div className="lp-hero-btns">
            <Link href="/register" className="lp-btn-primary">無料ではじめる</Link>
            <a href="#how" className="lp-btn-secondary">使い方を見る</a>
          </div>
        </div>

        {/* Right: CTA card */}
        <div className="lp-cta-card">
          <div className="lp-cta-card-glow" />
          <div className="lp-cta-badge">
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: 1.5 }}>
              β版登録受付中
            </span>
          </div>
          <div className="lp-cta-title">渉外担当の相手探しを<br />もっとかんたんに</div>
          <div className="lp-cta-desc">
            チームを登録して空き日程を公開するだけ。<br />
            条件の合う相手からすぐにマッチ申請が届きます。
          </div>
          <Link href="/register" className="lp-cta-main">無料ではじめる →</Link>
          <div className="lp-cta-note">クレジットカード不要 · いつでも退会可能</div>
        </div>
      </div>

      {/* ── Features ── */}
      <div id="features" className="lp-features">
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
      <div id="how" className="lp-how">
        <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, letterSpacing: 3, color: C.accent, fontWeight: 700 }}>HOW IT WORKS</div>
        <div style={{ fontSize: 28, fontWeight: 900, marginTop: 12 }}>3ステップで始める</div>
        <div className="lp-how-grid">
          {[
            { step: "STEP 01", title: "チームを登録",   desc: "大学名・地域・リーグを設定して空き日程を公開するだけ。" },
            { step: "STEP 02", title: "相手を見つける", desc: "条件に合うチームを検索、マッチ申請を一クリックで送信。" },
            { step: "STEP 03", title: "チャットで確定", desc: "日時・会場・形式をアプリ内チャットで即座に調整して成立。" },
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
      <footer className="lp-footer">
        <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 12, color: "#5A647F" }}>
          © 2026 Lax Match 運営事務局
        </span>
        <div className="lp-footer-links">
          <Link href="/terms"   style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>利用規約</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>プライバシーポリシー</Link>
        </div>
      </footer>
    </div>
  );
}
