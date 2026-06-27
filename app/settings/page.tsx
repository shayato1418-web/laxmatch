"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuth } from "@/app/context/AuthContext";

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
  input: "#121829",
  green: "#25D07D",
  red: "#FF5C6C",
} as const;

const LEVEL_OPTIONS = ["入門", "初級", "中級", "上級", "強豪"];
const AREA_OPTIONS = [
  "北海道", "東北", "関東", "東海", "北陸", "近畿", "中国", "四国", "九州・沖縄"
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: "#7A85A6", fontWeight: 600, marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        display: "block", width: "100%",
        background: C.input, border: `1px solid ${C.border2}`, borderRadius: 12,
        padding: "13px 16px", fontSize: 14, color: C.dim, outline: "none",
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, updateProfile, changePassword, logout } = useAuth();

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [level, setLevel] = useState("");
  const [lineId, setLineId] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setArea(user.area || "");
      setLevel(user.level || "");
      setLineId(user.lineId || "");
    }
  }, [user]);

  const handleProfileSave = async () => {
    if (!name.trim()) {
      setProfileMsg({ type: "err", text: "チーム名を入力してください。" });
      return;
    }
    setSaving(true);
    setProfileMsg(null);
    try {
      await updateProfile({ name: name.trim(), area, level, lineId: lineId.trim() });
      setProfileMsg({ type: "ok", text: "プロフィールを保存しました。" });
    } catch {
      setProfileMsg({ type: "err", text: "保存に失敗しました。" });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      setPwMsg({ type: "err", text: "すべての項目を入力してください。" });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "新しいパスワードが一致しません。" });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ type: "err", text: "パスワードは6文字以上にしてください。" });
      return;
    }
    setSavingPw(true);
    setPwMsg(null);
    try {
      await changePassword(currentPw, newPw);
      setPwMsg({ type: "ok", text: "パスワードを変更しました。" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwMsg({ type: "err", text: err instanceof Error ? err.message : "変更に失敗しました。" });
    } finally {
      setSavingPw(false);
    }
  };

  if (isLoading || !user) return null;

  const isManager = user.role === "manager";

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      {/* Chrome bar */}
      <div className="chrome-bar" style={{ position: "fixed", top: 0, left: 0, right: 0, height: 42, background: C.header, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 10, zIndex: 50 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {["#FF5F57","#FEBC2E","#28C840"].map((co) => (
            <div key={co} style={{ width: 11, height: 11, borderRadius: "50%", background: co }} />
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ minWidth: 360, background: "#161E33", border: `1px solid ${C.border2}`, borderRadius: 8, padding: "6px 16px", fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: C.muted, textAlign: "center" }}>
            laxmatch.jp/settings
          </div>
        </div>
        <div style={{ width: 54 }} />
      </div>

      <div className="app-body" style={{ display: "flex", flex: 1, paddingTop: 42, overflow: "hidden" }}>
        <Sidebar active="/settings" />

        <main className="app-scroll" style={{ flex: 1, overflowY: "auto", padding: "36px 48px" }}>
          <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, letterSpacing: 3, color: C.accent, fontWeight: 700 }}>SETTINGS</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 8, marginBottom: 32 }}>設定</div>

          {/* Profile section */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "28px 32px", marginBottom: 24, maxWidth: 600 }}>
            <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
              プロフィール
            </div>

            <Field label="チーム名 / 大学名">
              <TextInput value={name} onChange={setName} placeholder="例：千葉大学ラクロス部" />
            </Field>

            <Field label="地域">
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                style={{
                  display: "block", width: "100%",
                  background: C.input, border: `1px solid ${C.border2}`, borderRadius: 12,
                  padding: "13px 16px", fontSize: 14, color: area ? C.dim : "#7A85A6", outline: "none",
                  appearance: "none",
                }}
              >
                <option value="">選択してください</option>
                {AREA_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>

            <Field label="レベル">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {LEVEL_OPTIONS.map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setLevel(lv)}
                    style={{
                      padding: "9px 18px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      border: `1px solid ${level === lv ? C.accent : C.border2}`,
                      background: level === lv ? "rgba(77,91,255,0.15)" : "transparent",
                      color: level === lv ? C.accent : C.muted,
                      cursor: "pointer",
                    }}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="LINE ID">
              <TextInput value={lineId} onChange={setLineId} placeholder="例：@chiba_lacrosse" />
            </Field>

            {profileMsg && (
              <div style={{
                padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13,
                background: profileMsg.type === "ok" ? "rgba(37,208,125,0.1)" : "rgba(255,92,108,0.1)",
                border: `1px solid ${profileMsg.type === "ok" ? "rgba(37,208,125,0.3)" : "rgba(255,92,108,0.3)"}`,
                color: profileMsg.type === "ok" ? C.green : C.red,
              }}>
                {profileMsg.text}
              </div>
            )}

            <button
              onClick={handleProfileSave}
              disabled={saving}
              style={{
                background: C.accent, color: "#fff", padding: "13px 28px",
                borderRadius: 12, fontWeight: 800, fontSize: 14,
                border: "none", cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                boxShadow: "0 8px 24px rgba(77,91,255,0.3)",
              }}
            >
              {saving ? "保存中…" : "変更を保存"}
            </button>
          </div>

          {/* Password section — hidden for admin (no localStorage password) */}
          {!isManager && (
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "28px 32px", maxWidth: 600 }}>
              <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                パスワード変更
              </div>

              <Field label="現在のパスワード">
                <TextInput value={currentPw} onChange={setCurrentPw} placeholder="••••••••" />
              </Field>

              <Field label="新しいパスワード">
                <TextInput value={newPw} onChange={setNewPw} placeholder="6文字以上" />
              </Field>

              <Field label="新しいパスワード（確認）">
                <TextInput value={confirmPw} onChange={setConfirmPw} placeholder="もう一度入力" />
              </Field>

              {pwMsg && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13,
                  background: pwMsg.type === "ok" ? "rgba(37,208,125,0.1)" : "rgba(255,92,108,0.1)",
                  border: `1px solid ${pwMsg.type === "ok" ? "rgba(37,208,125,0.3)" : "rgba(255,92,108,0.3)"}`,
                  color: pwMsg.type === "ok" ? C.green : C.red,
                }}>
                  {pwMsg.text}
                </div>
              )}

              <button
                onClick={handlePasswordChange}
                disabled={savingPw}
                style={{
                  background: "transparent", color: C.text, padding: "13px 28px",
                  borderRadius: 12, fontWeight: 800, fontSize: 14,
                  border: `1px solid ${C.border2}`, cursor: savingPw ? "not-allowed" : "pointer",
                  opacity: savingPw ? 0.7 : 1,
                }}
              >
                {savingPw ? "変更中…" : "パスワードを変更"}
              </button>
            </div>
          )}

          {/* Logout */}
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "20px 32px", maxWidth: 600, marginTop: 24 }}>
            <button
              onClick={async () => { await logout(); router.replace("/login"); }}
              style={{
                background: "transparent", color: "#FF5C6C", padding: "13px 28px",
                borderRadius: 12, fontWeight: 800, fontSize: 14,
                border: "1px solid rgba(255,92,108,0.3)", cursor: "pointer", width: "100%",
              }}
            >
              ログアウト
            </button>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
