"use client";

import { useRef, useState } from "react";
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
  cellBorder: "#1B2238",
} as const;

type SlotState = "none" | "free" | "busy";

// 6:00 〜 21:30 を 30 分刻みで生成
const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 21; h++) {
  TIME_SLOTS.push(`${h}:00`);
  TIME_SLOTS.push(`${h}:30`);
}

const DAYS = [
  { w: "月", n: 23 },
  { w: "火", n: 24 },
  { w: "水", n: 25 },
  { w: "木", n: 26 },
  { w: "金", n: 27 },
  { w: "土", n: 28, we: "sat" as const },
  { w: "日", n: 29, we: "sun" as const },
];

function mkGrid(): SlotState[][] {
  return TIME_SLOTS.map(() => DAYS.map(() => "none" as SlotState));
}

function cellBg(st: SlotState): React.CSSProperties {
  if (st === "free") return { background: "#4D5BFF", color: "#fff" };
  if (st === "busy") return {
    background: "repeating-linear-gradient(45deg,#1A2238,#1A2238 4px,#141A2C 4px,#141A2C 8px)",
    color: "#6A748F",
  };
  return { background: "#0D1424", color: "transparent" };
}

export default function AvailabilityPage() {
  const [grid, setGrid] = useState<SlotState[][]>(mkGrid);
  const [flash, setFlash] = useState<`${number}-${number}` | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggle = (si: number, di: number) => {
    setGrid((g) => {
      const next = g.map((r) => [...r]);
      const cur = next[si][di];
      next[si][di] = cur === "none" ? "free" : cur === "free" ? "busy" : "none";
      return next;
    });
    const key = `${si}-${di}` as const;
    setFlash(key);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFlash(null), 400);
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      {/* Chrome bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 42, background: C.header, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, zIndex: 50 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {["#FF5F57","#FEBC2E","#28C840"].map((c) => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ minWidth: 360, background: "#161E33", border: `1px solid ${C.border2}`, borderRadius: 8, padding: "6px 16px", fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: C.muted, textAlign: "center" }}>
            laxmatch.jp/availability
          </div>
        </div>
        <div style={{ width: 54 }} />
      </div>

      <div style={{ display: "flex", flex: 1, paddingTop: 42, overflow: "hidden" }}>
        <Sidebar active="/availability" />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>AVAILABILITY</div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 3 }}>空き日程を登録</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#121829", border: `1px solid ${C.border2}`, borderRadius: 10, padding: "8px 16px" }}>
                <span style={{ fontSize: 15, color: C.muted, cursor: "pointer", userSelect: "none" }}>‹</span>
                <span style={{ fontSize: 13, fontWeight: 800 }}>6月23日 — 29日</span>
                <span style={{ fontSize: 15, color: C.muted, cursor: "pointer", userSelect: "none" }}>›</span>
              </div>
              <button style={{ background: C.accent, color: "#fff", fontSize: 13, fontWeight: 800, padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer" }}>
                公開する
              </button>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 20, padding: "10px 24px", borderBottom: `1px solid #141B2E`, flexShrink: 0, alignItems: "center" }}>
            {[
              { bg: "#4D5BFF", label: "空き" },
              { bg: "repeating-linear-gradient(45deg,#1A2238,#1A2238 4px,#141A2C 4px,#141A2C 8px)", label: "予定あり" },
              { bg: "#0D1424", label: "未設定", border: `1px solid ${C.cellBorder}` },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: l.border, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.muted }}>{l.label}</span>
              </div>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#5A647F" }}>タップで 未設定 → 空き → 予定あり → 未設定</span>
          </div>

          {/* Calendar grid */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
            <div style={{ minWidth: 560, padding: "0 24px 24px" }}>
              {/* Sticky day header */}
              <div style={{
                position: "sticky", top: 0, zIndex: 10,
                display: "grid", gridTemplateColumns: "52px repeat(7,1fr)", gap: 4,
                background: C.bg, padding: "12px 0 8px",
              }}>
                <div />
                {DAYS.map((d) => (
                  <div key={d.n} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: d.we === "sat" ? "#5BA8FF" : d.we === "sun" ? "#FF7A8A" : C.dim }}>{d.w}</div>
                    <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: C.muted, marginTop: 2 }}>{d.n}</div>
                  </div>
                ))}
              </div>

              {/* Rows */}
              {TIME_SLOTS.map((label, si) => {
                const isHour = label.endsWith(":00");
                return (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "52px repeat(7,1fr)", gap: 4, marginBottom: 3 }}>
                    {/* Time label — only show :00, skip :30 to reduce clutter */}
                    <div style={{
                      display: "flex", alignItems: "center",
                      fontFamily: "'Roboto Mono', monospace",
                      fontSize: 10,
                      color: isHour ? "#9AA4C2" : "#3A4460",
                      fontWeight: isHour ? 600 : 400,
                      paddingRight: 6,
                      justifyContent: "flex-end",
                    }}>
                      {isHour ? label : "·"}
                    </div>

                    {DAYS.map((_, di) => {
                      const st = grid[si][di];
                      const key = `${si}-${di}` as const;
                      const isFlashing = flash === key;
                      return (
                        <button
                          key={di}
                          onClick={() => toggle(si, di)}
                          style={{
                            height: 44,
                            borderRadius: 7,
                            border: isFlashing
                              ? `2px solid #fff`
                              : `1px solid ${C.cellBorder}`,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            transition: "border-color 0.15s, transform 0.1s",
                            transform: isFlashing ? "scale(0.94)" : "scale(1)",
                            ...cellBg(st),
                          }}
                        >
                          {st === "free" ? "空き" : st === "busy" ? "予定" : ""}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
