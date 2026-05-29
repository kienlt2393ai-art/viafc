import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { verifyTingeeWebhook, matchTransactionToMember } from "@/lib/tingee";
import { getCurrentYearMonth, CONTRIBUTION_PER_MEMBER } from "@/lib/utils";

// Chạy gần Supabase Singapore để giảm latency
export const preferredRegion = ["sin1", "sin"];
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";
  const timestamp = req.headers.get("x-request-timestamp") ?? "";

  // Log headers + raw body để debug
  console.log("[Tingee Webhook] Headers:", JSON.stringify({
    "x-signature": signature ? "present" : "missing",
    "x-request-timestamp": timestamp,
    "content-type": req.headers.get("content-type"),
  }));
  console.log("[Tingee Webhook] Raw body:", rawBody.slice(0, 500));

  if (!verifyTingeeWebhook(rawBody, timestamp, signature)) {
    console.error("[Tingee Webhook] Invalid signature");
    return NextResponse.json({ code: "09", message: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error("[Tingee Webhook] JSON parse error:", e);
    return NextResponse.json({ code: "01", message: "Invalid JSON" }, { status: 400 });
  }

  console.log("[Tingee Webhook] Parsed payload:", JSON.stringify(payload));

  try {
    // Lấy transactionCode — hỗ trợ cả 2 format (Tingee Open API và Bytebox IPN)
    const transactionCode =
      payload.transactionCode ??
      payload.transaction_id ??
      payload.order_id ??
      payload.id ??
      String(Date.now());

    const amount = Number(payload.amount ?? payload.value ?? 0);
    const content =
      payload.content ??
      payload.description ??
      payload.order_description ??
      payload.memo ??
      "";

    const transactionDate = payload.transactionDate ?? payload.transaction_date ?? null;

    // Bỏ qua giao dịch nhỏ hơn mức đóng tiền
    if (amount < CONTRIBUTION_PER_MEMBER) {
      console.log(`[Tingee Webhook] Skipping: amount ${amount} < ${CONTRIBUTION_PER_MEMBER}`);
      return NextResponse.json({ code: "00", message: "Success" });
    }

    const supabase = createServerClient();

    // Tránh duplicate
    const { data: existing, error: existErr } = await supabase
      .from("tingee_transactions")
      .select("id")
      .eq("tingee_id", transactionCode)
      .maybeSingle();

    if (existErr) console.error("[Tingee Webhook] Check duplicate error:", existErr.message);
    if (existing) {
      return NextResponse.json({ code: "02", message: "Already processed" });
    }

    // Match với đóng tiền tháng
    const { year, month } = getCurrentYearMonth();
    const { data: unpaidContributions, error: contribErr } = await supabase
      .from("monthly_contributions")
      .select("*, member:members(name)")
      .eq("year", year)
      .eq("month", month)
      .eq("paid", false);

    if (contribErr) console.error("[Tingee Webhook] Fetch contributions error:", contribErr.message);

    const memberNames = unpaidContributions?.map((c: any) => c.member?.name ?? "") ?? [];
    const matchedName = matchTransactionToMember(content, memberNames);

    let matchedContributionId: string | null = null;
    let status: "matched" | "pending" = "pending";

    if (matchedName && unpaidContributions) {
      const matched = unpaidContributions.find((c: any) => c.member?.name === matchedName);
      if (matched) {
        matchedContributionId = matched.id;
        status = "matched";
        const { error: updateErr } = await supabase
          .from("monthly_contributions")
          .update({ paid: true, paid_at: new Date().toISOString(), tingee_ref: transactionCode })
          .eq("id", matched.id);
        if (updateErr) console.error("[Tingee Webhook] Update contribution error:", updateErr.message);
      }
    }

    const { error: insertErr } = await supabase.from("tingee_transactions").insert({
      tingee_id: transactionCode,
      amount,
      description: content,
      transaction_at: transactionDate
        ? new Date(
            transactionDate.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3T$4:$5:$6")
          ).toISOString()
        : new Date().toISOString(),
      matched_contribution_id: matchedContributionId,
      status,
      raw_data: payload,
    });

    if (insertErr) console.error("[Tingee Webhook] Insert error:", insertErr.message);

    console.log(`[Tingee Webhook] Done: txCode=${transactionCode}, matched=${matchedName ?? "none"}`);
    return NextResponse.json({ code: "00", message: "Success" });

  } catch (err: any) {
    console.error("[Tingee Webhook] Unhandled error:", err?.message ?? err);
    return NextResponse.json({ code: "99", message: "Internal error" }, { status: 500 });
  }
}
