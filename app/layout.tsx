import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Vỉa FC - Quản lý quỹ",
  description: "Hệ thống quản lý chi tiêu đội bóng Vỉa FC",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#030712",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          {/* pb-16 để tránh bị bottom nav che trên mobile */}
          <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
