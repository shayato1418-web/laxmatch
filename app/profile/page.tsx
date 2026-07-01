"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  input: "#121829",
  green: "#25D07D",
  yellow: "#F7B731",
  red: "#FF5C6C",
} as const;

const AREA_OPTIONS = ["北海道", "東北", "関東", "東海", "北陸", "近畿", "中国", "四国", "九州・沖縄"];
const LEVEL_OPTIONS = ["入門", "初級", "中級", "上級", "強豪"];
const GENDER_OPTIONS = ["男子", "女子", "男女混合"];

type DbProfile = {
  university_name: string;
  region: string;
  level: string;
  gender: string;
  line_id: string;
  notes: string;
  is_public: boolean;
};

function SelectInput({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ display: "block", width: "100%", background: C.input, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: value ? C.dim : C.muted, outline: "none" }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ display: "block", width: "100%", background: C.input, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.dim, outline: "none" }}
    />
  );
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [dbProfile, setDbProfile] = useState<DbProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);

  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editLineId, setEditLineId] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("university_name, region, level, gender, line_id, notes, is_public")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = data as DbProfile;
          setDbProfile(p);
          setEditName(p.university_name || "");
          setEditArea(p.region || "");
          setEditLevel(p.level || "");
          setEditGender(p.gender || "");
          setEditLineId(p.line_id || "");
          setEditNotes(p.notes || "");
        } else {
          // Fall back to user metadata
          setEditName(user?.name || "");
          setEditArea(user?.area || "");
          setEditLevel(user?.level || "");
          setEditGender(user?.gender || "");
          setEditLineId(user?.lineId || "");
          setEditNotes(user?.notes || "");
        }
        setLoadingProfile(false);
      });
  }, [user?.id, supabase, user?.name, user?.area, user?.level, user?.gender, user?.lineId, user?.notes]);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!user?.id || saving) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        university_name: editName.trim(),
        region: editArea,
        level: editLevel,
        gender: editGender,
        line_id: editLineId.trim(),
        notes: editNotes.trim(),
        is_public: dbProfile?.is_public ?? false,
      },
      { onConflict: "user_id" }
    );
    setSaving(false);
    if (error) {
      showToast("err", `保存に失敗しました: ${error.message}`);
    } else {
      setDbProfile((prev) =>
        prev
          ? { ...prev, university_name: editName.trim(), region: editArea, level: editLevel, gender: editGender, line_id: editLineId.trim(), notes: editNotes.trim() }
          : { university_name: editName.trim(), region: editArea, level: editLevel, gender: editGender, line_id: editLineId.trim(), notes: editNotes.trim(), is_public: false }
      );
      setEditing(false);
      showToast("ok", "プロフィールを更新しました");
    }
  };

  const handleTogglePublic = async () => {
    if (!user?.id || toggling) return;
    setToggling(true);
    const newVal = !(dbProfile?.is_public ?? false);
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, is_public: newVal }, { onConflict: "user_id" });
    setToggling(false);
    if (!error) {
      setDbProfile((prev) => (prev ? { ...prev, is_public: newVal } : null));
      showToast("ok", newVal ? "プロフィールを公開しました" : "プロフィールを非公開にしました");
    } else {
      showToast("err", "更新に失敗しました");
    }
  };

  if (isLoading || !user) return null;

  const name = dbProfile?.university_name || user.name || "—";
  const isPublic = dbProfile?.is_public ?? false;
  const initials = name.replace(/[ぁ-ん]+|[ァ-ン]+/g, "").slice(0, 2).toUpperCase() || "??";

  const viewItems = [
    { en: "TEAM NAME",  jp: "チーム名",      value: dbProfile?.university_name || user.name || "—" },
    { en: "REGION",     jp: "地域",          value: dbProfile?.region           || user.area || "—" },
    { en: "LEVEL",      jp: "レベル",         value: dbProfile?.level            || user.level || "—" },
    { en: "GENDER",     jp: "性別",          value: dbProfile?.gender           || user.gender || "—" },
    { en: "LINE ID",    jp: "LINE ID",       value: dbProfile?.line_id          || user.lineId || "—" },
    { en: "NOTES",      jp: "備考・コメント",  value: dbProfile?.notes            || user.notes || "—" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", background: C.bg, overflow: "hidden" }}>
      <div className="app-body" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar active="/profile" />
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          <div style={{ maxWidth: 640 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 2, color: C.accent, fontWeight: 700 }}>MY PROFILE</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 3 }}>マイプロフィール</div>
              </div>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  style={{ background: C.accent, color: "#fff", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}
                >
                  編集する
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setEditing(false)}
                    style={{ background: "transparent", color: C.muted, padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, border: `1px solid ${C.border2}`, cursor: "pointer" }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => { void handleSave(); }}
                    disabled={saving}
                    style={{ background: C.accent, color: "#fff", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, border: "none", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "保存中…" : "保存する"}
                  </button>
                </div>
              )}
            </div>

            {/* Avatar + public status */}
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "22px 24px", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <div style={{ width: 68, height: 68, borderRadius: 17, background: "linear-gradient(135deg,#4D5BFF,#A67CFF)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                    {!loadingProfile && (
                      <span style={{
                        fontFamily: "'Roboto Mono', monospace", fontSize: 11, fontWeight: 700,
                        color: isPublic ? C.green : C.yellow,
                        border: `1px solid ${isPublic ? C.green : C.yellow}`,
                        borderRadius: 6, padding: "3px 9px",
                      }}>
                        {isPublic ? "● 公開中" : "○ 非公開"}
                      </span>
                    )}
                  </div>
                </div>
                {/* Public/private toggle */}
                {!loadingProfile && (
                  <button
                    onClick={() => { void handleTogglePublic(); }}
                    disabled={toggling}
                    style={{
                      background: isPublic ? "rgba(255,92,108,0.12)" : "rgba(37,208,125,0.12)",
                      color: isPublic ? C.red : C.green,
                      border: `1px solid ${isPublic ? "rgba(255,92,108,0.3)" : "rgba(37,208,125,0.3)"}`,
                      borderRadius: 10, padding: "9px 16px",
                      fontWeight: 700, fontSize: 12,
                      cursor: toggling ? "wait" : "pointer",
                      opacity: toggling ? 0.6 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {toggling ? "更新中…" : isPublic ? "非公開にする" : "公開する"}
                  </button>
                )}
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid #141B2E`, display: "flex", gap: 12 }}>
                <Link href="/availability" style={{ fontSize: 12, color: C.accent, textDecoration: "none", fontWeight: 600 }}>空き日程を編集 ›</Link>
                <Link href="/settings" style={{ fontSize: 12, color: C.muted, textDecoration: "none" }}>アカウント設定 ›</Link>
              </div>
            </div>

            {/* Profile fields / edit form */}
            {!editing ? (
              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
                {viewItems.map(({ en, jp, value }, i) => (
                  <div key={en} style={{ display: "flex", alignItems: "flex-start", padding: "15px 24px", borderBottom: i < viewItems.length - 1 ? `1px solid #141B2E` : "none" }}>
                    <div style={{ width: 140, flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: C.accent, fontWeight: 600 }}>{en}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{jp}</div>
                    </div>
                    <div style={{ fontSize: 14, color: C.dim, fontWeight: 600, paddingTop: 2, wordBreak: "break-all" }}>{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: C.accent, fontWeight: 600, marginBottom: 8 }}>TEAM NAME / チーム名</div>
                  <TextInput value={editName} onChange={setEditName} placeholder="大学・チーム名" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: C.accent, fontWeight: 600, marginBottom: 8 }}>REGION / 地域</div>
                  <SelectInput value={editArea} onChange={setEditArea} options={AREA_OPTIONS} placeholder="選択してください" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: C.accent, fontWeight: 600, marginBottom: 8 }}>LEVEL / レベル</div>
                  <SelectInput value={editLevel} onChange={setEditLevel} options={LEVEL_OPTIONS} placeholder="選択してください" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: C.accent, fontWeight: 600, marginBottom: 8 }}>GENDER / 性別</div>
                  <SelectInput value={editGender} onChange={setEditGender} options={GENDER_OPTIONS} placeholder="選択してください" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: C.accent, fontWeight: 600, marginBottom: 8 }}>LINE ID</div>
                  <TextInput value={editLineId} onChange={setEditLineId} placeholder="LINE IDを入力" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: C.accent, fontWeight: 600, marginBottom: 8 }}>NOTES / 備考・コメント</div>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="自由記述（特徴・活動頻度など）"
                    rows={3}
                    style={{ display: "block", width: "100%", background: C.input, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.dim, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            )}
          </div>
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
