"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  listBg: "#0D131F",
  inputBg: "#121829",
  bubbleThem: "#161E33",
  labelColor: "#5A647F",
  green: "#25D07D",
} as const;

const HUES = [
  "linear-gradient(135deg, #4D5BFF, #3FC7FF)",
  "linear-gradient(135deg, #25D07D, #1AB068)",
  "linear-gradient(135deg, #FF5F57, #FF9500)",
  "linear-gradient(135deg, #B44FFF, #7E22CE)",
];

function roomHue(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)) & 0xffff;
  return HUES[n % HUES.length];
}

function roomInitials(name: string): string {
  const k = name.replace(/[ぁ-ん]+|[ァ-ン]+|[A-Za-z\s]/g, "").slice(0, 2);
  return k || name.slice(0, 2).toUpperCase() || "??";
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Msg = { id: string; from: "me" | "them"; text: string; time: string };
type Conv = {
  id: string;
  en: string;
  hue: string;
  uni: string;
  last: string;
  time: string;
  confirmed: boolean;
  messages: Msg[];
};
type DbMsg = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};
type DbRoom = {
  id: string;
  team_a_id: string;
  team_b_id: string;
  team_a_name: string;
  team_b_name: string;
  status: string;
  messages?: DbMsg[];
};

export default function ChatPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const active = convs.length > 0 ? convs[activeIdx] : null;

  useEffect(() => {
    if (active) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.messages.length]);

  const mapRoom = useCallback((room: DbRoom, uid: string): Conv => {
    const isA = room.team_a_id === uid;
    const other = isA ? room.team_b_name : room.team_a_name;
    const msgs = [...(room.messages ?? [])]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((m): Msg => ({
        id: m.id,
        from: m.sender_id === uid ? "me" : "them",
        text: m.content,
        time: fmtTime(m.created_at),
      }));
    const last = msgs[msgs.length - 1];
    return {
      id: room.id,
      en: roomInitials(other),
      hue: roomHue(room.id),
      uni: other,
      last: last?.text ?? "",
      time: last?.time ?? "",
      confirmed: room.status === "active",
      messages: msgs,
    };
  }, []);

  // Load rooms + their messages on mount
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("chat_rooms")
      .select("*, messages(*)")
      .or(`team_a_id.eq.${user.id},team_b_id.eq.${user.id}`)
      .then(({ data, error }) => {
        if (error) { console.error("chat_rooms:", error); return; }
        setConvs(((data ?? []) as DbRoom[]).map((r) => mapRoom(r, user.id)));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime: append incoming messages
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const ch = supabase
      .channel("chat-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as DbMsg;
        setConvs((prev) => {
          const i = prev.findIndex((c) => c.id === m.room_id);
          if (i === -1) return prev;
          if (prev[i].messages.some((x) => x.id === m.id)) return prev;
          const msg: Msg = {
            id: m.id,
            from: m.sender_id === uid ? "me" : "them",
            text: m.content,
            time: fmtTime(m.created_at),
          };
          const next = [...prev];
          next[i] = { ...next[i], messages: [...next[i].messages, msg], last: m.content, time: fmtTime(m.created_at) };
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const send = async () => {
    const t = draft.trim();
    if (!t || !active?.confirmed || !user?.id || sending) return;
    setSending(true);
    setDraft("");
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({ room_id: active.id, sender_id: user.id, content: t })
        .select("id, created_at")
        .single();
      if (!error && data) {
        const msg: Msg = { id: data.id, from: "me", text: t, time: fmtTime(data.created_at) };
        setConvs((prev) =>
          prev.map((c, i) =>
            i === activeIdx
              ? { ...c, messages: [...c.messages, msg], last: t, time: fmtTime(data.created_at) }
              : c
          )
        );
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      {/* Chrome bar */}
      <div className="chrome-bar" style={{ position: "fixed", top: 0, left: 0, right: 0, height: 42, background: C.header, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, zIndex: 50 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ minWidth: 360, background: "#161E33", border: `1px solid ${C.border2}`, borderRadius: 8, padding: "6px 16px", fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: C.muted, textAlign: "center" }}>
            laxmatch.jp/chat
          </div>
        </div>
        <div style={{ width: 54 }} />
      </div>

      <div className="app-body" style={{ display: "flex", flex: 1, paddingTop: 42, overflow: "hidden" }}>
        <Sidebar active="/chat" />

        {/* Conversation list */}
        <div className={`chat-conv-panel${mobileView === "chat" ? " chat-hidden-mobile" : ""}`} style={{ width: 300, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>メッセージ</div>
            <div style={{ marginTop: 12, background: C.inputBg, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "9px 13px", fontSize: 12.5, color: "#7A85A6" }}>
              検索
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {convs.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center", color: C.muted, fontSize: 13, lineHeight: 1.8 }}>
                まだチャットはありません。<br />マッチング後に開放されます。
              </div>
            ) : (
              convs.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => { setActiveIdx(i); setMobileView("chat"); }}
                  style={{
                    width: "100%", display: "flex", gap: 12, padding: "15px 18px",
                    borderBottom: `1px solid #141B2E`, cursor: "pointer", alignItems: "center",
                    background: i === activeIdx ? "#0F1626" : "transparent",
                    borderLeft: i === activeIdx ? `3px solid ${C.accent}` : "3px solid transparent",
                    textAlign: "left", border: "none", outline: "none",
                    opacity: c.confirmed ? 1 : 0.55,
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: c.hue, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 12, color: "#fff" }}>
                      {c.en}
                    </div>
                    {!c.confirmed && (
                      <div style={{ position: "absolute", bottom: -2, right: -2, background: "#FF9500", borderRadius: "50%", width: 10, height: 10, border: "2px solid #0A0F1F" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>{c.uni}</span>
                      <span style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: C.muted }}>{c.time}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.confirmed ? c.last : "🔒 マッチング成立後に開放"}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={mobileView === "list" ? "chat-hidden-mobile" : ""} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!active ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: C.muted }}>
              <div style={{ fontSize: 44 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.dim }}>まだチャットはありません</div>
              <div style={{ fontSize: 13, textAlign: "center", lineHeight: 1.8, color: C.muted, maxWidth: 300 }}>
                マッチングが成立すると<br />チャットルームが開放されます
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                <button
                  className="chat-back-btn"
                  onClick={() => setMobileView("list")}
                  style={{ background: "none", border: "none", color: "#7E92FF", fontSize: 22, cursor: "pointer", padding: "0 4px 0 0", alignItems: "center", flexShrink: 0 }}
                >
                  ‹
                </button>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: active.hue, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 12, color: "#fff", flexShrink: 0 }}>
                  {active.en}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{active.uni}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    {active.confirmed ? (
                      <>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
                        <span style={{ fontSize: 11.5, color: C.muted }}>マッチング成立</span>
                      </>
                    ) : (
                      <>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF9500" }} />
                        <span style={{ fontSize: 11.5, color: "#FF9500" }}>申請中 — マッチング未成立</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Locked state */}
              {!active.confirmed ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: C.muted }}>
                  <div style={{ fontSize: 44 }}>🔒</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.dim }}>チャットはまだ開放されていません</div>
                  <div style={{ fontSize: 13, textAlign: "center", lineHeight: 1.8, color: C.muted, maxWidth: 300 }}>
                    マッチングが成立すると<br />チャットルームが開放されます
                  </div>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: "22px 28px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {active.messages.map((msg) => {
                      const isMe = msg.from === "me";
                      return (
                        <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 3 }}>
                          <div style={{
                            maxWidth: "66%",
                            padding: "11px 15px",
                            fontSize: 14,
                            lineHeight: 1.55,
                            background: isMe ? C.accent : C.bubbleThem,
                            color: C.text,
                            border: isMe ? "none" : `1px solid ${C.border2}`,
                            borderRadius: 18,
                            borderBottomRightRadius: isMe ? 4 : 18,
                            borderBottomLeftRadius: isMe ? 18 : 4,
                            wordBreak: "break-word",
                          }}>
                            {msg.text}
                          </div>
                          <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 9, color: C.labelColor }}>
                            {msg.time}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input bar */}
                  <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${C.border}`, flexShrink: 0, display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "#161E33", border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: C.muted, flexShrink: 0, cursor: "pointer" }}>
                      +
                    </div>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      placeholder="メッセージを入力"
                      style={{ flex: 1, background: C.inputBg, border: `1px solid ${C.border2}`, borderRadius: 24, padding: "12px 18px", fontSize: 14, color: C.text, outline: "none" }}
                    />
                    <button
                      onClick={send}
                      disabled={!draft.trim() || sending}
                      className={draft.trim() && !sending ? "send-btn-active" : ""}
                      style={{
                        width: 42, height: 42, borderRadius: "50%",
                        background: draft.trim() && !sending ? C.accent : "#161E33",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 20, flexShrink: 0,
                        cursor: draft.trim() && !sending ? "pointer" : "default",
                        border: "none", fontWeight: 700,
                        transition: "background 0.15s",
                      }}
                    >
                      ›
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
