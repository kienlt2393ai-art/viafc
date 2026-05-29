import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Vỉa FC - Quản lý quỹ",
  description: "Hệ thống quản lý chi tiêu đội bóng Vỉa FC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-gray-950 p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
