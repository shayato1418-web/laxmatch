"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

const C = {
  bg: "#0A0F1F",
  accent: "#4D5BFF",
  text: "#EAF0FF",
  muted: "#8A94B2",
  dim: "#C7D0EA",
  border: "#1A2138",
  border2: "#232C45",
  card: "#111728",
  cardBorder: "#1F2740",
  cellBorder: "#1B2238",
  green: "#25D07D",
  red: "#FF5C6C",
  yellow: "#F7B731",
} as const;

const HUES = [
  "linear-gradient(135deg,#4D5BFF,#A67CFF)",
  "linear-gradient(135deg,#FF5C6C,#FF9870)",
  "linear-gradient(135deg,#00C9A7,#3FC7FF)",
  "linear-gradient(135deg,#F7B731,#FC6D26)",
  "linear-gradient(135deg,#A18CD1,#FBC2EB)",
  "linear-gradient(135deg,#30CFD0,#330867)",
];

function hue(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return HUES[n % HUES.length];
}

type SlotState = "none" | "free" | "busy";

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

type Profile = {
  user_id: string;
  university_name: string;
  region: string;
  level: string;
  gender: string;
  line_id: string;
  notes: string;
  is_public: boolean;
};

type Toast = { type: "ok" | "err"; text: string };

export default function TeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetId } = use(params);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [grid, setGrid] = useState<SlotState[][]>(mkGrid);
  const [roomStatus, setRoomStatus] = useState<"none" | "pending" | "active" | "rejected">("none");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useMemo(() => ({ current: null as ReturnType<typeof setTimeout> | null }), []);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user?.id || !targetId) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [{ data: prof }, { data: slots }, { data: roomsAB }, { data: roomsBA }] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", targetId).single(),
          supabase.from("availability_slots").select("slot_key, state").eq("user_id", targetId),
          supabase.from("chat_rooms").select("id, status").eq("team_a_id", user.id).eq("team_b_id", targetId),
          supabase.from("chat_rooms").select("id, status").eq("team_b_id", user.id).eq("team_a_id", targetId),
        ]);

        setProfile(prof as Profile | null);

        if (slots && slots.length > 0) {
          const g = mkGrid();
          (slots as { slot_key: string; state: SlotState }[]).forEach(({ slot_key, state }) => {
            const [si, di] = slot_key.split("-").map(Number);
            if (!isNaN(si) && !isNaN(di) && si >= 0 && si < TIME_SLOTS.length && di >= 0 && di < DAYS.length) {
              g[si][di] = state;
            }
          });
          setGrid(g);
        }

        const allRooms = [...(roomsAB ?? []), ...(roomsBA ?? [])];
        if (allRooms.length > 0) {
          const room = allRooms[0] as { id: string; status: string };
          setRoomId(room.id);
          if (room.status === "active") setRoomStatus("active");
          else if (room.status === "rejected") setRoomStatus("rejected");
          else setRoomStatus("pending");
        }
      } finally {
        setLoading(false);
      }
    };
    void fetchAll();
  }, [user?.id, targetId, supabase]);

  const showToast = (type: "ok" | "err", text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, text });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const handleApply = async () => {
    if (!user?.id || applying || roomStatus !== "none") return;
    setApplying(true);
    try {
      const { error } = await supabase.from("chat_rooms").insert({
        team_a_id: user.id,
        team_b_id: targetId,
        team_a_name: user.name || "チームA",
        team_b_name: profile?.university_name || "チームB",
        status: "pending",
        requested_by: user.id,
      });
      if (!error) {
        setRoomStatus("pending");
        showToast("ok", "マッチ申請を送りました");
      } else {
        showToast("err", `申請に失敗しました: ${error.message}`);
      }
    } finally {
      setApplying(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div style={{ height: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
        読み込み中…
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ height: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>404</div>
          <div style={{ fontSize: 16 }}>プロフィールが見つかりません</div>
        </div>
      </div>
    );
  }

  const initials = (profile.university_name || "?").replace(/[ぁ-ん]+|[ァ-ン]+/g, "").slice(0, 2).toUpperCase() || "??";
  const isMatched = roomStatus === "active";

  const profileItems = [
    { en: "TEAM NAME", jp: "チーム名",      value: profile.university_name || "—" },
    { en: "REGION",    jp: "地域",          value: profile.region           || "—" },
    { en: "LEVEL",     jp: "レベル",         value: profile.level            || "—" },
    { en: "GENDER",    jp: "性別",          value: profile.gender           || "—" },
    { en: "LINE ID",   jp: "LINE ID",       value: isMatched ? (profile.line_id || "—") : "マッチング成立後に表示されます" },
    { en: "NOTES",     jp: "備考・コメント",  value: profile.notes            || "—" },
  ];

  const btnLabel = applying ? "申請中…" : roomStatus === "active" ? "✓ マッチ成立" : roomStatus === "pending" ? "申請済み" : roomStatus === "rejected" ? "申請が却下されました" : "マッチ申請する";
  const btnDisabled = roomStatus !== "none" || applying;
  const btnBg = roomStatus === "active" ? C.green : roomStatus === "pending" ? "#2A3448" : roomStatus === "rejected" ? "#2A2030" : C.accent;

  const hasFreeSlots = grid.some((row) => row.some((s) => s === "free"));

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      <div className="app-body" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar active="/explore" />
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          <div style={{ maxWidth: 840 }}>
            {/* Back button */}
            <button
              onClick={() => router.back()}
              style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", marginBottom: 20, padding: 0 }}
            >
              ← 戻る
            </button>

            {/* Header card */}
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "24px 28px", marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: hue(targetId), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>{profile.university_name}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {profile.level && (
                      <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: C.accent, fontWeight: 700, border: `1px solid #2C3658`, borderRadius: 6, padding: "3px 9px" }}>
                        {profile.level}
                      </span>
                    )}
                    {profile.region && (
                      <span style={{ fontSize: 12, color: C.muted }}>{profile.region}</span>
                    )}
                    {profile.gender && (
                      <span style={{ fontSize: 12, color: C.muted }}>/ {profile.gender}</span>
                    )}
                  </div>
                </div>
                {/* Match request button */}
                <button
                  onClick={() => { void handleApply(); }}
                  disabled={btnDisabled}
                  style={{
                    background: btnBg,
                    color: "#fff",
                    border: roomStatus === "pending" ? `1px solid ${C.border2}` : "none",
                    borderRadius: 12, padding: "12px 22px",
                    fontWeight: 800, fontSize: 14,
                    cursor: btnDisabled ? "default" : "pointer",
                    opacity: applying ? 0.7 : 1,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    boxShadow: roomStatus === "none" ? "0 8px 24px rgba(77,91,255,.3)" : "none",
                  }}
                >
                  {btnLabel}
                </button>
              </div>
              {profile.notes && (
                <div style={{ marginTop: 16, fontSize: 13, color: C.muted, background: "#0D1322", borderRadius: 8, padding: "10px 14px", lineHeight: 1.6 }}>
                  {profile.notes}
                </div>
              )}
            </div>

            {/* Profile details */}
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
              {profileItems.map(({ en, jp, value }, i) => (
                <div key={en} style={{ display: "flex", alignItems: "flex-start", padding: "14px 24px", borderBottom: i < profileItems.length - 1 ? `1px solid #141B2E` : "none" }}>
                  <div style={{ width: 140, flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: C.accent, fontWeight: 600 }}>{en}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{jp}</div>
                  </div>
                  <div style={{ fontSize: 13, color: en === "LINE ID" && !isMatched ? C.muted : C.dim, fontWeight: en === "LINE ID" && !isMatched ? 400 : 600, paddingTop: 2, fontStyle: en === "LINE ID" && !isMatched ? "italic" : "normal" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Availability calendar */}
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: `1px solid #141B2E`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>空き日程</div>
                {!hasFreeSlots && (
                  <span style={{ fontSize: 12, color: C.muted }}>空き日程が登録されていません</span>
                )}
                {hasFreeSlots && (
                  <div style={{ display: "flex", gap: 14, marginLeft: "auto", alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "linear-gradient(135deg,#4D5BFF,#3FC7FF)" }} /> 空き
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "rgba(255,92,108,0.7)" }} /> 予定あり
                    </span>
                  </div>
                )}
              </div>
              {hasFreeSlots && (
                <div style={{ overflowX: "auto", padding: "16px 20px" }}>
                  <table style={{ borderCollapse: "collapse", fontSize: 10 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 42, padding: "0 6px 8px", color: C.muted, fontFamily: "'Roboto Mono', monospace", fontSize: 9, textAlign: "right" }} />
                        {DAYS.map((d) => (
                          <th key={d.w} style={{ width: 34, padding: "0 0 8px", textAlign: "center", color: d.we === "sat" ? "#3FC7FF" : d.we === "sun" ? C.red : C.muted, fontWeight: 700, fontSize: 12 }}>
                            {d.w}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TIME_SLOTS.map((t, si) => (
                        <tr key={t}>
                          <td style={{ padding: "0 6px 1px 0", textAlign: "right", color: C.muted, fontFamily: "'Roboto Mono', monospace", fontSize: 9, whiteSpace: "nowrap", verticalAlign: "middle" }}>
                            {t.endsWith(":00") ? t : ""}
                          </td>
                          {DAYS.map((_, di) => {
                            const st = grid[si][di];
                            const bg =
                              st === "free" ? "linear-gradient(135deg,#4D5BFF,#3FC7FF)" :
                              st === "busy" ? "rgba(255,92,108,0.55)" : undefined;
                            return (
                              <td key={di} style={{ padding: "0 1px 1px 0" }}>
                                <div style={{
                                  width: 33, height: 13, borderRadius: 2,
                                  background: bg || "#141B2E",
                                  border: `1px solid ${C.cellBorder}`,
                                }} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "ok" ? "rgba(37,208,125,0.97)" : "rgba(255,92,108,0.97)",
          color: "#fff", padding: "12px 28px", borderRadius: 14, fontSize: 14, fontWeight: 800,
          zIndex: 200, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          {toast.type === "ok" ? "🎉 " : "✕ "}{toast.text}
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
