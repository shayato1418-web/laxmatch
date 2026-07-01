"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  cellBorder: "#1B2238",
  green: "#25D07D",
  red: "#FF5C6C",
} as const;

type SlotState = "none" | "free" | "busy";
type Toast = { id: number; type: "ok" | "err"; text: string };

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
  if (st === "free") return { background: "linear-gradient(135deg, #4D5BFF, #3FC7FF)", color: "#fff" };
  if (st === "busy") return {
    background: "repeating-linear-gradient(45deg,#1A2238,#1A2238 3px,#141A2C 3px,#141A2C 6px)",
    color: "#6A748F",
  };
  return { background: "#0E1424", color: "transparent" };
}

export default function AvailabilityPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [grid, setGrid] = useState<SlotState[][]>(mkGrid);
  const [flash, setFlash] = useState<`${number}-${number}` | null>(null);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [newMatchCount, setNewMatchCount] = useState(0);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: "ok" | "err", text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), type, text });
    toastTimer.current = setTimeout(() => setToast(null), type === "ok" ? 1800 : 3500);
  }, []);

  // Load slots + current publish state from Supabase
  useEffect(() => {
    if (!user?.id) return;
    console.log("[availability] loading for user:", user.id);

    // Load availability slots
    supabase
      .from("availability_slots")
      .select("slot_key, state")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error("[availability] load error:", error.code, error.message);
          setLoadError(`読み込みエラー: ${error.message}`);
          return;
        }
        if (!data || data.length === 0) return;
        console.log("[availability] loaded", data.length, "slots");
        setGrid((g) => {
          const next = g.map((r) => [...r]);
          (data as { slot_key: string; state: SlotState }[]).forEach(({ slot_key, state }) => {
            const [si, di] = slot_key.split("-").map(Number);
            if (!isNaN(si) && !isNaN(di) && si >= 0 && si < TIME_SLOTS.length && di >= 0 && di < DAYS.length) {
              next[si][di] = state;
            }
          });
          return next;
        });
      });

    // Load current publish state
    supabase
      .from("profiles")
      .select("is_public")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.is_public) setIsPublished(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Toggle cell state with Supabase persistence
  const toggle = async (si: number, di: number) => {
    const key = `${si}-${di}`;
    console.log("[availability] toggle", { si, di, current: grid[si][di], userId: user?.id });

    const prevState = grid[si][di];
    const newState: SlotState = prevState === "none" ? "free" : prevState === "free" ? "busy" : "none";

    setGrid((g) => {
      const next = g.map((r) => [...r]);
      next[si][di] = newState;
      return next;
    });

    setFlash(key as `${number}-${number}`);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 400);

    if (!user?.id) {
      showToast("err", "ログインが必要です");
      return;
    }

    setSavingCells((s) => new Set([...s, key]));

    const { error } = await supabase
      .from("availability_slots")
      .upsert(
        { user_id: user.id, slot_key: key, state: newState },
        { onConflict: "user_id,slot_key" }
      );

    setSavingCells((s) => { const ns = new Set(s); ns.delete(key); return ns; });

    if (error) {
      console.error("[availability] save error:", error.code, error.message, error.details, error.hint);
      showToast("err", `保存に失敗しました (${error.code ?? error.message})`);
      setGrid((g) => {
        const next = g.map((r) => [...r]);
        next[si][di] = prevState;
        return next;
      });
    } else {
      console.log("[availability] saved:", key, "→", newState);
      showToast("ok", "保存しました");
    }
  };

  // Publish: set is_public=true, then auto-match with other public users
  const handlePublish = async () => {
    if (!user?.id || publishing) return;
    setPublishing(true);
    console.log("[publish] starting for user:", user.id);

    try {
      // 1. Upsert profile with is_public = true
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            university_name: user.name || "",
            gender: user.gender || "",
            region: user.area || "",
            level: user.level || "",
            line_id: user.lineId || "",
            notes: user.notes || "",
            is_public: true,
          },
          { onConflict: "user_id" }
        );

      if (profErr) {
        console.error("[publish] profile upsert error:", profErr);
        showToast("err", `公開に失敗しました: ${profErr.message}`);
        return;
      }

      setIsPublished(true);
      console.log("[publish] profile set to public");

      // 2. Get my free slots
      const { data: mySlots } = await supabase
        .from("availability_slots")
        .select("slot_key")
        .eq("user_id", user.id)
        .eq("state", "free");

      if (!mySlots || mySlots.length === 0) {
        showToast("ok", "公開しました（空きスロットを登録するとマッチングが開始されます）");
        return;
      }

      const mySlotSet = new Set(mySlots.map((s: { slot_key: string }) => s.slot_key));
      console.log("[publish] my free slots:", mySlotSet.size);

      // 3. Get other public users
      const { data: others } = await supabase
        .from("profiles")
        .select("user_id, university_name")
        .eq("is_public", true)
        .neq("user_id", user.id);

      if (!others || others.length === 0) {
        showToast("ok", "公開しました（まだマッチング相手がいません）");
        return;
      }

      console.log("[publish] other public users:", others.length);
      let newMatches = 0;

      for (const other of others as { user_id: string; university_name: string }[]) {
        // Check if room already exists in either direction
        const [{ data: roomAB }, { data: roomBA }] = await Promise.all([
          supabase.from("chat_rooms").select("id").eq("team_a_id", user.id).eq("team_b_id", other.user_id).maybeSingle(),
          supabase.from("chat_rooms").select("id").eq("team_a_id", other.user_id).eq("team_b_id", user.id).maybeSingle(),
        ]);
        if (roomAB || roomBA) continue;

        // Check slot overlap
        const { data: theirSlots } = await supabase
          .from("availability_slots")
          .select("slot_key")
          .eq("user_id", other.user_id)
          .eq("state", "free");

        if (!theirSlots || theirSlots.length === 0) continue;

        const hasOverlap = theirSlots.some((s: { slot_key: string }) => mySlotSet.has(s.slot_key));
        if (!hasOverlap) continue;

        const { error: roomErr } = await supabase.from("chat_rooms").insert({
          team_a_id: user.id,
          team_b_id: other.user_id,
          team_a_name: user.name || "チームA",
          team_b_name: other.university_name || "チームB",
          status: "active",
        });

        if (roomErr) {
          console.error("[publish] room create error:", roomErr);
        } else {
          newMatches++;
          console.log("[publish] matched with:", other.university_name);
        }
      }

      if (newMatches > 0) {
        setNewMatchCount(newMatches);
        showToast("ok", `🎉 ${newMatches}件のマッチングが成立しました！`);
      } else {
        showToast("ok", "公開しました（マッチング相手を探しています）");
      }
    } catch (err) {
      console.error("[publish] error:", err);
      showToast("err", "公開処理中にエラーが発生しました");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      <div className="app-body" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar active="/availability" />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div className="avail-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>AVAILABILITY</div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 3 }}>空き日程を登録</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {savingCells.size > 0 && (
                <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: 1 }}>
                  保存中…
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#121829", border: `1px solid ${C.border2}`, borderRadius: 10, padding: "8px 16px" }}>
                <span style={{ fontSize: 15, color: C.muted, cursor: "pointer", userSelect: "none" }}>‹</span>
                <span style={{ fontSize: 13, fontWeight: 800 }}>6月23日 — 29日</span>
                <span style={{ fontSize: 15, color: C.muted, cursor: "pointer", userSelect: "none" }}>›</span>
              </div>
              <button
                className="avail-publish-btn gradient-btn"
                onClick={handlePublish}
                disabled={publishing}
                style={{
                  background: isPublished ? C.green : C.accent,
                  color: "#fff", fontSize: 13, fontWeight: 800,
                  padding: "10px 20px", borderRadius: 10, border: "none",
                  cursor: publishing ? "wait" : "pointer",
                  opacity: publishing ? 0.7 : 1,
                  transition: "background 0.2s",
                }}
              >
                {publishing ? "公開中…" : isPublished ? "✓ 公開済み" : "公開する"}
              </button>
            </div>
          </div>

          {/* Load error banner */}
          {loadError && (
            <div style={{ padding: "10px 24px", background: "rgba(255,92,108,0.1)", borderBottom: `1px solid rgba(255,92,108,0.2)`, fontSize: 12, color: C.red, flexShrink: 0 }}>
              ⚠ {loadError} — セルをタップして手動で設定できます
            </div>
          )}

          {/* New match banner */}
          {newMatchCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", background: "rgba(37,208,125,0.12)", borderBottom: "1px solid rgba(37,208,125,0.25)", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
                🎉 {newMatchCount}件のマッチングが成立しました！
              </span>
              <Link href="/matches" style={{ fontSize: 12, color: C.green, fontWeight: 700, textDecoration: "none" }}>
                マッチング一覧を見る →
              </Link>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: "flex", gap: 20, padding: "10px 24px", borderBottom: `1px solid #141B2E`, flexShrink: 0, alignItems: "center" }}>
            {[
              { bg: "linear-gradient(135deg, #4D5BFF, #3FC7FF)", label: "空き" },
              { bg: "repeating-linear-gradient(45deg,#1A2238,#1A2238 3px,#141A2C 3px,#141A2C 6px)", label: "予定あり" },
              { bg: "#0E1424", label: "未設定", border: `1px solid ${C.cellBorder}` },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: l.border, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.muted }}>{l.label}</span>
              </div>
            ))}
            <span className="avail-hint" style={{ marginLeft: "auto", fontSize: 11, color: "#5A647F" }}>
              タップで 未設定 → 空き → 予定あり → 未設定
            </span>
          </div>

          {/* Calendar grid */}
          <div className="app-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
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
                      const cellKey = `${si}-${di}` as const;
                      const isFlashing = flash === cellKey;
                      const isSaving = savingCells.has(`${si}-${di}`);
                      return (
                        <button
                          key={di}
                          type="button"
                          onClick={() => { void toggle(si, di); }}
                          disabled={isSaving}
                          style={{
                            height: 44,
                            borderRadius: 7,
                            border: isFlashing ? `2px solid #fff` : `1px solid ${C.cellBorder}`,
                            cursor: isSaving ? "wait" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700,
                            transition: "border-color 0.15s, transform 0.1s, opacity 0.1s",
                            transform: isFlashing ? "scale(0.94)" : "scale(1)",
                            opacity: isSaving ? 0.5 : 1,
                            WebkitTapHighlightColor: "transparent",
                            touchAction: "manipulation",
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

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "ok" ? "rgba(37,208,125,0.95)" : "rgba(255,92,108,0.95)",
          color: "#fff", padding: "10px 22px", borderRadius: 12, fontSize: 13, fontWeight: 700,
          zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", pointerEvents: "none",
          whiteSpace: "nowrap", letterSpacing: 0.3,
        }}>
          {toast.type === "ok" ? "✓ " : "✕ "}{toast.text}
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
