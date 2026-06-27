"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

const C = {
  bg: "#0A0F1F",
  header: "#0B1120",
  accent: "#4D5BFF",
  text: "#EAF0FF",
  muted: "#8A94B2",
  dim: "#C7D0EA",
  border: "#1A2138",
  border2: "#232C45",
  card: "#111728",
  cardBorder: "#1F2740",
  cardLine: "#1B2238",
} as const;

type MatchGroup = "進行中" | "成立" | "申請中" | "履歴";

type Match = {
  uni: string;
  en: string;
  hue: string;
  venue: string;
  date: string;
  status: string;
  statusColor: string;
  borderColor: string;
  group: MatchGroup;
  cta: string;
};

const ALL_MATCHES: Match[] = [];

const TABS: MatchGroup[] = ["進行中", "成立", "申請中", "履歴"];

export default function MatchesPage() {
  const [tab, setTab] = useState<MatchGroup>("進行中");

  const matches = ALL_MATCHES.filter((m) => m.group === tab);

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      {/* Chrome bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 42, background: C.header, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, zIndex: 50 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {["#FF5F57","#FEBC2E","#28C840"].map((c) => <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ minWidth: 360, background: "#161E33", border: `1px solid ${C.border2}`, borderRadius: 8, padding: "6px 16px", fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: C.muted, textAlign: "center" }}>
            laxmatch.jp/matches
          </div>
        </div>
        <div style={{ width: 54 }} />
      </div>

      <div style={{ display: "flex", flex: 1, paddingTop: 42, overflow: "hidden" }}>
        <Sidebar active="/matches" />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header + tabs */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px 16px", flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>MATCHES</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 3 }}>マッチング</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    fontSize: 13, fontWeight: 800, padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: t === tab ? C.accent : "#161E33",
                    color: t === tab ? "#fff" : C.muted,
                    ...(t !== tab ? { border: `1px solid ${C.border2}` } : {}),
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Match cards */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 28px 24px" }}>
            {matches.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 14 }}>
                まだマッチングはありません
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                {matches.map((m) => (
                  <div key={m.uni} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 20, position: "relative", overflow: "hidden" }}>
                    {/* Color left border */}
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: m.borderColor }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
                        <div style={{ width: 48, height: 48, borderRadius: 13, background: m.hue, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 14, color: "#fff", flexShrink: 0 }}>
                          {m.en}
                        </div>
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 900 }}>{m.uni}</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{m.venue}</div>
                        </div>
                      </div>
                      <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, fontWeight: 700, color: m.statusColor, border: `1px solid ${m.statusColor}`, borderRadius: 6, padding: "5px 9px", flexShrink: 0 }}>
                        {m.status}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 15, borderTop: `1px solid ${C.cardLine}` }}>
                      <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 13, color: C.dim, fontWeight: 600 }}>{m.date}</div>
                      <button style={{ fontSize: 13, fontWeight: 800, color: C.accent, background: "none", border: "none", cursor: "pointer" }}>
                        {m.cta} ›
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
