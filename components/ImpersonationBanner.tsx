"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ImpersonationBanner() {
  const { user, impersonation, returnToAdmin } = useAuth();
  const router = useRouter();
  const [returning, setReturning] = useState(false);

  if (!impersonation) return null;

  const handleReturn = async () => {
    setReturning(true);
    try {
      await returnToAdmin();
      router.push("/admin");
    } catch {
      // Session restore failed — just redirect to login
      router.push("/login");
    } finally {
      setReturning(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      height: 42,
      zIndex: 300,
      background: "linear-gradient(90deg, #7B3A00, #A04B00)",
      borderBottom: "1px solid #D88A1E",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      boxShadow: "0 2px 12px rgba(208,136,30,0.3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#FFF6E1", fontWeight: 700, fontSize: 13 }}>
        <span>⚠️</span>
        <span>代理ログイン中：</span>
        <span style={{ color: "#FFD87A", fontFamily: "'Roboto Mono', monospace" }}>{user?.name}</span>
        <span style={{ fontSize: 11, color: "#D4B88A", fontWeight: 400 }}>
          （管理者: {impersonation.adminUser.name}）
        </span>
      </div>
      <button
        onClick={handleReturn}
        disabled={returning}
        style={{
          background: returning ? "#5A2000" : "#FF5C6C",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "6px 16px",
          fontSize: 12,
          fontWeight: 800,
          cursor: returning ? "wait" : "pointer",
          opacity: returning ? 0.7 : 1,
          transition: "background 0.15s",
        }}
      >
        {returning ? "復元中…" : "管理人に戻る"}
      </button>
    </div>
  );
}
