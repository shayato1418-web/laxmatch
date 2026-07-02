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
  orange: "#FF9500",
} as const;

// ─── State types ──────────────────────────────────────────────────────────────
type SlotState = "none" | "free" | "busy";
type Toast = { id: number; type: "ok" | "err"; text: string };

function nextState(st: SlotState): SlotState {
  return st === "none" ? "free" : st === "free" ? "busy" : "none";
}

// ─── Time / Day config ────────────────────────────────────────────────────────
// 6:00 〜 22:00 を 1 時間刻み（17スロット）
const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 22; h++) TIME_SLOTS.push(`${h}:00`);

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

// ─── Cell style helpers ───────────────────────────────────────────────────────
type CellStyle = { background: string; border: string; color: string };

function stateStyle(st: SlotState): CellStyle {
  if (st === "free") return {
    background: "linear-gradient(135deg, #4D5BFF, #3FC7FF)",
    border: "1px solid transparent",
    color: "#fff",
  };
  if (st === "busy") return {
    background: "linear-gradient(135deg, #FF5C6C 0%, #FF9500 100%)",
    border: "1px solid transparent",
    color: "#fff",
  };
  return {
    background: "#0E1424",
    border: `1px solid #1B2238`,
    color: "transparent",
  };
}

function previewStyle(targetState: SlotState): CellStyle {
  if (targetState === "free") return {
    background: "rgba(77,91,255,0.5)",
    border: "2px solid #4D5BFF",
    color: "#fff",
  };
  if (targetState === "busy") return {
    background: "rgba(255,92,108,0.45)",
    border: "2px solid #FF5C6C",
    color: "#fff",
  };
  return {
    background: "rgba(14,20,36,0.85)",
    border: "2px solid #2A3448",
    color: "transparent",
  };
}

// ─── Drag state type ──────────────────────────────────────────────────────────
type Drag = {
  startSi: number;
  startDi: number;
  currentSi: number;
  targetState: SlotState;
};

// ─── Page component ───────────────────────────────────────────────────────────
export default function AvailabilityPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [grid, setGrid]               = useState<SlotState[][]>(mkGrid);
  const [drag, setDrag]               = useState<Drag | null>(null);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState<Toast | null>(null);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [publishing, setPublishing]   = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [newMatchCount, setNewMatchCount] = useState(0);

  // Refs for stable reads inside window-level handlers (avoids stale closures)
  const gridRef    = useRef<SlotState[][]>(mkGrid());
  const dragRef    = useRef<Drag | null>(null);
  const userRef    = useRef(user);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { dragRef.current = drag; }, [drag]);
  useEffect(() => { userRef.current = user; }, [user]);

  const showToast = useCallback((type: "ok" | "err", text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), type, text });
    toastTimer.current = setTimeout(() => setToast(null), type === "ok" ? 1800 : 3500);
  }, []);

  // ─── Load slots from Supabase ───────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    supabase.from("availability_slots").select("slot_key, state").eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) { setLoadError(`読み込みエラー: ${error.message}`); return; }
        if (!data?.length) return;
        setGrid((g) => {
          const next = g.map((r) => [...r]);
          (data as { slot_key: string; state: string }[]).forEach(({ slot_key, state }) => {
            const [si, di] = slot_key.split("-").map(Number);
            if (!isNaN(si) && !isNaN(di) && si >= 0 && si < TIME_SLOTS.length && di >= 0 && di < DAYS.length) {
              next[si][di] = state === "free" ? "free" : state === "busy" ? "busy" : "none";
            }
          });
          return next;
        });
      });

    supabase.from("profiles").select("is_public").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.is_public) setIsPublished(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ─── Window pointerup: commit the drag ─────────────────────────────────────
  // Uses refs so this handler always sees the latest drag/grid/user state
  // without needing to re-register on every render.
  useEffect(() => {
    const commit = () => {
      const d = dragRef.current;
      if (!d) return;

      const uid     = userRef.current?.id;
      const prevGrid = gridRef.current.map((r) => [...r]);
      const minSi   = Math.min(d.startSi, d.currentSi);
      const maxSi   = Math.max(d.startSi, d.currentSi);

      // Apply to local grid immediately
      setGrid((g) => {
        const next = g.map((r) => [...r]);
        for (let si = minSi; si <= maxSi; si++) next[si][d.startDi] = d.targetState;
        return next;
      });
      setDrag(null);

      if (!uid) return;

      // Build upsert rows for all changed cells
      const rows: { user_id: string; slot_key: string; state: string }[] = [];
      for (let si = minSi; si <= maxSi; si++) {
        rows.push({ user_id: uid, slot_key: `${si}-${d.startDi}`, state: d.targetState });
      }

      setSaving(true);
      supabase.from("availability_slots")
        .upsert(rows, { onConflict: "user_id,slot_key" })
        .then(({ error }) => {
          setSaving(false);
          if (error) {
            showToast("err", `保存に失敗しました (${error.code ?? error.message})`);
            setGrid(prevGrid); // revert on error
          } else {
            showToast("ok", "保存しました");
          }
        });
    };

    window.addEventListener("pointerup", commit);
    return () => window.removeEventListener("pointerup", commit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — reads latest via refs

  // ─── Pointer move: extend drag range ───────────────────────────────────────
  // Placed on the grid container so it fires even when touch-action:none
  // redirects implicit capture to a cell button (events still bubble up).
  const handleGridPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    // Use elementFromPoint so we correctly identify the cell under the pointer
    // even when pointer events are implicitly captured by the original cell.
    const el = document.elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-si]") as HTMLElement | null;
    if (!el) return;
    const si = parseInt(el.dataset.si ?? "");
    const di = parseInt(el.dataset.di ?? "");
    if (!isNaN(si) && !isNaN(di) && di === d.startDi && si !== d.currentSi) {
      setDrag((prev) => (prev ? { ...prev, currentSi: si } : prev));
    }
  };

  // ─── Preview key set ────────────────────────────────────────────────────────
  const previewKeys = useMemo(() => {
    if (!drag) return new Set<string>();
    const keys = new Set<string>();
    const minSi = Math.min(drag.startSi, drag.currentSi);
    const maxSi = Math.max(drag.startSi, drag.currentSi);
    for (let si = minSi; si <= maxSi; si++) keys.add(`${si}-${drag.startDi}`);
    return keys;
  }, [drag]);

  // ─── Publish + auto-match ───────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!user?.id || publishing) return;
    setPublishing(true);

    try {
      const { error: profErr } = await supabase.from("profiles").upsert(
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
      if (profErr) { showToast("err", `公開に失敗しました: ${profErr.message}`); return; }
      setIsPublished(true);

      const { data: mySlots } = await supabase
        .from("availability_slots").select("slot_key").eq("user_id", user.id).eq("state", "free");
      if (!mySlots || mySlots.length === 0) {
        showToast("ok", "公開しました（空きスロットを登録するとマッチングが開始されます）");
        return;
      }

      const mySlotSet = new Set(mySlots.map((s: { slot_key: string }) => s.slot_key));

      const { data: others } = await supabase
        .from("profiles").select("user_id, university_name").eq("is_public", true).neq("user_id", user.id);
      if (!others || others.length === 0) {
        showToast("ok", "公開しました（まだマッチング相手がいません）");
        return;
      }

      let newMatches = 0;
      for (const other of others as { user_id: string; university_name: string }[]) {
        const [{ data: roomAB }, { data: roomBA }] = await Promise.all([
          supabase.from("chat_rooms").select("id").eq("team_a_id", user.id).eq("team_b_id", other.user_id).maybeSingle(),
          supabase.from("chat_rooms").select("id").eq("team_a_id", other.user_id).eq("team_b_id", user.id).maybeSingle(),
        ]);
        if (roomAB || roomBA) continue;

        const { data: theirSlots } = await supabase
          .from("availability_slots").select("slot_key").eq("user_id", other.user_id).eq("state", "free");
        if (!theirSlots?.some((s: { slot_key: string }) => mySlotSet.has(s.slot_key))) continue;

        const { error: roomErr } = await supabase.from("chat_rooms").insert({
          team_a_id: user.id,
          team_b_id: other.user_id,
          team_a_name: user.name || "チームA",
          team_b_name: other.university_name || "チームB",
          status: "active",
        });
        if (!roomErr) newMatches++;
      }

      if (newMatches > 0) {
        setNewMatchCount(newMatches);
        showToast("ok", `🎉 ${newMatches}件のマッチングが成立しました！`);
      } else {
        showToast("ok", "公開しました（マッチング相手を探しています）");
      }
    } catch {
      showToast("err", "公開処理中にエラーが発生しました");
    } finally {
      setPublishing(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      <div className="app-body" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar active="/availability" />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="avail-header" style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "18px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
          }}>
            <div>
              <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>
                AVAILABILITY
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 3 }}>空き日程を登録</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {saving && (
                <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: C.muted, letterSpacing: 1 }}>
                  保存中…
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#121829", border: `1px solid ${C.border2}`, borderRadius: 10, padding: "8px 16px" }}>
                <span style={{ fontSize: 15, color: C.muted, userSelect: "none" }}>‹</span>
                <span style={{ fontSize: 13, fontWeight: 800 }}>6月23日 — 29日</span>
                <span style={{ fontSize: 15, color: C.muted, userSelect: "none" }}>›</span>
              </div>
              <button
                className="avail-publish-btn"
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

          {/* ── Error banner ───────────────────────────────────────────────── */}
          {loadError && (
            <div style={{
              padding: "10px 24px",
              background: "rgba(255,92,108,0.1)", borderBottom: `1px solid rgba(255,92,108,0.2)`,
              fontSize: 12, color: C.red, flexShrink: 0,
            }}>
              ⚠ {loadError}
            </div>
          )}

          {/* ── New match banner ────────────────────────────────────────────── */}
          {newMatchCount > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 24px",
              background: "rgba(37,208,125,0.12)", borderBottom: "1px solid rgba(37,208,125,0.25)",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
                🎉 {newMatchCount}件のマッチングが成立しました！
              </span>
              <Link href="/matches" style={{ fontSize: 12, color: C.green, fontWeight: 700, textDecoration: "none" }}>
                マッチング一覧を見る →
              </Link>
            </div>
          )}

          {/* ── Legend ─────────────────────────────────────────────────────── */}
          <div style={{
            display: "flex", gap: 16, padding: "10px 24px",
            borderBottom: `1px solid #141B2E`, flexShrink: 0,
            alignItems: "center", flexWrap: "wrap",
          }}>
            {[
              { bg: "linear-gradient(135deg, #4D5BFF, #3FC7FF)", label: "◎ 空き" },
              { bg: "linear-gradient(135deg, #FF5C6C, #FF9500)", label: "✕ 予定あり" },
              { bg: "#0E1424", label: "− 未設定", border: "1px solid #1B2238" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: l.bg, border: l.border, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.muted }}>{l.label}</span>
              </div>
            ))}
            <span className="avail-hint" style={{ marginLeft: "auto", fontSize: 11, color: "#5A647F" }}>
              タップで状態切替 / 縦ドラッグで範囲選択
            </span>
          </div>

          {/* ── Calendar grid ──────────────────────────────────────────────── */}
          <div
            className="app-scroll"
            style={{ flex: 1, overflowY: "auto", overflowX: "auto", cursor: drag ? "ns-resize" : "auto" }}
            onPointerMove={handleGridPointerMove}
          >
            <div style={{ minWidth: 480, padding: "0 16px 40px" }}>

              {/* Sticky day header */}
              <div style={{
                position: "sticky", top: 0, zIndex: 10,
                display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", gap: 3,
                background: C.bg, padding: "12px 0 8px",
                borderBottom: `1px solid ${C.border}`, marginBottom: 6,
              }}>
                <div />
                {DAYS.map((d) => (
                  <div key={d.n} style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: 13, fontWeight: 800,
                      color: d.we === "sat" ? "#5BA8FF" : d.we === "sun" ? "#FF7A8A" : C.dim,
                    }}>
                      {d.w}
                    </div>
                    <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: C.muted, marginTop: 2 }}>
                      {d.n}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time rows */}
              {TIME_SLOTS.map((label, si) => (
                <div
                  key={label}
                  style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", gap: 3, marginBottom: 3 }}
                >
                  {/* Time label (no touch-action:none here — allows vertical scroll) */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "flex-end",
                    fontFamily: "'Roboto Mono', monospace", fontSize: 11,
                    color: "#9AA4C2", fontWeight: 600, paddingRight: 8,
                    userSelect: "none",
                  }}>
                    {label}
                  </div>

                  {/* Day cells */}
                  {DAYS.map((_, di) => {
                    const key      = `${si}-${di}`;
                    const isPreview = previewKeys.has(key);
                    const st        = grid[si][di];
                    const cs        = isPreview ? previewStyle(drag!.targetState) : stateStyle(st);

                    const label =
                      isPreview
                        ? (drag!.targetState === "free" ? "空き" : drag!.targetState === "busy" ? "予定" : "")
                        : st === "free" ? "空き" : st === "busy" ? "予定" : "";

                    return (
                      <button
                        key={di}
                        type="button"
                        data-si={si}
                        data-di={di}
                        onPointerDown={(e) => {
                          e.preventDefault(); // prevents click / text-select
                          const target = nextState(st);
                          setDrag({ startSi: si, startDi: di, currentSi: si, targetState: target });
                        }}
                        style={{
                          height: 52,
                          borderRadius: 7,
                          background: cs.background,
                          border: cs.border,
                          color: cs.color,
                          cursor: "inherit",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700,
                          touchAction: "none",          // prevents browser scroll during drag
                          userSelect: "none",
                          WebkitTapHighlightColor: "transparent",
                          transition: isPreview ? "none" : "background 0.1s, border 0.1s",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
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
