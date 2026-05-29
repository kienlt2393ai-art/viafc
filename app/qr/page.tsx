"use client";

import { useState } from "react";
import { X, Maximize2, Copy, Check, Download } from "lucide-react";

const QR_CODES = [
  { id: 1, label: "Thành viên",  src: "/qr/member.png" },
  { id: 2, label: "Kim Sơn",     src: "/qr/Kim Son.png" },
  { id: 3, label: "Nông Tiến",   src: "/qr/nong tien.png" },
  { id: 4, label: "Thái An",     src: "/qr/Thai an.png" },
];

export default function QRPage() {
  const [fullscreen, setFullscreen] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const selected = QR_CODES.find((q) => q.id === fullscreen);

  async function copyImage(src: string, id: number) {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
    } catch {
      // fallback: copy absolute URL
      await navigator.clipboard.writeText(window.location.origin + src);
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadImage(src: string, label: string) {
    const a = document.createElement("a");
    a.href = src;
    a.download = `${label}.png`;
    a.click();
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">QR Chuyển khoản</h1>
        <p className="text-gray-400 text-xs mt-0.5">
          Nhấn để xem to · Copy hoặc tải ảnh để chia sẻ
        </p>
      </div>

      {/* QR Grid */}
      <div className="grid grid-cols-2 gap-3">
        {QR_CODES.map((qr) => (
          <div
            key={qr.id}
            className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
          >
            {/* QR image area */}
            <div
              className="relative bg-white cursor-pointer group"
              style={{ aspectRatio: "1/1" }}
              onClick={() => setFullscreen(qr.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.src}
                alt={qr.label}
                className="w-full h-full object-contain p-2"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <Maximize2
                  size={24}
                  className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </div>

            {/* Label + actions */}
            <div className="px-3 py-2.5 space-y-2">
              <p className="text-sm font-semibold text-white truncate">
                {qr.label}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => copyImage(qr.src, qr.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  {copied === qr.id ? (
                    <Check size={12} className="text-green-400" />
                  ) : (
                    <Copy size={12} />
                  )}
                  {copied === qr.id ? "Đã copy" : "Copy"}
                </button>
                <button
                  onClick={() => downloadImage(qr.src, qr.label)}
                  className="flex items-center justify-center p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  <Download size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setFullscreen(null)}
        >
          <div
            className="relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* QR big */}
            <div className="bg-white rounded-2xl p-5 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.src}
                alt={selected.label}
                className="w-full"
              />
            </div>

            {/* Label + actions */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-white font-bold text-lg">
                {selected.label}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => copyImage(selected.src, selected.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                  {copied === selected.id ? (
                    <Check size={15} className="text-green-600" />
                  ) : (
                    <Copy size={15} />
                  )}
                  {copied === selected.id ? "Đã copy!" : "Copy QR"}
                </button>
                <button
                  onClick={() => downloadImage(selected.src, selected.label)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={() => setFullscreen(null)}
                  className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <p className="text-gray-600 text-xs text-center mt-3">
              Chạm ra ngoài để đóng
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
