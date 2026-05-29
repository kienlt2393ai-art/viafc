import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  fetchTingeeTransactions,
  matchTransactionToMember,
} from "@/lib/tingee";
import { getCurrentYearMonth, CONTRIBUTION_PER_MEMBER } from "@/lib/utils";

/**
 * POST /api/tingee/sync
 *
 * Gọi thủ công để đồng bộ giao dịch từ Tingee về database.
 * Frontend gọi endpoint này khi nhấn nút "Đồng bộ Tingee".
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();

    // Lấy thời điểm giao dịch cuối cùng để chỉ fetch từ đó
    const { data: lastTx } = await supabase
      .from("tingee_transactions")
      .select("transaction_at")
      .order("transaction_at", { ascending: false })
      .limit(1)
      .single();

    const from = lastTx?.transaction_at
      ? new Date(lastTx.transaction_at).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 ngày gần nhất

    // Fetch từ Tingee API
    const tingeeTransactions = await fetchTingeeTransactions(
      from,
      new Date().toISOString()
    );

    // Lọc chỉ giao dịch tiền vào với số tiền >= đóng quỹ
    const credits = tingeeTransactions.filter(
      (t) => t.type === "credit" && t.amount >= CONTRIBUTION_PER_MEMBER
    );

    if (credits.length === 0) {
      return NextResponse.json({ ok: true, count: 0, matched: 0 });
    }

    // Lấy danh sách thành viên chưa đóng tiền tháng này
    const { year, month } = getCurrentYearMonth();
    const { data: unpaidContributions } = await supabase
      .from("monthly_contributions")
      .select("*, member:members(name)")
      .eq("year", year)
      .eq("month", month)
      .eq("paid", false);

    const memberNames =
      unpaidContributions?.map((c: any) => c.member?.name ?? "") ?? [];

    let newCount = 0;
    let matchedCount = 0;

    for (const tx of credits) {
      // Kiểm tra duplicate
      if (tx.id) {
        const { data: existing } = await supabase
          .from("tingee_transactions")
          .select("id")
          .eq("tingee_id", tx.id)
          .single();
        if (existing) continue;
      }

      // Auto-match
      const matchedName = matchTransactionToMember(
        tx.description ?? "",
        memberNames
      );
      let matchedContributionId: string | null = null;
      let status: "matched" | "pending" = "pending";

      if (matchedName && unpaidContributions) {
        const matched = unpaidContributions.find(
          (c: any) => c.member?.name === matchedName && !c.paid
        );
        if (matched) {
          matchedContributionId = matched.id;
          status = "matched";
          matchedCount++;

          // Đánh dấu đã đóng
          await supabase
            .from("monthly_contributions")
            .update({
              paid: true,
              paid_at: new Date().toISOString(),
              tingee_ref: tx.id,
            })
            .eq("id", matched.id);

          // Xóa khỏi danh sách để tránh match lại
          const idx = unpaidContributions.findIndex(
            (c: any) => c.id === matched.id
          );
          if (idx !== -1) unpaidContributions.splice(idx, 1);
        }
      }

      await supabase.from("tingee_transactions").insert({
        tingee_id: tx.id,
        amount: tx.amount,
        description: tx.description,
        transaction_at: tx.transaction_time,
        matched_contribution_id: matchedContributionId,
        status,
        raw_data: tx as unknown as Record<string, unknown>,
      });

      newCount++;
    }

    return NextResponse.json({ ok: true, count: newCount, matched: matchedCount });
  } catch (err: any) {
    console.error("Tingee sync error:", err);
    return NextResponse.json(
      { error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
