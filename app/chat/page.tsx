"use client";

import { useEffect, useRef, useState } from "react";
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
  listBg: "#0D131F",
  inputBg: "#121829",
  bubbleThem: "#161E33",
  labelColor: "#5A647F",
  green: "#25D07D",
} as const;

type Msg = { from: "me" | "them"; text: string; time: string };

type Conv = {
  en: string;
  hue: string;
  uni: string;
  last: string;
  time: string;
  unread?: string;
  confirmed: boolean;
  messages: Msg[];
};

const INIT_CONVS: Conv[] = [
  {
    en: "KEIO", hue: "#4D5BFF", uni: "慶應義塾大学", time: "13:09", confirmed: true,
    last: "了解です！当日よろしくお願いします。",
    messages: [
      { from: "them", text: "慶應ラクロス部です。6/29の練習試合、ぜひお願いします。", time: "13:02" },
      { from: "me",   text: "ありがとうございます！こちらこそお願いします。",         time: "13:05" },
      { from: "them", text: "会場は日吉グラウンドで大丈夫ですか？全面で取れています。", time: "13:06" },
      { from: "me",   text: "助かります。13時開始で調整します。",                     time: "13:08" },
      { from: "them", text: "了解です！当日よろしくお願いします。",                   time: "13:09" },
    ],
  },
  {
    en: "CHUO", hue: "#3D8BFF", uni: "中央大学", time: "昨日", unread: "2", confirmed: false,
    last: "申請中です。確定までしばらくお待ちください。",
    messages: [],
  },
  {
    en: "WU", hue: "#6E5BFF", uni: "早稲田大学", time: "昨日", confirmed: false,
    last: "候補日ありがとうございます！",
    messages: [],
  },
  {
    en: "RU", hue: "#3FB6FF", uni: "立教大学", time: "6/18", confirmed: true,
    last: "またぜひお願いします。",
    messages: [
      { from: "them", text: "先日はありがとうございました。またぜひお願いします。", time: "10:30" },
      { from: "me",   text: "こちらこそ、ありがとうございました！",               time: "11:02" },
    ],
  },
];

export default function ChatPage() {
  const [convs, setConvs] = useState<Conv[]>(INIT_CONVS);
  const [activeIdx, setActiveIdx] = useState(0);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const active = convs[activeIdx];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active.messages]);

  const send = () => {
    const t = draft.trim();
    if (!t || !active.confirmed) return;
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setConvs((prev) =>
      prev.map((c, i) =>
        i === activeIdx
          ? { ...c, messages: [...c.messages, { from: "me", text: t, time: timeStr }], last: t, time: timeStr }
          : c
      )
    );
    setDraft("");
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      {/* Chrome bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 42, background: C.header, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, zIndex: 50 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {["#FF5F57","#FEBC2E","#28C840"].map((co) => (
            <div key={co} style={{ width: 11, height: 11, borderRadius: "50%", background: co }} />
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ minWidth: 360, background: "#161E33", border: `1px solid ${C.border2}`, borderRadius: 8, padding: "6px 16px", fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: C.muted, textAlign: "center" }}>
            laxmatch.jp/chat
          </div>
        </div>
        <div style={{ width: 54 }} />
      </div>

      <div style={{ display: "flex", flex: 1, paddingTop: 42, overflow: "hidden" }}>
        <Sidebar active="/chat" />

        {/* Conversation list */}
        <div style={{ width: 300, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>メッセージ</div>
            <div style={{ marginTop: 12, background: C.inputBg, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "9px 13px", fontSize: 12.5, color: "#7A85A6" }}>
              検索
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {convs.map((c, i) => (
              <button
                key={c.uni}
                onClick={() => setActiveIdx(i)}
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
                {c.unread && c.confirmed && (
                  <div style={{ background: C.accent, color: "#fff", fontFamily: "'Roboto Mono', monospace", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 7px", flexShrink: 0 }}>
                    {c.unread}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Chat header */}
          <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
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
              <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px", display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Match confirmed card */}
                <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: "14px 18px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: C.accent, fontWeight: 700 }}>PROPOSED MATCH</div>
                    <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: C.green, fontWeight: 700 }}>調整中</div>
                  </div>
                  <div style={{ display: "flex", gap: 24, marginTop: 12, flexWrap: "wrap" }}>
                    {[
                      { key: "DATE",  val: "6/29 (日) 13:00" },
                      { key: "VENUE", val: "日吉グラウンド" },
                      { key: "形式",  val: "全面" },
                    ].map((item) => (
                      <div key={item.key}>
                        <div style={{ fontSize: 9, color: C.labelColor, fontFamily: "'Roboto Mono', monospace", letterSpacing: 1 }}>{item.key}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{item.val}</div>
                      </div>
                    ))}
                    <div style={{ marginLeft: "auto", alignSelf: "center" }}>
                      <button style={{ background: C.accent, color: "#fff", padding: "9px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer" }}>
                        日程を確定する
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "center", fontFamily: "'Roboto Mono', monospace", fontSize: 10, color: C.labelColor, letterSpacing: 1, margin: "6px 0" }}>
                  2026 / 06 / 22
                </div>

                {active.messages.map((msg, i) => {
                  const isMe = msg.from === "me";
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: 3 }}>
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
                  disabled={!draft.trim()}
                  style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: draft.trim() ? C.accent : "#161E33",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 20, flexShrink: 0, cursor: draft.trim() ? "pointer" : "default",
                    border: "none", fontWeight: 700,
                    transition: "background 0.15s",
                  }}
                >
                  ›
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
