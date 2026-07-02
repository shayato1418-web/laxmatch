"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

const S = {
  bg: "#0B1120",
  border: "#1A2138",
  accent: "#4D5BFF",
  activeBg: "#161E33",
  text: "#EAF0FF",
  muted: "#8A94B2",
  cardBg: "#111728",
  cardBorder: "#1F2740",
  badge: "#FF5C6C",
  dropBg: "#111728",
  dropBorder: "#1F2740",
} as const;

type Notif = { id: number; text: string; time: string; read: boolean };

const LINKS = [
  { label: "探す",         href: "/explore" },
  { label: "空き日程",     href: "/availability" },
  { label: "マッチング",   href: "/matches" },
  { label: "チャット",     href: "/chat" },
  { label: "通知",         href: "/notifications" },
  { label: "プロフィール", href: "/profile" },
];

export default function Sidebar({ active }: { active: string }) {
  const { user, logout, impersonation, returnToAdmin } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [dropTop, setDropTop] = useState(200);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !notifBtnRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  // Load pending match-request count + notifications unread count
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;

    const loadCounts = () => {
      supabase
        .from("chat_rooms")
        .select("id", { count: "exact", head: true })
        .eq("team_b_id", uid)
        .eq("status", "pending")
        .then(({ count }) => setPendingCount(count ?? 0));

      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("is_read", false)
        .then(({ count }) => setNotifUnread(count ?? 0));
    };

    loadCounts();

    const ch = supabase
      .channel("sidebar-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_rooms", filter: `team_b_id=eq.${uid}` }, loadCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, loadCounts)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const toggleNotif = () => {
    if (!notifOpen && notifBtnRef.current) {
      const rect = notifBtnRef.current.getBoundingClientRect();
      setDropTop(rect.top);
    }
    setNotifOpen((v) => !v);
  };

  const markRead = (id: number) =>
    setNotifs((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));

  const markAllRead = () => setNotifs((n) => n.map((x) => ({ ...x, read: true })));

  const unreadCount = notifs.filter((n) => !n.read).length;

  const displayName =
    user?.role === "manager" ? "管理者" :
    user?.name || "ゲスト";
  const initials =
    displayName.replace(/[ぁ-ん]+|[ァ-ン]+|[A-Za-z]/g, "").slice(0, 2) ||
    displayName.slice(0, 2).toUpperCase();

  const handleReturnToAdmin = async () => {
    try {
      await returnToAdmin();
      router.push("/admin");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "管理人への復帰に失敗しました");
    }
  };

  return (
    <>
      {impersonation && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "#FF9500", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px", fontSize: 13, fontWeight: 700,
          boxShadow: "0 2px 12px rgba(255,149,0,0.4)",
        }}>
          <span>⚠️ 代理ログイン中：{user?.name || user?.email}</span>
          <button
            onClick={() => { void handleReturnToAdmin(); }}
            style={{ background: "rgba(0,0,0,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            管理人に戻る
          </button>
        </div>
      )}
      <aside className="app-sidebar" style={{ marginTop: impersonation ? 42 : 0,
        width: 236,
        minWidth: 236,
        background: S.bg,
        borderRight: `1px solid ${S.border}`,
        padding: "22px 16px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}>
        <Link href="/explore" style={{
          fontFamily: "'Archivo', sans-serif",
          fontWeight: 900,
          fontSize: 19,
          letterSpacing: 0.5,
          padding: "0 8px",
          color: S.text,
          textDecoration: "none",
        }}>
          LAX<span style={{ color: S.accent }}>·</span>MATCH
        </Link>

        <nav style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 4 }}>
          {LINKS.map((item) => {
            const isActive = active === item.href;
            const totalBadge = item.href === "/notifications" ? notifUnread : 0;
            const badge = totalBadge > 0 ? totalBadge : null;
            return (
              <Link key={item.label} href={item.href} style={{
                background: isActive ? S.activeBg : "transparent",
                color: isActive ? "#fff" : S.muted,
                display: "flex",
                alignItems: "center",
                gap: 11,
                fontSize: 14,
                fontWeight: 700,
                padding: "12px 14px",
                borderRadius: 10,
                textDecoration: "none",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: isActive ? S.accent : "transparent", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {badge !== null && (
                  <span style={{ background: S.badge, color: "#fff", fontFamily: "'Roboto Mono', monospace", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 7px" }}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}

          <Link href="/settings" style={{
            background: active === "/settings" ? S.activeBg : "transparent",
            color: active === "/settings" ? "#fff" : S.muted,
            display: "flex",
            alignItems: "center",
            gap: 11,
            fontSize: 14,
            fontWeight: 700,
            padding: "12px 14px",
            borderRadius: 10,
            textDecoration: "none",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: active === "/settings" ? S.accent : "transparent", flexShrink: 0 }} />
            <span>設定</span>
          </Link>
        </nav>

        <div style={{ marginTop: "auto" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 10,
            background: S.cardBg,
            borderRadius: 11,
            border: `1px solid ${S.cardBorder}`,
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: S.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 900,
              fontSize: 11,
              color: "#fff",
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: S.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10.5, color: S.muted }}>
                {user?.role === "manager" ? "管理者" : user?.name || "—"}
              </div>
            </div>
            <button
              onClick={async () => { await logout(); router.replace("/login"); }}
              title="ログアウト"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#5A647F", fontSize: 14, padding: "4px 2px", flexShrink: 0 }}
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Notification dropdown — rendered as a sibling so it can overlay main content */}
      {notifOpen && (
        <div
          ref={dropRef}
          style={{
            position: "fixed",
            left: 252,
            top: Math.max(60, dropTop),
            width: 320,
            background: S.dropBg,
            border: `1px solid ${S.dropBorder}`,
            borderRadius: 14,
            zIndex: 200,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: `1px solid #1A2138`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>通知</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: 11, color: S.accent, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
              >
                すべて既読にする
              </button>
            )}
          </div>

          {/* Content */}
          {notifs.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: S.muted, fontSize: 13 }}>
              通知はありません
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    padding: "14px 18px",
                    borderBottom: `1px solid #141B2E`,
                    background: n.read ? "transparent" : "rgba(77,91,255,0.06)",
                    cursor: "pointer",
                    border: "none",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: n.read ? "transparent" : S.accent,
                    flexShrink: 0,
                    marginTop: 5,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: n.read ? S.muted : S.text, lineHeight: 1.5 }}>{n.text}</div>
                    <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: "#5A647F", marginTop: 4 }}>{n.time}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
