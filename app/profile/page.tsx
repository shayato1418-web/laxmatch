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
  green: "#25D07D",
  yellow: "#F7B731",
} as const;

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isPublic, setIsPublic] = useState(false);
  const [loadingPub, setLoadingPub] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("is_public")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setIsPublic(data?.is_public ?? false);
        setLoadingPub(false);
      });
  }, [user?.id, supabase]);

  if (isLoading || !user) return null;

  const items = [
    { en: "TEAM NAME",  jp: "チーム名",       value: user.name   || "—" },
    { en: "REGION",     jp: "地域",           value: user.area   || "—" },
    { en: "LEVEL",      jp: "レベル",          value: user.level  || "—" },
    { en: "GENDER",     jp: "性別",           value: user.gender || "—" },
    { en: "LINE ID",    jp: "LINE ID",        value: user.lineId || "—" },
    { en: "NOTES",      jp: "備考・コメント",   value: user.notes  || "—" },
  ];

  const initials = (user.name || "?").replace(/[ぁ-ん]+|[ァ-ン]+/g, "").slice(0, 2).toUpperCase() || "??";

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
              <Link
                href="/settings"
                style={{ background: C.accent, color: "#fff", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}
              >
                編集する
              </Link>
            </div>

            {/* Avatar + public/private badge */}
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "22px 24px", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <div style={{ width: 68, height: 68, borderRadius: 17, background: "linear-gradient(135deg,#4D5BFF,#A67CFF)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 20, color: "#fff", flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{user.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                    {!loadingPub && (
                      <span style={{
                        fontFamily: "'Roboto Mono', monospace", fontSize: 11, fontWeight: 700,
                        color: isPublic ? C.green : C.yellow,
                        border: `1px solid ${isPublic ? C.green : C.yellow}`,
                        borderRadius: 6, padding: "3px 9px",
                      }}>
                        {isPublic ? "● 公開中" : "○ 非公開"}
                      </span>
                    )}
                    <Link href="/availability" style={{ fontSize: 12, color: C.muted, textDecoration: "none" }}>
                      空き日程を編集 ›
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile fields */}
            <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
              {items.map(({ en, jp, value }, i) => (
                <div key={en} style={{ display: "flex", alignItems: "flex-start", padding: "15px 24px", borderBottom: i < items.length - 1 ? `1px solid #141B2E` : "none" }}>
                  <div style={{ width: 140, flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: C.accent, fontWeight: 600 }}>{en}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{jp}</div>
                  </div>
                  <div style={{ fontSize: 14, color: C.dim, fontWeight: 600, paddingTop: 2, wordBreak: "break-all" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
