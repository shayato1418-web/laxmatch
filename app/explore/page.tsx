"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function ExplorePage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roomStatuses, setRoomStatuses] = useState<Map<string, RoomStatus>>(new Map());
  const [overlapMap, setOverlapMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterGender, setFilterGender] = useState("");

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

        const ids = profs.map((p: Profile) => p.user_id);

        const queries: Promise<unknown>[] = [
          supabase.from("chat_rooms").select("id, team_b_id, status").eq("team_a_id", user.id),
          supabase.from("chat_rooms").select("id, team_a_id, status").eq("team_b_id", user.id),
          supabase.from("availability_slots").select("slot_key").eq("user_id", user.id).eq("state", "free"),
        ];
        if (ids.length > 0) {
          queries.push(supabase.from("availability_slots").select("user_id, slot_key").in("user_id", ids).eq("state", "free"));
        }

        const [roomsABRes, roomsBARes, mySlotsRes, otherSlotsRes] = await Promise.all(queries) as [
          { data: { team_b_id: string; status: string }[] | null },
          { data: { team_a_id: string; status: string }[] | null },
          { data: { slot_key: string }[] | null },
          { data: { user_id: string; slot_key: string }[] | null } | undefined,
        ];

        // Room statuses
        const statusMap = new Map<string, RoomStatus>();
        (roomsABRes.data ?? []).forEach((r) => {
          if (ids.includes(r.team_b_id)) statusMap.set(r.team_b_id, r.status === "active" ? "matched" : "applied");
        });
        (roomsBARes.data ?? []).forEach((r) => {
          if (ids.includes(r.team_a_id)) statusMap.set(r.team_a_id, r.status === "active" ? "matched" : "applied");
        });
        setRoomStatuses(statusMap);

        // Schedule overlap
        const myFreeKeys = new Set((mySlotsRes.data ?? []).map((s) => s.slot_key));
        const overlapResult = new Map<string, boolean>();
        (otherSlotsRes?.data ?? []).forEach((s) => {
          if (myFreeKeys.has(s.slot_key)) overlapResult.set(s.user_id, true);
        });
        setOverlapMap(overlapResult);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => { void load(); }, [load]);

  // Derived filter data
  const regions = useMemo(() => [...new Set(profiles.map((p) => p.region).filter(Boolean))], [profiles]);
  const levels = useMemo(() => [...new Set(profiles.map((p) => p.level).filter(Boolean))], [profiles]);
  const genders = useMemo(() => [...new Set(profiles.map((p) => p.gender).filter(Boolean))], [profiles]);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (search && !p.university_name.includes(search) && !p.region.includes(search)) return false;
      if (filterRegion && p.region !== filterRegion) return false;
      if (filterLevel && p.level !== filterLevel) return false;
      if (filterGender && p.gender !== filterGender) return false;
      return true;
    });
  }, [profiles, search, filterRegion, filterLevel, filterGender]);

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      <div className="app-body" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
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
            {genders.map((g) => {
              const active = filterGender === g;
              return (
                <button key={g} onClick={() => setFilterGender(active ? "" : g)} style={{ background: active ? C.green : "#161E33", color: active ? "#fff" : C.dim, fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 20, border: active ? "none" : `1px solid ${C.border2}`, cursor: "pointer" }}>
                  {g}
                </button>
              );
            })}
            {(filterRegion || filterLevel || filterGender) && (
              <button onClick={() => { setFilterRegion(""); setFilterLevel(""); setFilterGender(""); }} style={{ background: "transparent", color: C.muted, fontSize: 12, padding: "8px 12px", borderRadius: 20, border: `1px solid ${C.border2}`, cursor: "pointer" }}>
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
                  const hasOverlap = overlapMap.get(p.user_id) ?? false;
                  return (
                    <Link
                      key={p.user_id}
                      href={`/profile/${p.user_id}`}
                      className="app-card"
                      style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 18, textDecoration: "none", color: "inherit", display: "block", cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 48, height: 48, borderRadius: 13, background: teamHue(p.user_id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 14, color: "#fff", flexShrink: 0, letterSpacing: -0.5 }}>
                          {teamInitials(p.university_name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.university_name}</div>
                          {p.gender && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{p.gender}</div>}
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

                      {hasOverlap && (
                        <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: C.green, background: "rgba(37,208,125,0.1)", border: "1px solid rgba(37,208,125,0.3)", borderRadius: 8, padding: "6px 10px" }}>
                          ★ 日程が合います
                        </div>
                      )}

                      {p.notes && (
                        <div style={{ marginTop: 8, fontSize: 12, color: C.muted, background: C.deep, borderRadius: 8, padding: "8px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.notes}
                        </div>
                      )}

                      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: status === "matched" ? C.green : status === "applied" ? C.muted : C.muted }}>
                          {status === "matched" ? "✓ マッチ成立" : status === "applied" ? "申請済み" : ""}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>
                          詳細を見る ›
                        </span>
                      </div>
                    </Link>
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
