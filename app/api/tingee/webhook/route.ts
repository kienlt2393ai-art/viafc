import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { verifyTingeeWebhook, matchTransactionToMember } from "@/lib/tingee";
import { getCurrentYearMonth, CONTRIBUTION_PER_MEMBER, OPPONENTS, normalizeVietnamese } from "@/lib/utils";

export const preferredRegion = ["sin1", "sin"];
export const maxDuration = 30;

/** Khớp nội dung CK với tên đối thủ cố định */
function matchContentToOpponent(content: string): string | null {
  const norm = normalizeVietnamese(content);
  for (const opp of OPPONENTS) {
    if (norm.includes(normalizeVietnamese(opp))) return opp;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";
  const timestamp = req.headers.get("x-request-timestamp") ?? "";

  console.log("[Webhook] body:", rawBody.slice(0, 300));

  if (!verifyTingeeWebhook(rawBody, timestamp, signature)) {
    return NextResponse.json({ code: "09", message: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ code: "01", message: "Invalid JSON" }, { status: 400 }); }

  try {
    const transactionCode = payload.transactionCode ?? payload.transaction_id ?? payload.id ?? String(Date.now());
    const amount = Number(payload.amount ?? 0);
    const content = payload.content ?? payload.description ?? "";
    const transactionDate = payload.transactionDate ?? null;

    const txAt = transactionDate
      ? new Date(transactionDate.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3T$4:$5:$6")).toISOString()
      : new Date().toISOString();

    // Bỏ qua giao dịch quá nhỏ (< 10k) — tránh spam test
    if (amount < 10_000) {
      return NextResponse.json({ code: "00", message: "Success" });
    }

    const supabase = createServerClient();

    // Tránh duplicate
    const { data: existing } = await supabase
      .from("tingee_transactions").select("id").eq("tingee_id", transactionCode).maybeSingle();
    if (existing) return NextResponse.json({ code: "02", message: "Already processed" });

    let matchedContributionId: string | null = null;
    let matchedMatchId: string | null = null;
    let status: "matched" | "pending" = "pending";
    let matchInfo = "none";

    const { year, month } = getCurrentYearMonth();

    // ── 1. Thử khớp với đóng quỹ thành viên ──
    const { data: unpaid } = await supabase
      .from("monthly_contributions")
      .select("*, member:members(name)")
      .eq("year", year).eq("month", month).eq("paid", false);

    const memberNames = unpaid?.map((c: any) => c.member?.name ?? "") ?? [];
    const matchedMember = matchTransactionToMember(content, memberNames);

    if (matchedMember && unpaid) {
      const c = unpaid.find((c: any) => c.member?.name === matchedMember);
      if (c) {
        matchedContributionId = c.id;
        status = "matched";
        matchInfo = `member:${matchedMember}`;
        await supabase.from("monthly_contributions").update({
          paid: true, paid_at: new Date().toISOString(), tingee_ref: transactionCode,
        }).eq("id", c.id);
      }
    }

    // ── 2. Thử khớp với tiền sân đối thủ (nếu chưa khớp với thành viên) ──
    if (!matchedContributionId) {
      const matchedOpponent = matchContentToOpponent(content);
      if (matchedOpponent) {
        const { data: unpaidMatch } = await supabase
          .from("matches")
          .select("id, opponent, opponent_amount")
          .eq("opponent", matchedOpponent)
          .eq("opponent_paid", false)
          .order("match_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (unpaidMatch) {
          matchedMatchId = unpaidMatch.id;
          status = "matched";
          matchInfo = `match:${matchedOpponent}`;
          await supabase.from("matches").update({
            opponent_paid: true, opponent_paid_at: new Date().toISOString(),
          }).eq("id", unpaidMatch.id);
        }
      }
    }

    // Lưu giao dịch
    await supabase.from("tingee_transactions").insert({
      tingee_id: transactionCode,
      amount,
      description: content,
      transaction_at: txAt,
      matched_contribution_id: matchedContributionId,
      status,
      raw_data: { ...payload, _matched_match_id: matchedMatchId },
    });

    console.log(`[Webhook] OK tx=${transactionCode} matched=${matchInfo}`);
    return NextResponse.json({ code: "00", message: "Success" });

  } catch (err: any) {
    console.error("[Webhook] Error:", err?.message);
    return NextResponse.json({ code: "99", message: "Internal error" }, { status: 500 });
  }
}
