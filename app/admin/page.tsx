"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useAuth, ADMIN_EMAILS } from "@/app/context/AuthContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0F1F",
  sb: "#0B1120",
  accent: "#4D5BFF",
  text: "#EAF0FF",
  muted: "#8A94B2",
  dim: "#C7D0EA",
  border: "#1A2138",
  b2: "#232C45",
  card: "#111728",
  cardB: "#1F2740",
  green: "#25D07D",
  red: "#FF5C6C",
  yellow: "#FEBC2E",
  orange: "#FF9500",
  label: "#5A647F",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type UserRole = "university" | "individual" | "manager";
type UserStatus = "active" | "suspended" | "flagged";
type MatchStatus = "confirmed" | "negotiating" | "cancelled";
type ReportTab = "all" | "unresolved" | "resolved";
type MatchTab = MatchStatus | "all";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  area: string;
  registeredAt: string;
  lastLogin: string;
  status: UserStatus;
  flagged: boolean;
}

interface Match {
  id: string;
  teamA: string;
  teamB: string;
  date: string;
  venue: string;
  status: MatchStatus;
  createdAt: string;
}

interface ChatMsg { from: string; text: string; time: string; deleted?: boolean }
interface ChatRoom {
  id: string;
  teamA: string;
  teamB: string;
  lastMsg: string;
  lastMsgTime: string;
  msgCount: number;
  flagged: boolean;
  messages: ChatMsg[];
}

interface Notification {
  id: string;
  target: "all" | string;
  targetName: string;
  message: string;
  sentAt: string;
}

interface Report {
  id: string;
  reporter: string;
  reported: string;
  reason: string;
  detail: string;
  createdAt: string;
  resolved: boolean;
}


// ─── Helper functions ─────────────────────────────────────────────────────────
function roleLbl(r: UserRole) {
  return r === "university" ? "大学" : r === "individual" ? "個人/クラブ" : "管理人";
}
function statusColor(s: UserStatus) {
  return s === "active" ? C.green : s === "suspended" ? C.red : C.yellow;
}
function matchStatusLbl(s: MatchStatus) {
  return s === "confirmed" ? "成立" : s === "negotiating" ? "交渉中" : "キャンセル";
}
function matchStatusColor(s: MatchStatus) {
  return s === "confirmed" ? C.green : s === "negotiating" ? C.accent : C.red;
}
function exportCSV(users: AdminUser[]) {
  const hdr = ["名前", "メール", "種別", "地域", "登録日", "ステータス"];
  const rows = users.map((u) => [u.name, u.email, u.role, u.area, u.registeredAt, u.status]);
  const csv = [hdr, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "laxmatch_users.csv";
  a.click();
  URL.revokeObjectURL(url);
}
function nowStr() {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", background: color + "22", color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, border: `1px solid ${color}44` }}>
      {label}
    </span>
  );
}

function Btn({ label, color, onClick, small, disabled }: { label: string; color?: string; onClick?: () => void; small?: boolean; disabled?: boolean }) {
  const col = color || C.accent;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#141B2E" : col + "22",
        color: disabled ? C.muted : col,
        border: `1px solid ${disabled ? C.border : col + "44"}`,
        borderRadius: 8,
        padding: small ? "4px 10px" : "9px 18px",
        fontSize: small ? 11 : 13,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, padding: "18px 22px" }}>
      <div style={{ fontSize: 10, color: C.muted, fontFamily: "'Roboto Mono', monospace", letterSpacing: 1.5, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 900, marginTop: 8, color: color || C.text }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 110, padding: "0 4px" }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: "'Roboto Mono', monospace" }}>{d.value}</div>
          <div style={{ width: "100%", height: Math.max((d.value / max) * 80, 4), background: color, borderRadius: "3px 3px 0 0", minHeight: 4 }} />
          <div style={{ fontSize: 9, color: C.muted, fontFamily: "'Roboto Mono', monospace" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function Table({ headers, children, minWidth }: { headers: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: minWidth || 0 }}>
        <thead>
          <tr style={{ background: "#0D1322" }}>
            {headers.map((h) => (
              <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: C.muted, fontWeight: 700, textAlign: "left", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" as const }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td style={{ padding: "11px 16px", fontSize: mono ? 11.5 : 13, fontFamily: mono ? "'Roboto Mono', monospace" : undefined, color: mono ? C.muted : undefined, whiteSpace: mono ? "nowrap" as const : undefined }}>
      {children}
    </td>
  );
}

function TabBar({ tabs, active, setActive }: { tabs: { value: string; label: string; count?: number }[]; active: string; setActive: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => setActive(t.value)}
          style={{
            background: active === t.value ? C.accent : "#161E33",
            color: active === t.value ? "#fff" : C.muted,
            border: `1px solid ${active === t.value ? C.accent : C.b2}`,
            borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          {t.label}
          {t.count !== undefined && (
            <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Section ①: Dashboard ────────────────────────────────────────────────────
function Dashboard({ users, matches }: { users: AdminUser[]; matches: Match[] }) {
  const confirmed = matches.filter((m) => m.status === "confirmed").length;
  const thisWeek = matches.filter((m) => m.createdAt >= "2026/06/23").length;
  return (
    <div>
      <SectionHeader title="ダッシュボード" sub="サービス全体の状況を確認できます" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard label="登録チーム数"     value={users.filter((u) => u.role !== "manager").length} sub="全チーム・個人" color={C.accent} />
        <StatCard label="マッチング成立数" value={confirmed} sub="全期間"      color={C.green}  />
        <StatCard label="今週の募集件数"   value={thisWeek}  sub="6/23〜6/29"  color={C.yellow} />
        <StatCard label="累計利用者数"     value={users.length} sub="全ロール" color={C.dim}    />
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 800 }}>
          直近のマッチング
        </div>
        <Table headers={["チームA", "チームB", "日程", "会場", "ステータス"]} minWidth={560}>
          {matches.slice(0, 5).map((m) => (
            <tr key={m.id} style={{ borderBottom: `1px solid #141B2E` }}>
              <Td>{m.teamA}</Td>
              <Td>{m.teamB}</Td>
              <Td mono>{m.date}</Td>
              <Td mono>{m.venue}</Td>
              <td style={{ padding: "11px 16px" }}><Badge label={matchStatusLbl(m.status)} color={matchStatusColor(m.status)} /></td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}

// ─── Section ②: User Management ──────────────────────────────────────────────
function UserManagement({ users, setUsers }: { users: AdminUser[]; setUsers: Dispatch<SetStateAction<AdminUser[]>> }) {
  const { impersonation, impersonate } = useAuth();
  const [search, setSearch] = useState("");
  const [passwordModalUserId, setPasswordModalUserId] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const openPasswordModal = (id: string) => {
    setPasswordModalUserId(id);
    setPasswordVisible(false);
  };
  const closePasswordModal = () => setPasswordModalUserId(null);
  const passwordModalUser = users.find((u) => u.id === passwordModalUserId) ?? null;

  const setStatus = (id: string, status: UserStatus) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
  const toggleFlag = (id: string) =>
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, flagged: !u.flagged, status: (u.flagged ? "active" : "flagged") as UserStatus } : u));
  const deleteUser = (id: string) => {
    if (!window.confirm("このユーザーを削除しますか？")) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleImpersonate = async (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    if (target.role === "manager") {
      window.alert("管理人アカウントの代理ログインはできません");
      return;
    }
    try {
      await impersonate(target.email, target.password);
      // Navigation handled automatically: onAuthStateChange fires → isAdmin becomes false → useEffect redirects to /
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "代理ログインに失敗しました");
    }
  };

  const filtered = users.filter(
    (u) => !search || u.name.includes(search) || u.email.includes(search) || u.area.includes(search)
  );

  return (
    <div>
      <SectionHeader
        title="ユーザー管理"
        sub={`${users.length}件のアカウント`}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前・メール・地域で検索"
              style={{ background: "#121829", border: `1px solid ${C.b2}`, borderRadius: 10, padding: "8px 14px", fontSize: 13, color: C.dim, outline: "none", width: 220 }}
            />
            <button
              onClick={() => exportCSV(users)}
              style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              CSV出力
            </button>
          </div>
        }
      />
      <div style={{ background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr style={{ background: "#0D1322" }}>
              {["チーム名", "種別", "地域", "メールアドレス", "パスワード", "登録日", "最終ログイン", "ステータス", "操作"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", fontSize: 11, color: C.muted, fontWeight: 700, textAlign: "left", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: `1px solid #141B2E`, background: u.flagged ? "rgba(255,188,46,0.04)" : "transparent" }}>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {u.flagged && <span style={{ fontSize: 12 }}>🚩</span>}
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <Badge label={roleLbl(u.role)} color={u.role === "university" ? C.accent : u.role === "individual" ? C.green : C.muted} />
                </td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: C.muted }}>{u.area || "—"}</td>
                <td style={{ padding: "11px 14px", fontSize: 11.5, fontFamily: "'Roboto Mono', monospace", color: C.dim }}>{u.email}</td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontFamily: "'Roboto Mono', monospace", color: C.muted, letterSpacing: 1 }}>
                      {"••••••••"}
                    </span>
                    <button onClick={() => openPasswordModal(u.id)} style={{ fontSize: 10, color: C.accent, background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontWeight: 700 }}>
                      パスワード表示
                    </button>
                  </div>
                </td>
                <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "'Roboto Mono', monospace", color: C.muted, whiteSpace: "nowrap" }}>{u.registeredAt}</td>
                <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "'Roboto Mono', monospace", color: C.muted, whiteSpace: "nowrap" }}>{u.lastLogin}</td>
                <td style={{ padding: "11px 14px" }}>
                  <Badge label={u.status === "active" ? "有効" : u.status === "suspended" ? "停止中" : "フラグ"} color={statusColor(u.status)} />
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {u.status !== "suspended"
                      ? <Btn label="停止" color={C.yellow} onClick={() => setStatus(u.id, "suspended")} small />
                      : <Btn label="再開" color={C.green}  onClick={() => setStatus(u.id, "active")}    small />
                    }
                    <Btn label="代理ログイン" color={C.accent} onClick={() => handleImpersonate(u.id)} small disabled={impersonation !== null || u.role === "manager"} />
                    <Btn label={u.flagged ? "🚩解除" : "🚩"} color={C.orange} onClick={() => toggleFlag(u.id)} small />
                    <Btn label="削除" color={C.red} onClick={() => deleteUser(u.id)} small />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>ユーザーが見つかりません</div>
        )}
      </div>
    </div>
  );
}

// ─── Section ③: Match Management ─────────────────────────────────────────────
function MatchManagement({ matches, setMatches }: { matches: Match[]; setMatches: Dispatch<SetStateAction<Match[]>> }) {
  const [tab, setTab] = useState<MatchTab>("all");

  const filtered = tab === "all" ? matches : matches.filter((m) => m.status === tab);

  const setMatchStatus = (id: string, status: MatchStatus) =>
    setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));

  const tabs = [
    { value: "all",         label: "すべて",    count: matches.length },
    { value: "confirmed",   label: "成立",      count: matches.filter((m) => m.status === "confirmed").length },
    { value: "negotiating", label: "交渉中",    count: matches.filter((m) => m.status === "negotiating").length },
    { value: "cancelled",   label: "キャンセル", count: matches.filter((m) => m.status === "cancelled").length },
  ];

  return (
    <div>
      <SectionHeader title="マッチング管理" sub={`全${matches.length}件`} />
      <TabBar tabs={tabs} active={tab} setActive={(v) => setTab(v as MatchTab)} />
      <Table headers={["チームA", "チームB", "日程", "会場", "ステータス", "作成日", "操作"]} minWidth={700}>
        {filtered.map((m) => (
          <tr key={m.id} style={{ borderBottom: `1px solid #141B2E` }}>
            <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700 }}>{m.teamA}</td>
            <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700 }}>{m.teamB}</td>
            <Td mono>{m.date}</Td>
            <Td mono>{m.venue}</Td>
            <td style={{ padding: "12px 16px" }}><Badge label={matchStatusLbl(m.status)} color={matchStatusColor(m.status)} /></td>
            <Td mono>{m.createdAt}</Td>
            <td style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {m.status === "negotiating" && <Btn label="成立にする" color={C.green} onClick={() => setMatchStatus(m.id, "confirmed")} small />}
                {m.status !== "cancelled"   && <Btn label="キャンセル" color={C.red}   onClick={() => setMatchStatus(m.id, "cancelled")} small />}
                {m.status === "cancelled"   && <Btn label="交渉中に戻す" color={C.orange} onClick={() => setMatchStatus(m.id, "negotiating")} small />}
              </div>
            </td>
          </tr>
        ))}
      </Table>
      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>該当するマッチングがありません</div>
      )}
    </div>
  );
}

// ─── Section ④: Chat Monitor ─────────────────────────────────────────────────
function ChatMonitor({ rooms, setRooms }: { rooms: ChatRoom[]; setRooms: Dispatch<SetStateAction<ChatRoom[]>> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const room = rooms.find((r) => r.id === selectedId);

  const deleteMsg = (roomId: string, idx: number) =>
    setRooms((prev) =>
      prev.map((r) =>
        r.id !== roomId ? r : {
          ...r,
          messages: r.messages.map((m, i) =>
            i !== idx ? m : { ...m, text: "【管理者により削除されました】", deleted: true }
          ),
        }
      )
    );

  return (
    <div>
      <SectionHeader title="チャット監視" sub="全チャットルームを閲覧・管理できます" />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        {/* Room list */}
        <div style={{ background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, overflow: "hidden" }}>
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              style={{
                width: "100%", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4,
                background: selectedId === r.id ? "#161E33" : "transparent",
                borderLeft: selectedId === r.id ? `3px solid ${C.accent}` : "3px solid transparent",
                borderTop: "none", borderRight: "none",
                borderBottom: `1px solid #141B2E`, cursor: "pointer", textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{r.teamA} ↔ {r.teamB}</span>
                {r.flagged && <span style={{ fontSize: 11 }}>🚩</span>}
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.lastMsg}</div>
              <div style={{ fontSize: 10, color: C.label, fontFamily: "'Roboto Mono', monospace" }}>{r.msgCount}件のメッセージ</div>
            </button>
          ))}
        </div>

        {/* Message view */}
        <div style={{ background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 400 }}>
          {!room ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 13, padding: 40 }}>
              ← ルームを選択してください
            </div>
          ) : (
            <>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
                {room.teamA} ↔ {room.teamB}
                {room.flagged && <Badge label="通報あり" color={C.red} />}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: 500 }}>
                {room.messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
                      padding: "10px 14px", borderRadius: 10,
                      background: msg.deleted ? "rgba(255,92,108,0.06)" : "#0D1322",
                      border: `1px solid ${msg.deleted ? "rgba(255,92,108,0.2)" : "#141B2E"}`,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, marginBottom: 4 }}>{msg.from}</div>
                      <div style={{ fontSize: 13, color: msg.deleted ? C.red : C.dim }}>{msg.text}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: C.label, fontFamily: "'Roboto Mono', monospace" }}>{msg.time}</span>
                      {!msg.deleted && <Btn label="削除" color={C.red} onClick={() => deleteMsg(room.id, i)} small />}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section ⑤: Notifications ────────────────────────────────────────────────
function NotificationSender({ users, notifs, setNotifs }: {
  users: AdminUser[];
  notifs: Notification[];
  setNotifs: Dispatch<SetStateAction<Notification[]>>;
}) {
  const [target, setTarget] = useState<string>("all");
  const [message, setMessage] = useState("");

  const send = () => {
    const t = message.trim();
    if (!t) return;
    const targetUser = users.find((u) => u.id === target);
    setNotifs((prev) => [
      {
        id: `n${Date.now()}`,
        target,
        targetName: target === "all" ? "全ユーザー" : (targetUser?.name || "不明"),
        message: t,
        sentAt: nowStr(),
      },
      ...prev,
    ]);
    setMessage("");
  };

  return (
    <div>
      <SectionHeader title="通知送信" sub="全ユーザーまたは特定ユーザーに通知を送信" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Form */}
        <div style={{ background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 18 }}>通知を作成する</div>
          <label style={{ display: "block", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>送信先</div>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              style={{ width: "100%", background: "#0D1322", border: `1px solid ${C.b2}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: C.text, outline: "none" }}
            >
              <option value="all">📣 全ユーザー</option>
              {users.filter((u) => u.role !== "manager").map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "block", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>メッセージ</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="通知内容を入力してください..."
              style={{ width: "100%", background: "#0D1322", border: `1px solid ${C.b2}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: C.text, outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
          </label>
          <button
            onClick={send}
            disabled={!message.trim()}
            style={{
              width: "100%",
              background: message.trim() ? C.accent : "#1A2138",
              color: message.trim() ? "#fff" : C.muted,
              border: "none", borderRadius: 10, padding: 12,
              fontSize: 13, fontWeight: 800, cursor: message.trim() ? "pointer" : "default",
            }}
          >
            送信する
          </button>
        </div>

        {/* History */}
        <div style={{ background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 14, fontWeight: 800 }}>送信履歴</div>
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 13 }}>送信履歴がありません</div>
            ) : (
              notifs.map((n) => (
                <div key={n.id} style={{ padding: "12px 18px", borderBottom: `1px solid #141B2E` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Badge label={n.targetName} color={n.target === "all" ? C.accent : C.green} />
                    <span style={{ fontSize: 10, color: C.label, fontFamily: "'Roboto Mono', monospace" }}>{n.sentAt}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5 }}>{n.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section ⑥: Reports ──────────────────────────────────────────────────────
function ReportManagement({ reports, setReports }: { reports: Report[]; setReports: Dispatch<SetStateAction<Report[]>> }) {
  const [tab, setTab] = useState<ReportTab>("all");

  const filtered =
    tab === "all" ? reports :
    tab === "resolved" ? reports.filter((r) => r.resolved) :
    reports.filter((r) => !r.resolved);

  const resolve = (id: string) => setReports((prev) => prev.map((r) => r.id === id ? { ...r, resolved: true } : r));
  const remove  = (id: string) => setReports((prev) => prev.filter((r) => r.id !== id));

  const tabs = [
    { value: "all",        label: "すべて",   count: reports.length },
    { value: "unresolved", label: "未対応",   count: reports.filter((r) => !r.resolved).length },
    { value: "resolved",   label: "対応済み", count: reports.filter((r) => r.resolved).length },
  ];

  return (
    <div>
      <SectionHeader title="通報管理" sub={`${reports.filter((r) => !r.resolved).length}件の未対応通報`} />
      <TabBar tabs={tabs} active={tab} setActive={(v) => setTab(v as ReportTab)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((r) => (
          <div
            key={r.id}
            style={{
              background: C.card,
              border: `1px solid ${r.resolved ? C.cardB : "rgba(255,92,108,0.3)"}`,
              borderRadius: 14, padding: "16px 20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                  <Badge label={r.reason} color={r.resolved ? C.muted : C.red} />
                  <Badge label={r.resolved ? "対応済み" : "未対応"} color={r.resolved ? C.green : C.red} />
                  <span style={{ fontSize: 10, color: C.label, fontFamily: "'Roboto Mono', monospace", marginLeft: "auto" }}>{r.createdAt}</span>
                </div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: C.muted }}>通報者:</span> <span style={{ fontWeight: 700 }}>{r.reporter}</span>
                  <span style={{ color: C.muted, marginLeft: 16 }}>対象:</span> <span style={{ fontWeight: 700 }}>{r.reported}</span>
                </div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{r.detail}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {!r.resolved && <Btn label="対応済みにする" color={C.green} onClick={() => resolve(r.id)} small />}
                <Btn label="削除" color={C.red} onClick={() => remove(r.id)} small />
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>該当する通報がありません</div>
        )}
      </div>
    </div>
  );
}

// ─── Section ⑦: Statistics ───────────────────────────────────────────────────
function Statistics({ users, matches }: { users: AdminUser[]; matches: Match[] }) {
  const totalMatch = matches.length;
  const successMatch = matches.filter((m) => m.status === "confirmed").length;
  const matchRate = totalMatch > 0 ? Math.round((successMatch / totalMatch) * 100) : 0;

  // 地域別登録数をリアルデータから集計（"未設定"は除外）
  const areaMap = new Map<string, number>();
  users.forEach((u) => {
    const area = u.area && u.area !== "未設定" ? u.area : null;
    if (area) areaMap.set(area, (areaMap.get(area) || 0) + 1);
  });
  const regionalStats = Array.from(areaMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const exportStatsCSV = () => {
    const rows: string[][] = [
      ["=== アカウント統計 ==="],
      ["大学チーム", String(users.filter((u) => u.role === "university").length)],
      ["個人/クラブ", String(users.filter((u) => u.role === "individual").length)],
      ["合計", String(users.length)],
      [],
      ["=== マッチング統計 ==="],
      ["総マッチング数", String(totalMatch)],
      ["成立数", String(successMatch)],
      ["マッチング成立率", `${matchRate}%`],
    ];
    if (regionalStats.length > 0) {
      rows.push([], ["=== 地域別登録数 ==="], ["地域", "登録数"]);
      regionalStats.forEach((d) => rows.push([d.label, String(d.value)]));
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laxmatch_stats.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const emptyChart = (
    <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 13 }}>
      データがありません
    </div>
  );

  return (
    <div>
      <SectionHeader
        title="統計"
        sub="サービス利用状況の分析レポート"
        action={
          <button
            onClick={exportStatsCSV}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            CSVエクスポート
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <StatCard label="総マッチング数"   value={totalMatch}         color={C.accent} />
        <StatCard label="成立数"           value={successMatch}        color={C.green}  />
        <StatCard label="マッチング成立率" value={`${matchRate}%`}    color={C.yellow} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 16 }}>地域別登録数</div>
          {regionalStats.length > 0 ? <BarChart data={regionalStats} color={C.accent} /> : emptyChart}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 16 }}>週別マッチング件数</div>
          {emptyChart}
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 14, padding: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 16 }}>アカウント種別内訳</div>
        {users.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13 }}>データがありません</div>
        ) : (
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "大学チーム",  count: users.filter((u) => u.role === "university").length,  color: C.accent },
              { label: "個人/クラブ", count: users.filter((u) => u.role === "individual").length, color: C.green  },
              { label: "管理人",      count: users.filter((u) => u.role === "manager").length,     color: C.muted  },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                <span style={{ fontSize: 13, color: C.muted }}>{item.label}</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: item.color }}>{item.count}</span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", fontSize: 13, color: C.muted }}>
              合計: <span style={{ fontWeight: 900, color: C.text, fontSize: 18 }}>{users.length}</span> アカウント
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",     label: "ダッシュボード" },
  { id: "users",         label: "ユーザー管理"   },
  { id: "matches",       label: "マッチング管理" },
  { id: "chats",         label: "チャット監視"   },
  { id: "notifications", label: "通知送信"       },
  { id: "reports",       label: "通報管理"       },
  { id: "stats",         label: "統計"           },
] as const;

type SectionId = (typeof NAV)[number]["id"];

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<SectionId>("dashboard");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const isAdmin = (ADMIN_EMAILS as readonly string[]).includes(user?.email || "") || user?.role === "manager";

  useEffect(() => {
    if (!isLoading && !isAdmin) router.replace("/");
  }, [user, isLoading, isAdmin, router]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("users") || "[]") as Array<{
      id: string; email: string; password: string; name: string; role: UserRole;
    }>;
    setUsers(
      stored.map((u) => ({
        id: u.id, name: u.name, email: u.email, password: u.password, role: u.role,
        area: "未設定", registeredAt: new Date().toLocaleDateString("ja-JP"), lastLogin: "—", status: "active" as UserStatus, flagged: false,
      }))
    );
  }, []);

  if (isLoading || !user || !isAdmin) {
    return (
      <div style={{ height: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "'Roboto Mono', monospace", fontSize: 13 }}>
        読み込み中...
      </div>
    );
  }

  const unresolvedCount = reports.filter((r) => !r.resolved).length;

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      {/* Chrome bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 42, background: "#0B1120", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, zIndex: 50 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ minWidth: 360, background: "#161E33", border: `1px solid ${C.b2}`, borderRadius: 8, padding: "6px 16px", fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: C.muted, textAlign: "center" }}>
            laxmatch.jp/admin
          </div>
        </div>
        <div style={{ width: 54 }} />
      </div>

      <div style={{ display: "flex", flex: 1, paddingTop: 42, overflow: "hidden" }}>
        {/* Admin sidebar */}
        <aside style={{ width: 220, minWidth: 220, background: C.sb, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "20px 14px", flexShrink: 0 }}>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: 0.5, padding: "0 8px" }}>
            LAX<span style={{ color: C.accent }}>·</span>MATCH
          </div>
          <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 9, letterSpacing: 2, color: C.muted, padding: "4px 8px 18px", borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
            ADMIN PANEL
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map((item) => {
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  style={{
                    background: isActive ? "#161E33" : "transparent",
                    color: isActive ? "#fff" : C.muted,
                    display: "flex", alignItems: "center", gap: 10,
                    fontSize: 13.5, fontWeight: 700,
                    padding: "11px 12px", borderRadius: 9,
                    border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: isActive ? C.accent : "transparent", flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.id === "reports" && unresolvedCount > 0 && (
                    <span style={{ background: C.red, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px" }}>
                      {unresolvedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div style={{ marginTop: "auto" }}>
            <div style={{ padding: "10px 12px", background: "#111728", borderRadius: 10, border: `1px solid #1F2740`, marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800 }}>管理者</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2, fontFamily: "'Roboto Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              style={{ width: "100%", padding: 10, background: "rgba(255,92,108,0.10)", color: C.red, border: `1px solid rgba(255,92,108,0.2)`, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              ログアウト
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          {section === "dashboard"     && <Dashboard users={users} matches={matches} />}
          {section === "users"         && <UserManagement users={users} setUsers={setUsers} />}
          {section === "matches"       && <MatchManagement matches={matches} setMatches={setMatches} />}
          {section === "chats"         && <ChatMonitor rooms={chatRooms} setRooms={setChatRooms} />}
          {section === "notifications" && <NotificationSender users={users} notifs={notifications} setNotifs={setNotifications} />}
          {section === "reports"       && <ReportManagement reports={reports} setReports={setReports} />}
          {section === "stats"         && <Statistics users={users} matches={matches} />}
        </main>
      </div>
    </div>
  );
}
