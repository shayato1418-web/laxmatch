"use client";

import { useState, useMemo } from "react";
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
  deep: "#0C1222",
  labelColor: "#5A647F",
} as const;

const CHIP_BORDER = "#232C45";

type Team = {
  uni: string;
  sub: string;
  en: string;
  league: string;
  area: string;
  date: string;
  dist: string;
  hue: string;
};

const TEAMS: Team[] = [];

type Filter = { region: string; month: string; level: string; format: string };

const INITIAL: Filter = { region: "関東", month: "", level: "", format: "" };

export default function ExplorePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>(INITIAL);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const teams = useMemo(() => {
    return TEAMS.filter((t) => {
      if (search && !t.uni.includes(search) && !t.area.includes(search)) return false;
      if (filter.month && !t.date.startsWith(filter.month.replace("月", "/"))) return false;
      return true;
    });
  }, [search, filter]);

  const toggle = (uni: string) =>
    setApplied((prev) => { const s = new Set(prev); s.has(uni) ? s.delete(uni) : s.add(uni); return s; });

  const chip = (label: string, key: keyof Filter, val: string) => {
    const active = filter[key] === val;
    return (
      <button
        key={label}
        onClick={() => setFilter((f) => ({ ...f, [key]: active ? "" : val }))}
        style={{
          background: active ? C.accent : "#161E33",
          color: active ? "#fff" : C.dim,
          fontSize: 13, fontWeight: 700, padding: "9px 16px", borderRadius: 20,
          border: active ? "none" : `1px solid ${CHIP_BORDER}`,
          cursor: "pointer",
        }}
      >
        {label} ▾
      </button>
    );
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      {/* Chrome bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 42, background: C.header, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, zIndex: 50 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {["#FF5F57","#FEBC2E","#28C840"].map((c) => <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ minWidth: 360, background: "#161E33", border: `1px solid ${C.border2}`, borderRadius: 8, padding: "6px 16px", fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: C.muted, textAlign: "center" }}>
            laxmatch.jp/explore
          </div>
        </div>
        <div style={{ width: 54 }} />
      </div>

      <div style={{ display: "flex", flex: 1, paddingTop: 42, overflow: "hidden" }}>
        <Sidebar active="/explore" />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>FIND OPPONENT</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 3 }}>
                相手を探す
                <span style={{ fontSize: 13, color: C.muted, fontWeight: 600, marginLeft: 10 }}>{teams.length}チームが募集中</span>
              </div>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="大学名・地域で検索"
              style={{ background: "#121829", border: `1px solid ${C.border2}`, borderRadius: 11, padding: "10px 16px", fontSize: 13, color: C.muted, width: 240, outline: "none" }}
            />
          </div>

          {/* Filter chips */}
          <div style={{ display: "flex", gap: 10, padding: "18px 28px", borderBottom: `1px solid #141B2E`, flexShrink: 0, alignItems: "center" }}>
            {chip("関東", "region", "関東")}
            {chip("7月", "month", "7月")}
            {chip("レベル", "level", "上級")}
            {chip("形式", "format", "全面")}
            <div style={{ marginLeft: "auto", fontFamily: "'Roboto Mono', monospace", fontSize: 12, color: C.muted }}>
              並び替え : 距離が近い順 ▾
            </div>
          </div>

          {/* Grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {teams.map((t) => (
                <div key={t.uni} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 18 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 13, background: t.hue, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 14, color: "#fff", flexShrink: 0, letterSpacing: -0.5 }}>
                      {t.en}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 900 }}>{t.uni}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{t.sub}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                    <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: C.accent, fontWeight: 700, border: `1px solid #2C3658`, borderRadius: 6, padding: "4px 8px" }}>
                      {t.league}
                    </span>
                    <span style={{ fontSize: 11.5, color: C.muted }}>{t.area}</span>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 14, fontFamily: "'Roboto Mono', monospace", fontSize: 10.5 }}>
                    <div style={{ flex: 1, background: C.deep, borderRadius: 8, padding: "9px 10px" }}>
                      <div style={{ color: C.labelColor, fontSize: 9, letterSpacing: 1 }}>希望日</div>
                      <div style={{ color: C.dim, marginTop: 3, fontWeight: 600 }}>{t.date}</div>
                    </div>
                    <div style={{ background: C.deep, borderRadius: 8, padding: "9px 10px" }}>
                      <div style={{ color: C.labelColor, fontSize: 9, letterSpacing: 1 }}>距離</div>
                      <div style={{ color: C.dim, marginTop: 3, fontWeight: 600 }}>{t.dist}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggle(t.uni)}
                    style={{
                      display: "block", width: "100%", marginTop: 14,
                      background: applied.has(t.uni) ? "#25D07D" : C.accent,
                      color: "#fff", textAlign: "center", padding: 12,
                      borderRadius: 11, fontWeight: 800, fontSize: 13.5,
                      border: "none", cursor: "pointer",
                    }}
                  >
                    {applied.has(t.uni) ? "✓ 申請済み" : "マッチ申請"}
                  </button>
                </div>
              ))}
            </div>

            {teams.length === 0 && (
              <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🏑</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  {TEAMS.length === 0 ? "まだ募集中のチームはありません" : "条件に合うチームが見つかりません"}
                </div>
                <div style={{ fontSize: 13, color: C.labelColor }}>
                  {TEAMS.length === 0 ? "チームが登録されると、ここに表示されます" : "検索条件を変更してみてください"}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
