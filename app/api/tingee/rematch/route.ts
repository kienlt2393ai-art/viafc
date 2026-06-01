import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { matchTransactionToMember } from "@/lib/tingee";
import { getCurrentYearMonth, OPPONENTS, normalizeVietnamese } from "@/lib/utils";

export const preferredRegion = ["sin1", "sin"];
export const maxDuration = 30;

function matchContentToOpponent(content: string): string | null {
  const norm = normalizeVietnamese(content);
  for (const opp of OPPONENTS) {
    if (norm.includes(normalizeVietnamese(opp))) return opp;
  }
  return null;
}

/**
 * POST /api/tingee/rematch
 * Xử lý lại tất cả giao dịch đang ở trạng thái "pending"
 * Gọi sau khi đã tạo danh sách đóng quỹ tháng hiện tại
 */
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { year, month } = getCurrentYearMonth();

  // Lấy tất cả giao dịch pending
  const { data: pendingTxs, error } = await supabase
    .from("tingee_transactions")
    .select("*")
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pendingTxs || pendingTxs.length === 0) {
    return NextResponse.json({ matched: 0, message: "Không có giao dịch pending" });
  }

  // Lấy danh sách đóng quỹ chưa thanh toán tháng hiện tại
  const { data: unpaid } = await supabase
    .from("monthly_contributions")
    .select("*, member:members(name)")
    .eq("year", year)
    .eq("month", month)
    .eq("paid", false);

  const memberNames = unpaid?.map((c: any) => c.member?.name ?? "") ?? [];

  let matchedCount = 0;
  const results: any[] = [];

  for (const tx of pendingTxs) {
    const content = tx.description ?? "";
    let matched = false;

    // Thử khớp với thành viên
    const matchedMember = matchTransactionToMember(content, memberNames);
    if (matchedMember && unpaid) {
      const c = unpaid.find((c: any) => c.member?.name === matchedMember);
      if (c) {
        await supabase.from("monthly_contributions").update({
          paid: true,
          paid_at: tx.transaction_at ?? new Date().toISOString(),
          tingee_ref: tx.tingee_id,
        }).eq("id", c.id);

        await supabase.from("tingee_transactions").update({
          status: "matched",
          matched_contribution_id: c.id,
        }).eq("id", tx.id);

        // Xoá thành viên đã match ra khỏi danh sách để tránh match 2 lần
        const idx = memberNames.indexOf(matchedMember);
        if (idx !== -1) memberNames.splice(idx, 1);
        if (unpaid) unpaid.splice(unpaid.findIndex((u: any) => u.id === c.id), 1);

        matchedCount++;
        matched = true;
        results.push({ tx: tx.tingee_id, matched: `member:${matchedMember}` });
        continue;
      }
    }

    // Thử khớp với tiền sân đối thủ
    if (!matched) {
      const matchedOpponent = matchContentToOpponent(content);
      if (matchedOpponent) {
        const { data: unpaidMatch } = await supabase
          .from("matches")
          .select("id, opponent")
          .eq("opponent", matchedOpponent)
          .eq("opponent_paid", false)
          .order("match_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (unpaidMatch) {
          await supabase.from("matches").update({
            opponent_paid: true,
            opponent_paid_at: tx.transaction_at ?? new Date().toISOString(),
          }).eq("id", unpaidMatch.id);

          await supabase.from("tingee_transactions").update({
            status: "matched",
            raw_data: { _matched_match_id: unpaidMatch.id },
          }).eq("id", tx.id);

          matchedCount++;
          results.push({ tx: tx.tingee_id, matched: `match:${matchedOpponent}` });
        }
      }
    }
  }

  console.log(`[Rematch] total=${pendingTxs.length} matched=${matchedCount}`);
  return NextResponse.json({
    total: pendingTxs.length,
    matched: matchedCount,
    results,
  });
}
