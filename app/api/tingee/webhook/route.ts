import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  verifyTingeeWebhook,
  matchTransactionToMember,
  type TingeeWebhookPayload,
} from "@/lib/tingee";
import { getCurrentYearMonth, CONTRIBUTION_PER_MEMBER } from "@/lib/utils";

/**
 * POST /api/tingee/webhook
 *
 * Tingee gửi POST request đến đây mỗi khi có giao dịch mới.
 * Cấu hình webhook URL trong Tingee dashboard:
 * https://your-app.vercel.app/api/tingee/webhook
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-tingee-signature") ??
    req.headers.get("x-signature") ??
    "";

  // Xác thực signature
  if (!verifyTingeeWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: TingeeWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Chỉ xử lý giao dịch tiền vào
  if (payload.event !== "transaction.created") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const tx = payload.data;
  if (tx.type !== "credit" || tx.amount < CONTRIBUTION_PER_MEMBER) {
    return NextResponse.json({ ok: true, skipped: "not credit or too small" });
  }

  const supabase = createServerClient();

  // Tránh duplicate
  const { data: existing } = await supabase
    .from("tingee_transactions")
    .select("id")
    .eq("tingee_id", tx.id)
    .single();

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Lấy danh sách thành viên chưa đóng tiền tháng này
  const { year, month } = getCurrentYearMonth();
  const { data: unpaidContributions } = await supabase
    .from("monthly_contributions")
    .select("*, member:members(name)")
    .eq("year", year)
    .eq("month", month)
    .eq("paid", false);

  // Tự động match tên từ nội dung giao dịch
  const memberNames =
    unpaidContributions?.map((c: any) => c.member?.name ?? "") ?? [];
  const matchedName = matchTransactionToMember(
    tx.description ?? "",
    memberNames
  );

  let matchedContributionId: string | null = null;
  let status: "matched" | "pending" = "pending";

  if (matchedName && unpaidContributions) {
    const matched = unpaidContributions.find(
      (c: any) => c.member?.name === matchedName
    );
    if (matched) {
      matchedContributionId = matched.id;
      status = "matched";

      // Đánh dấu đã đóng tiền
      await supabase
        .from("monthly_contributions")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          tingee_ref: tx.id,
        })
        .eq("id", matched.id);
    }
  }

  // Lưu giao dịch
  await supabase.from("tingee_transactions").insert({
    tingee_id: tx.id,
    amount: tx.amount,
    description: tx.description,
    transaction_at: tx.transaction_time,
    matched_contribution_id: matchedContributionId,
    status,
    raw_data: tx as unknown as Record<string, unknown>,
  });

  return NextResponse.json({
    ok: true,
    matched: status === "matched",
    matchedName,
  });
}
