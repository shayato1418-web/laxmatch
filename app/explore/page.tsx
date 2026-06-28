"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  deep: "#0C1222",
  labelColor: "#5A647F",
  green: "#25D07D",
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

function teamHue(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

function teamInitials(name: string): string {
  const cleaned = name.replace(/大学|ラクロス|部$/g, "");
  return cleaned.slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();
}

type Profile = {
  user_id: string;
  university_name: string;
  gender: string;
  region: string;
  level: string;
  line_id: string;
  notes: string;
  is_public: boolean;
};

type RoomStatus = "applied" | "matched" | null;

type Toast = { type: "ok" | "err"; text: string };

export default function ExplorePage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roomStatuses, setRoomStatuses] = useState<Map<string, RoomStatus>>(new Map());
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: profs } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_public", true)
        .neq("user_id", user.id);

      if (profs) {
        setProfiles(profs as Profile[]);

        // Check existing rooms for each profile
        const ids = profs.map((p: Profile) => p.user_id);
        if (ids.length > 0) {
          const [{ data: roomsAB }, { data: roomsBA }] = await Promise.all([
            supabase.from("chat_rooms").select("id, team_b_id, status").eq("team_a_id", user.id),
            supabase.from("chat_rooms").select("id, team_a_id, status").eq("team_b_id", user.id),
          ]);

          const statusMap = new Map<string, RoomStatus>();
          (roomsAB ?? []).forEach((r: { team_b_id: string; status: string }) => {
            if (ids.includes(r.team_b_id)) {
              statusMap.set(r.team_b_id, r.status === "active" ? "matched" : "applied");
            }
          });
          (roomsBA ?? []).forEach((r: { team_a_id: string; status: string }) => {
            if (ids.includes(r.team_a_id)) {
              statusMap.set(r.team_a_id, r.status === "active" ? "matched" : "applied");
            }
          });
          setRoomStatuses(statusMap);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => { void load(); }, [load]);

  const showToast = (type: "ok" | "err", text: string, navigateTo?: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, text });
    toastTimer.current = setTimeout(() => {
      setToast(null);
      if (navigateTo) router.push(navigateTo);
    }, 2000);
  };

  const handleApply = async (target: Profile) => {
    if (!user?.id || applying.has(target.user_id)) return;
    setApplying((s) => new Set([...s, target.user_id]));
    try {
      const { error } = await supabase.from("chat_rooms").insert({
        team_a_id: user.id,
        team_b_id: target.user_id,
        team_a_name: user.name || "チームA",
        team_b_name: target.university_name || "チームB",
        status: "pending",
        requested_by: user.id,
      });
      if (!error) {
        setRoomStatuses((m) => new Map(m).set(target.user_id, "applied"));
        showToast("ok", "申請を送りました。相手の承認をお待ちください");
      } else {
        showToast("err", `申請に失敗しました: ${error.message}`);
      }
    } finally {
      setApplying((s) => { const ns = new Set(s); ns.delete(target.user_id); return ns; });
    }
  };

  // Derived filter data
  const regions = useMemo(() => [...new Set(profiles.map((p) => p.region).filter(Boolean))], [profiles]);
  const levels = useMemo(() => [...new Set(profiles.map((p) => p.level).filter(Boolean))], [profiles]);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (search && !p.university_name.includes(search) && !p.region.includes(search)) return false;
      if (filterRegion && p.region !== filterRegion) return false;
      if (filterLevel && p.level !== filterLevel) return false;
      return true;
    });
  }, [profiles, search, filterRegion, filterLevel]);

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      {/* Chrome bar */}
      <div className="chrome-bar" style={{ position: "fixed", top: 0, left: 0, right: 0, height: 42, background: C.header, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, zIndex: 50 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ minWidth: 360, background: "#161E33", border: `1px solid ${C.border2}`, borderRadius: 8, padding: "6px 16px", fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: C.muted, textAlign: "center" }}>
            laxmatch.jp/explore
          </div>
        </div>
        <div style={{ width: 54 }} />
      </div>

      <div className="app-body" style={{ display: "flex", flex: 1, paddingTop: 42, overflow: "hidden" }}>
        <Sidebar active="/explore" />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div className="explore-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>FIND OPPONENT</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 3 }}>
                相手を探す
                <span style={{ fontSize: 13, color: C.muted, fontWeight: 600, marginLeft: 10 }}>
                  {loading ? "読み込み中…" : `${filtered.length}チームが募集中`}
                </span>
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
          <div style={{ display: "flex", gap: 10, padding: "14px 28px", borderBottom: `1px solid #141B2E`, flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}>
            {regions.map((r) => {
              const active = filterRegion === r;
              return (
                <button key={r} onClick={() => setFilterRegion(active ? "" : r)} style={{ background: active ? C.accent : "#161E33", color: active ? "#fff" : C.dim, fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 20, border: active ? "none" : `1px solid ${C.border2}`, cursor: "pointer" }}>
                  {r}
                </button>
              );
            })}
            {levels.map((l) => {
              const active = filterLevel === l;
              return (
                <button key={l} onClick={() => setFilterLevel(active ? "" : l)} style={{ background: active ? "#3FC7FF" : "#161E33", color: active ? "#fff" : C.dim, fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 20, border: active ? "none" : `1px solid ${C.border2}`, cursor: "pointer" }}>
                  {l}
                </button>
              );
            })}
            {(filterRegion || filterLevel) && (
              <button onClick={() => { setFilterRegion(""); setFilterLevel(""); }} style={{ background: "transparent", color: C.muted, fontSize: 12, padding: "8px 12px", borderRadius: 20, border: `1px solid ${C.border2}`, cursor: "pointer" }}>
                ✕ リセット
              </button>
            )}
          </div>

          {/* Grid */}
          <div className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: "22px 28px" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
                <div style={{ fontSize: 14 }}>読み込み中…</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🏑</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  {profiles.length === 0 ? "まだ募集中のチームはありません" : "条件に合うチームが見つかりません"}
                </div>
                <div style={{ fontSize: 13, color: C.labelColor }}>
                  {profiles.length === 0 ? "チームが空き日程を公開すると、ここに表示されます" : "検索条件を変更してみてください"}
                </div>
              </div>
            ) : (
              <div className="explore-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {filtered.map((p) => {
                  const status = roomStatuses.get(p.user_id);
                  const isApplying = applying.has(p.user_id);
                  return (
                    <div key={p.user_id} className="app-card" style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 18 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 48, height: 48, borderRadius: 13, background: teamHue(p.user_id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 14, color: "#fff", flexShrink: 0, letterSpacing: -0.5 }}>
                          {teamInitials(p.university_name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.university_name}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{p.gender || "—"}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        {p.level && (
                          <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: C.accent, fontWeight: 700, border: `1px solid #2C3658`, borderRadius: 6, padding: "4px 8px" }}>
                            {p.level}
                          </span>
                        )}
                        {p.region && (
                          <span style={{ fontSize: 11.5, color: C.muted }}>{p.region}</span>
                        )}
                      </div>

                      {p.notes && (
                        <div style={{ marginTop: 10, fontSize: 12, color: C.muted, background: C.deep, borderRadius: 8, padding: "8px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.notes}
                        </div>
                      )}

                      <button
                        onClick={() => { void handleApply(p); }}
                        disabled={!!status || isApplying}
                        style={{
                          display: "block", width: "100%", marginTop: 14,
                          background: status === "matched" ? C.green : status === "applied" ? "#2A3448" : C.accent,
                          color: "#fff", textAlign: "center", padding: 12,
                          borderRadius: 11, fontWeight: 800, fontSize: 13.5,
                          border: status === "applied" ? `1px solid ${C.border2}` : "none",
                          cursor: status || isApplying ? "default" : "pointer",
                          opacity: isApplying ? 0.6 : 1,
                        }}
                      >
                        {isApplying ? "申請中…" : status === "matched" ? "✓ マッチ成立" : status === "applied" ? "申請済み" : "マッチ申請"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
      {toast && (
        <div style={{
          position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "ok" ? "rgba(37,208,125,0.97)" : "rgba(255,92,108,0.97)",
          color: "#fff", padding: "12px 28px", borderRadius: 14, fontSize: 14, fontWeight: 800,
          zIndex: 200, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", pointerEvents: "none",
          whiteSpace: "nowrap", letterSpacing: 0.3,
        }}>
          {toast.type === "ok" ? "🎉 " : "✕ "}{toast.text}
        </div>
      )}
      <MobileBottomNav />
    </div>
  );
}
