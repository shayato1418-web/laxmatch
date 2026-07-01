"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

type SysNotif = {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

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
  "linear-gradient(135deg,#F953C6,#B91D73)",
  "linear-gradient(135deg,#2AF598,#009EFD)",
];

function avatarHue(id: string): string {
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
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Room = {
  id: string;
  team_a_id: string;
  team_a_name: string;
  team_b_name: string;
  status: string;
  created_at: string;
};

type Toast = { type: "ok" | "err"; text: string };

export default function NotificationsPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [pending, setPending] = useState<Room[]>([]);
  const [resolved, setResolved] = useState<Room[]>([]);
  const [sysNotifs, setSysNotifs] = useState<SysNotif[]>([]);
  const [acting, setActing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: "ok" | "err", text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, text });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const [roomsRes, notifsRes] = await Promise.all([
      supabase
        .from("chat_rooms")
        .select("id, team_a_id, team_a_name, team_b_name, status, created_at")
        .eq("team_b_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("notifications")
        .select("id, message, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (roomsRes.data) {
      setPending((roomsRes.data as Room[]).filter((r) => r.status === "pending"));
      setResolved((roomsRes.data as Room[]).filter((r) => r.status !== "pending"));
    }
    if (notifsRes.data) {
      setSysNotifs(notifsRes.data as SysNotif[]);
      // Mark unread as read
      const unreadIds = (notifsRes.data as SysNotif[]).filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      }
    }
    setLoading(false);
  }, [user?.id, supabase]);

  useEffect(() => { void load(); }, [load]);

  // Realtime: listen for new pending requests
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const ch = supabase
      .channel("notif-rooms")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_rooms", filter: `team_b_id=eq.${uid}` },
        (payload) => {
          const r = payload.new as Room;
          if (r.status === "pending") {
            setPending((prev) => [r, ...prev.filter((x) => x.id !== r.id)]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `team_b_id=eq.${uid}` },
        (payload) => {
          const r = payload.new as Room;
          setPending((prev) => prev.filter((x) => x.id !== r.id));
          if (r.status !== "pending") {
            setResolved((prev) => [r, ...prev.filter((x) => x.id !== r.id)]);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const approve = async (roomId: string) => {
    if (acting.has(roomId)) return;
    setActing((s) => new Set([...s, roomId]));
    const { error } = await supabase
      .from("chat_rooms")
      .update({ status: "active" })
      .eq("id", roomId)
      .eq("team_b_id", user?.id ?? "");
    if (error) {
      showToast("err", `承認に失敗しました: ${error.message}`);
    } else {
      setPending((prev) => {
        const room = prev.find((r) => r.id === roomId);
        if (room) setResolved((rs) => [{ ...room, status: "active" }, ...rs]);
        return prev.filter((r) => r.id !== roomId);
      });
      showToast("ok", "承認しました！チャットが開放されました");
    }
    setActing((s) => { const ns = new Set(s); ns.delete(roomId); return ns; });
  };

  const reject = async (roomId: string) => {
    if (acting.has(roomId)) return;
    setActing((s) => new Set([...s, roomId]));
    const { error } = await supabase
      .from("chat_rooms")
      .update({ status: "rejected" })
      .eq("id", roomId)
      .eq("team_b_id", user?.id ?? "");
    if (error) {
      showToast("err", `操作に失敗しました: ${error.message}`);
    } else {
      setPending((prev) => {
        const room = prev.find((r) => r.id === roomId);
        if (room) setResolved((rs) => [{ ...room, status: "rejected" }, ...rs]);
        return prev.filter((r) => r.id !== roomId);
      });
      showToast("ok", "申請を断りました");
    }
    setActing((s) => { const ns = new Set(s); ns.delete(roomId); return ns; });
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      <div className="app-body" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar active="/notifications" />

        <main className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>NOTIFICATIONS</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6, marginBottom: 28 }}>
            通知
            {pending.length > 0 && (
              <span style={{ marginLeft: 10, background: C.red, color: "#fff", fontFamily: "'Roboto Mono', monospace", fontSize: 12, fontWeight: 700, borderRadius: 12, padding: "2px 10px" }}>
                {pending.length}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: "#1F2740", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 16, width: `${55 + i * 15}%`, background: "#1F2740", borderRadius: 6, marginBottom: 10 }} />
                    <div style={{ height: 11, width: "40%", background: "#161E33", borderRadius: 6 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ width: 84, height: 40, borderRadius: 10, background: "#1F2740" }} />
                    <div style={{ width: 64, height: 40, borderRadius: 10, background: "#161E33" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Pending requests */}
              {pending.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.yellow, marginBottom: 12, letterSpacing: 0.5 }}>
                    承認待ちの申請 {pending.length}件
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pending.map((r) => {
                      const isActing = acting.has(r.id);
                      return (
                        <div key={r.id} style={{
                          background: C.card,
                          border: `1px solid rgba(247,183,49,0.3)`,
                          borderRadius: 16, padding: "18px 22px",
                          display: "flex", alignItems: "center", gap: 16,
                        }}>
                          <div style={{ width: 48, height: 48, borderRadius: 13, background: avatarHue(r.id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 14, color: "#fff", flexShrink: 0 }}>
                            {roomInitials(r.team_a_name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 900 }}>{r.team_a_name}</div>
                            <div style={{ fontSize: 12, color: C.muted, marginTop: 3, fontFamily: "'Roboto Mono', monospace" }}>
                              マッチング申請 · {fmtDate(r.created_at)}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                            <button
                              onClick={() => { void approve(r.id); }}
                              disabled={isActing}
                              style={{
                                background: C.green, color: "#fff", border: "none",
                                borderRadius: 10, padding: "10px 18px",
                                fontSize: 13, fontWeight: 800,
                                cursor: isActing ? "wait" : "pointer",
                                opacity: isActing ? 0.6 : 1,
                              }}
                            >
                              {isActing ? "処理中…" : "承認する"}
                            </button>
                            <button
                              onClick={() => { void reject(r.id); }}
                              disabled={isActing}
                              style={{
                                background: "transparent", color: C.red,
                                border: `1px solid rgba(255,92,108,0.4)`,
                                borderRadius: 10, padding: "10px 18px",
                                fontSize: 13, fontWeight: 800,
                                cursor: isActing ? "wait" : "pointer",
                                opacity: isActing ? 0.6 : 1,
                              }}
                            >
                              断る
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resolved */}
              {resolved.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.muted, marginBottom: 12, letterSpacing: 0.5 }}>
                    対応済み
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {resolved.map((r) => {
                      const approved = r.status === "active";
                      return (
                        <div key={r.id} style={{
                          background: C.card, border: `1px solid ${C.cardBorder}`,
                          borderRadius: 14, padding: "14px 20px",
                          display: "flex", alignItems: "center", gap: 14,
                          opacity: 0.7,
                        }}>
                          <div style={{ width: 40, height: 40, borderRadius: 11, background: avatarHue(r.id), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 12, color: "#fff", flexShrink: 0 }}>
                            {roomInitials(r.team_a_name)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>{r.team_a_name}</div>
                            <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Roboto Mono', monospace", marginTop: 2 }}>
                              {fmtDate(r.created_at)}
                            </div>
                          </div>
                          <span style={{
                            fontFamily: "'Roboto Mono', monospace", fontSize: 11, fontWeight: 700,
                            color: approved ? C.green : C.red,
                            border: `1px solid ${approved ? C.green : C.red}`,
                            borderRadius: 6, padding: "4px 10px",
                          }}>
                            {approved ? "承認済み" : "断った"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* System notifications */}
              {sysNotifs.length > 0 && (
                <div style={{ marginTop: resolved.length > 0 ? 32 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.accent, marginBottom: 12, letterSpacing: 0.5 }}>
                    お知らせ
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {sysNotifs.map((n) => (
                      <div key={n.id} style={{
                        background: C.card,
                        border: `1px solid ${n.is_read ? C.cardBorder : "rgba(77,91,255,0.4)"}`,
                        borderRadius: 14, padding: "14px 20px",
                        display: "flex", alignItems: "flex-start", gap: 14,
                      }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(77,91,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          🔔
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.6, marginBottom: 4 }}>{n.message}</div>
                          <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Roboto Mono', monospace" }}>
                            {fmtDate(n.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pending.length === 0 && resolved.length === 0 && sysNotifs.length === 0 && (
                <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>🔔</div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>通知はありません</div>
                  <div style={{ fontSize: 13, color: "#5A647F" }}>マッチング申請が届くとここに表示されます</div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "ok" ? "rgba(37,208,125,0.97)" : "rgba(255,92,108,0.97)",
          color: "#fff", padding: "12px 28px", borderRadius: 14, fontSize: 14, fontWeight: 800,
          zIndex: 200, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          {toast.type === "ok" ? "✓ " : "✕ "}{toast.text}
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
