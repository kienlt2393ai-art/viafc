import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { verifyTingeeWebhook, matchTransactionToMember, type TingeeWebhookPayload } from "@/lib/tingee";
import { getCurrentYearMonth, CONTRIBUTION_PER_MEMBER } from "@/lib/utils";

/**
 * POST /api/tingee/webhook
 *
 * Tingee gửi POST request khi có giao dịch mới.
 * Cấu hình trong Tingee: Avatar → Developers → Webhook URL:
 * https://via-fc.vercel.app/api/tingee/webhook
 *
 * Tingee retry 5 lần (cách 5 phút) nếu response không phải code "00" hoặc "02"
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";
  const timestamp = req.headers.get("x-request-timestamp") ?? "";

  if (!verifyTingeeWebhook(rawBody, timestamp, signature)) {
    return NextResponse.json({ code: "09", message: "Invalid signature" }, { status: 401 });
  }

  let payload: TingeeWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ code: "01", message: "Invalid JSON" }, { status: 400 });
  }

  // Bỏ qua giao dịch nhỏ hơn mức đóng tiền
  if (payload.amount < CONTRIBUTION_PER_MEMBER) {
    return NextResponse.json({ code: "00", message: "Success" });
  }

  const supabase = createServerClient();

  // Tránh duplicate theo transactionCode
  const { data: existing } = await supabase
    .from("tingee_transactions")
    .select("id")
    .eq("tingee_id", payload.transactionCode)
    .single();

  if (existing) {
    return NextResponse.json({ code: "02", message: "Already processed" });
  }

  // Lấy danh sách thành viên chưa đóng tiền tháng này
  const { year, month } = getCurrentYearMonth();
  const { data: unpaidContributions } = await supabase
    .from("monthly_contributions")
    .select("*, member:members(name)")
    .eq("year", year)
    .eq("month", month)
    .eq("paid", false);

  // Tự động match tên từ nội dung chuyển khoản
  const memberNames = unpaidContributions?.map((c: any) => c.member?.name ?? "") ?? [];
  const matchedName = matchTransactionToMember(payload.content ?? "", memberNames);

  let matchedContributionId: string | null = null;
  let status: "matched" | "pending" = "pending";

  if (matchedName && unpaidContributions) {
    const matched = unpaidContributions.find((c: any) => c.member?.name === matchedName);
    if (matched) {
      matchedContributionId = matched.id;
      status = "matched";

      await supabase
        .from("monthly_contributions")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          tingee_ref: payload.transactionCode,
        })
        .eq("id", matched.id);
    }
  }

  await supabase.from("tingee_transactions").insert({
    tingee_id: payload.transactionCode,
    amount: payload.amount,
    description: payload.content,
    transaction_at: payload.transactionDate
      ? new Date(
          payload.transactionDate.replace(
            /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,
            "$1-$2-$3T$4:$5:$6"
          )
        ).toISOString()
      : new Date().toISOString(),
    matched_contribution_id: matchedContributionId,
    status,
    raw_data: payload as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ code: "00", message: "Success" });
}
