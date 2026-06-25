"use client";

import { useState } from "react";
import Link from "next/link";

const C = {
  bg: "#0A0F1F",
  header: "#0B1120",
  accent: "#4D5BFF",
  text: "#EAF0FF",
  muted: "#8A94B2",
  dim: "#C7D0EA",
  border: "#1A2138",
  border2: "#232C45",
  sub: "#9AA4C2",
  label: "#5A647F",
} as const;

type Tab = "利用規約" | "プライバシーポリシー";

const TERMS_DATA: Record<Tab, { n: string; h: string; body: string }[]> = {
  "利用規約": [
    { n: "第1条", h: "適用",           body: "本規約は、Lax Match（以下「本サービス」）の提供条件、および当事務局と登録ユーザーとの権利義務関係を定めるものです。" },
    { n: "第2条", h: "利用登録",       body: "登録希望者が所定の方法で申請し、当事務局が承認した時点で登録が完了します。大学ラクロス部への所属確認を求める場合があります。" },
    { n: "第3条", h: "禁止事項",       body: "なりすまし、無断キャンセルの常習、他チームへの迷惑行為、虚偽の日程登録、本サービスの運営を妨げる行為を禁止します。" },
    { n: "第4条", h: "試合実施の責任", body: "練習試合の実施・会場手配・安全管理・傷害対応は当事者間の責任で行うものとし、当事務局は試合に関する一切の責任を負いません。" },
    { n: "第5条", h: "退会",           body: "ユーザーはいつでも退会できます。進行中のマッチングがある場合は、相手チームへの連絡後に手続きを行ってください。" },
  ],
  "プライバシーポリシー": [
    { n: "01", h: "取得する情報", body: "氏名・大学名・連絡先・所属チーム・空き日程・チャット内容等を取得します。" },
    { n: "02", h: "利用目的",     body: "マッチングの提供、本人確認、不正防止、サービス改善、および運営上の連絡のために利用します。" },
    { n: "03", h: "第三者提供",   body: "法令に基づく場合を除き、本人の同意なく第三者へ個人情報を提供することはありません。" },
    { n: "04", h: "保管と削除",   body: "退会後は法令で定める期間を除き、速やかに個人情報を削除します。チャット履歴も同様に扱います。" },
    { n: "05", h: "お問い合わせ", body: "個人情報の開示・訂正・削除のご請求は、サービス内サポート窓口よりご連絡ください。" },
  ],
};

export default function TermsPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const init: Tab = searchParams?.tab === "privacy" ? "プライバシーポリシー" : "利用規約";
  const [tab, setTab] = useState<Tab>(init);

  const sections = TERMS_DATA[tab];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Noto Sans JP', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: `1px solid #141B2E`, flexShrink: 0 }}>
        <Link href="/" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 20, letterSpacing: 0.5, color: C.text, textDecoration: "none" }}>
          LAX<span style={{ color: C.accent }}>·</span>MATCH
        </Link>
        <Link href="/login" style={{ fontSize: 13.5, fontWeight: 700, color: C.dim, textDecoration: "none" }}>ログイン</Link>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr", overflow: "hidden" }}>
        {/* Left nav */}
        <aside style={{ borderRight: `1px solid ${C.border}`, padding: "34px 28px" }}>
          <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>LEGAL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 18 }}>
            {(["利用規約", "プライバシーポリシー"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  fontSize: 14, fontWeight: 800, padding: "13px 16px", borderRadius: 10,
                  cursor: "pointer", textAlign: "left", border: "none",
                  background: t === tab ? "#161E33" : "transparent",
                  color: t === tab ? "#fff" : C.muted,
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 28, fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: C.label, letterSpacing: 1, lineHeight: 1.8 }}>
            最終更新<br />2026.04.01<br />Lax Match 運営事務局
          </div>
        </aside>

        {/* Content */}
        <div style={{ overflowY: "auto", padding: "40px 64px" }}>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 38, letterSpacing: -1 }}>{tab}</div>
          <div style={{ height: 3, width: 60, background: C.accent, marginTop: 16, borderRadius: 2 }} />

          <div style={{ marginTop: 34, maxWidth: 720 }}>
            {sections.map((s) => (
              <div key={s.n} style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 13, color: C.accent, fontWeight: 700 }}>{s.n}</span>
                  <span style={{ fontSize: 18, fontWeight: 900 }}>{s.h}</span>
                </div>
                <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.95, marginTop: 10 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
