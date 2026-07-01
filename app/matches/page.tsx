"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

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
  green: "#25D07D",
  yellow: "#F7B731",
  red: "#FF5C6C",
} as const;

const HUES = [
  "linear-gradient(135deg,#4D5BFF,#A67CFF)",
  "linear-gradient(135deg,#FF5C6C,#FF9870)",
  "linear-gradient(135deg,#00C9A7,#3FC7FF)",
  "linear-gradient(135deg,#F7B731,#FC6D26)",
  "linear-gradient(135deg,#A18CD1,#FBC2EB)",
  "linear-gradient(135deg,#30CFD0,#330867)",
  "linear-gradient(135deg,#F953C6,#B91D73)",
  "linear-gradient(135deg,#2AF598,#009EFD)",
];

function roomHue(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

function roomInitials(name: string): string {
  const cleaned = name.replace(/大学|ラクロス|部$/g, "");
  return cleaned.slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type Tab = "申請中" | "成立" | "却下";

type DbRoom = {
  id: string;
  team_a_id: string;
  team_b_id: string;
  team_a_name: string;
  team_b_name: string;
  status: string;
  created_at: string;
};

function statusMeta(status: string): { label: string; color: string; border: string } {
  if (status === "active")   return { label: "成立",  color: C.green,  border: C.green };
  if (status === "rejected") return { label: "却下",  color: C.red,    border: C.red };
  return                            { label: "申請中", color: C.yellow, border: C.yellow };
}

export default function MatchesPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [rooms, setRooms] = useState<DbRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("申請中");
  const [cancelling, setCancelling] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("chat_rooms")
      .select("id, team_a_id, team_b_id, team_a_name, team_b_name, status, created_at")
      .or(`team_a_id.eq.${user.id},team_b_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setRooms((data as DbRoom[]) ?? []);
    setLoading(false);
  }, [user?.id, supabase]);

  useEffect(() => { void load(); }, [load]);

  const cancelRequest = async (roomId: string) => {
    if (cancelling.has(roomId)) return;
    setCancelling((s) => new Set([...s, roomId]));
    const { error } = await supabase.from("chat_rooms").delete().eq("id", roomId).eq("team_a_id", user?.id ?? "");
    if (!error) {
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    }
    setCancelling((s) => { const ns = new Set(s); ns.delete(roomId); return ns; });
  };

  const pendingRooms  = useMemo(() => rooms.filter((r) => r.status === "pending"),  [rooms]);
  const activeRooms   = useMemo(() => rooms.filter((r) => r.status === "active"),   [rooms]);
  const rejectedRooms = useMemo(() => rooms.filter((r) => r.status === "rejected"), [rooms]);

  const displayed =
    tab === "成立"  ? activeRooms  :
    tab === "却下"  ? rejectedRooms :
    pendingRooms;

  const opponentName = (r: DbRoom) =>
    r.team_a_id === user?.id ? r.team_b_name : r.team_a_name;

  const TABS: { label: Tab; count: number }[] = [
    { label: "申請中", count: pendingRooms.length },
    { label: "成立",   count: activeRooms.length  },
    { label: "却下",   count: rejectedRooms.length },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      <div className="app-body" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar active="/matches" />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header + tabs */}
          <div className="matches-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px 16px", flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>MATCHES</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 3 }}>マッチング</div>
            </div>
            <div className="matches-tabs" style={{ display: "flex", gap: 8 }}>
              {TABS.map(({ label, count }) => (
                <button
                  key={label}
                  onClick={() => setTab(label)}
                  style={{
                    fontSize: 13, fontWeight: 800, padding: "9px 16px", borderRadius: 10,
                    cursor: "pointer",
                    background: label === tab ? C.accent : "#161E33",
                    color: label === tab ? "#fff" : C.muted,
                    border: label !== tab ? `1px solid ${C.border2}` : "none",
                  }}
                >
                  {label}
                  <span style={{ marginLeft: 6, fontSize: 11, fontFamily: "'Roboto Mono', monospace" }}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 28px 24px" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 14 }}>
                読み込み中…
              </div>
            ) : displayed.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>🏑</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>
                  {tab === "成立" ? "まだマッチングが成立していません" :
                   tab === "却下" ? "却下されたマッチングはありません" :
                   "申請中のマッチングはありません"}
                </div>
                <div style={{ fontSize: 13, color: "#5A647F" }}>
                  {tab === "成立"
                    ? "探すページからチームに申請してみましょう"
                    : tab === "却下"
                    ? "新しいチームに申請してみましょう"
                    : "探すページからチームに申請してみましょう"}
                </div>
              </div>
            ) : (
              <div className="matches-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
                {displayed.map((r) => {
                  const name = opponentName(r);
                  const meta = statusMeta(r.status);
                  return (
                    <div key={r.id} className="app-card" style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 20, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: meta.color }} />

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
                          <div style={{ width: 48, height: 48, borderRadius: 13, background: roomHue(r.id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 14, color: "#fff", flexShrink: 0 }}>
                            {roomInitials(name)}
                          </div>
                          <div>
                            <div style={{ fontSize: 17, fontWeight: 900 }}>{name}</div>
                            <div style={{ fontSize: 12, color: C.muted, marginTop: 2, fontFamily: "'Roboto Mono', monospace" }}>
                              {fmtDate(r.created_at)} に申請
                            </div>
                          </div>
                        </div>
                        <div style={{
                          fontFamily: "'Roboto Mono', monospace", fontSize: 11, fontWeight: 700,
                          color: meta.color, border: `1px solid ${meta.border}`,
                          borderRadius: 6, padding: "5px 9px", flexShrink: 0,
                        }}>
                          {meta.label}
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 16, paddingTop: 15, borderTop: `1px solid ${C.cardLine}` }}>
                        {r.status === "active" ? (
                          <Link href="/chat" style={{ fontSize: 13, fontWeight: 800, color: C.accent, textDecoration: "none" }}>
                            チャットへ ›
                          </Link>
                        ) : r.status === "pending" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 12, color: C.muted }}>相手の承認待ち</span>
                            {r.team_a_id === user?.id && (
                              <button
                                onClick={() => { void cancelRequest(r.id); }}
                                disabled={cancelling.has(r.id)}
                                style={{ fontSize: 12, fontWeight: 700, color: "#FF5C6C", background: "transparent", border: "1px solid rgba(255,92,108,0.3)", borderRadius: 8, padding: "5px 10px", cursor: cancelling.has(r.id) ? "wait" : "pointer", opacity: cancelling.has(r.id) ? 0.6 : 1 }}
                              >
                                {cancelling.has(r.id) ? "取消中…" : "申請を取り消す"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: C.red }}>却下されました</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
