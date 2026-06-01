import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { matchTransactionToMember } from "@/lib/tingee";
import {
  getCurrentYearMonth,
  CONTRIBUTION_PER_MEMBER,
  OPPONENTS,
  normalizeVietnamese,
} from "@/lib/utils";

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
 * Xử lý lại tất cả giao dịch "pending" — dùng danh sách thành viên active trực tiếp
 */
export async function POST(_req: NextRequest) {
  const supabase = createServerClient();
  const { year, month } = getCurrentYearMonth();

  const { data: pendingTxs, error } = await supabase
    .from("tingee_transactions")
    .select("*")
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pendingTxs || pendingTxs.length === 0) {
    return NextResponse.json({ matched: 0, message: "Không có giao dịch pending" });
  }

  // Lấy danh sách thành viên active
  const { data: activeMembers } = await supabase
    .from("members")
    .select("id, name")
    .eq("is_active", true);

  // Track đã match trong batch này để tránh match 2 tx vào cùng 1 người
  const matchedMemberIds = new Set<string>();

  let matchedCount = 0;
  const results: any[] = [];

  for (const tx of pendingTxs) {
    const content = tx.description ?? "";

    // ── Thử khớp thành viên ──
    const availableNames = (activeMembers ?? [])
      .filter((m: any) => !matchedMemberIds.has(m.id))
      .map((m: any) => m.name);

    const matchedMemberName = matchTransactionToMember(content, availableNames);

    if (matchedMemberName && activeMembers) {
      const member = activeMembers.find((m: any) => m.name === matchedMemberName);
      if (member) {
        const { data: existingContrib } = await supabase
          .from("monthly_contributions")
          .select("id, paid")
          .eq("member_id", member.id)
          .eq("year", year).eq("month", month)
          .maybeSingle();

        let contributionId: string | null = null;

        if (existingContrib && !existingContrib.paid) {
          await supabase.from("monthly_contributions").update({
            paid: true,
            paid_at: tx.transaction_at ?? new Date().toISOString(),
            tingee_ref: tx.tingee_id,
          }).eq("id", existingContrib.id);
          contributionId = existingContrib.id;
        } else if (!existingContrib) {
          const { data: created } = await supabase
            .from("monthly_contributions")
            .insert({
              member_id: member.id, year, month,
              amount: CONTRIBUTION_PER_MEMBER,
              paid: true,
              paid_at: tx.transaction_at ?? new Date().toISOString(),
              tingee_ref: tx.tingee_id,
            })
            .select("id").single();
          contributionId = created?.id ?? null;
        }

        if (contributionId) {
          await supabase.from("tingee_transactions").update({
            status: "matched",
            matched_contribution_id: contributionId,
          }).eq("id", tx.id);

          matchedMemberIds.add(member.id);
          matchedCount++;
          results.push({ tx: tx.tingee_id, matched: `member:${matchedMemberName}` });
          continue;
        }
      }
    }

    // ── Thử khớp tiền sân đối thủ ──
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

  console.log(`[Rematch] total=${pendingTxs.length} matched=${matchedCount}`);
  return NextResponse.json({ total: pendingTxs.length, matched: matchedCount, results });
}
