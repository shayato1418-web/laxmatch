import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import ImpersonationBanner from "@/components/ImpersonationBanner";

export const metadata: Metadata = {
  title: "LaxMatch - ラクロス練習試合マッチング",
  description: "大学ラクロス部の渉外担当が練習試合相手を簡単に見つけられるマッチングサービス。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Noto+Sans+JP:wght@500;700;900&family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <ChatProvider>
            <ImpersonationBanner />
            {children}
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
