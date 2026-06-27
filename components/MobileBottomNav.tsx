"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "探す",     href: "/explore" },
  { label: "日程",     href: "/availability" },
  { label: "マッチ",   href: "/matches" },
  { label: "チャット", href: "/chat" },
  { label: "設定",     href: "/settings" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-bottom-nav">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link key={tab.href} href={tab.href} className="mobile-tab">
            {active && <div className="mobile-tab-indicator" />}
            <span className="mobile-tab-label" style={{ color: active ? "#7E92FF" : "#5A647F" }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
