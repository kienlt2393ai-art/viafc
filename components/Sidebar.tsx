"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Trophy, Wallet, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",         label: "Tổng quan", icon: LayoutDashboard },
  { href: "/members",  label: "Thành viên", icon: Users },
  { href: "/matches",  label: "Trận đấu",  icon: Trophy },
  { href: "/finances", label: "Thu chi",   icon: Wallet },
  { href: "/qr",       label: "QR",        icon: QrCode },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── DESKTOP SIDEBAR (md+) ── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col bg-gray-900 border-r border-gray-800 h-screen sticky top-0">
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-base">
              V
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight">Vỉa FC</h1>
              <p className="text-xs text-gray-500">Quản lý quỹ</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-green-700 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-600 text-center">Vỉa FC © 2025</p>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-900 border-t border-gray-800 safe-area-inset-bottom">
        <div className="grid grid-cols-5 h-14">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-colors",
                  active ? "text-green-400" : "text-gray-500"
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
