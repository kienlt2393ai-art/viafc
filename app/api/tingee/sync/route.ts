import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/tingee/sync
 *
 * Tingee chỉ hỗ trợ webhook (push), không có polling API.
 * Giao dịch được nhận tự động qua /api/tingee/webhook.
 * Endpoint này giữ lại để tương thích frontend.
 */
export async function POST(req: NextRequest) {
  return NextResponse.json({
    ok: true,
    message: "Tingee sử dụng webhook tự động. Giao dịch được cập nhật real-time qua /api/tingee/webhook.",
    count: 0,
    matched: 0,
  });
}
