"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { RefreshCw, CheckCircle, AlertCircle, Link2 } from "lucide-react";
import type { TingeeTransaction, MonthlyContribution } from "@/lib/types";

export default function TingeePage() {
  const [transactions, setTransactions] = useState<TingeeTransaction[]>([]);
  const [contributions, setContributions] = useState<MonthlyContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: tData }, { data: cData }] = await Promise.all([
      supabase
        .from("tingee_transactions")
        .select("*")
        .order("transaction_at", { ascending: false })
        .limit(50),
      supabase
        .from("monthly_contributions")
        .select("*, member:members(name)")
        .eq("paid", false),
    ]);
    setTransactions(tData ?? []);
    setContributions(cData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function syncFromTingee() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/tingee/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`Đồng bộ thành công: ${data.count} giao dịch mới, ${data.matched} khớp tự động.`);
        loadData();
      } else {
        setSyncResult(`Lỗi: ${data.error}`);
      }
    } catch (e) {
      setSyncResult("Lỗi kết nối đến server.");
    }
    setSyncing(false);
  }

  async function manualMatch(transactionId: string, contributionId: string) {
    await supabase
      .from("tingee_transactions")
      .update({ matched_contribution_id: contributionId, status: "matched" })
      .eq("id", transactionId);

    await supabase
      .from("monthly_contributions")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        tingee_ref: transactionId,
      })
      .eq("id", contributionId);

    loadData();
  }

  const pendingCount = transactions.filter((t) => t.status === "pending").length;
  const matchedCount = transactions.filter((t) => t.status === "matched").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tingee</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Tự động nhận và đối chiếu giao dịch
          </p>
        </div>
        <button
          onClick={syncFromTingee}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Đang đồng bộ..." : "Đồng bộ Tingee"}
        </button>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div
          className={`rounded-lg p-3 text-sm ${
            syncResult.startsWith("Lỗi")
              ? "bg-red-900/30 border border-red-700 text-red-300"
              : "bg-green-900/30 border border-green-700 text-green-300"
          }`}
        >
          {syncResult}
        </div>
      )}

      {/* Setup notice */}
      {!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("supabase") && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 text-sm text-yellow-300">
          <p className="font-medium mb-1">Cấu hình Tingee</p>
          <p className="text-yellow-400/80">
            Để kết nối Tingee, thêm các biến môi trường vào Vercel:
            <code className="block mt-1 bg-black/30 px-2 py-1 rounded text-xs font-mono">
              TINGEE_API_KEY · TINGEE_ACCOUNT_NUMBER · TINGEE_WEBHOOK_SECRET
            </code>
          </p>
          <p className="mt-2 text-yellow-400/80">
            Webhook URL:{" "}
            <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs font-mono">
              https://your-app.vercel.app/api/tingee/webhook
            </code>
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Tổng giao dịch", value: transactions.length, color: "text-blue-400" },
          { label: "Chờ đối chiếu", value: pendingCount, color: "text-yellow-400" },
          { label: "Đã khớp", value: matchedCount, color: "text-green-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Transactions table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Lịch sử giao dịch</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Đang tải...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Chưa có giao dịch nào. Nhấn "Đồng bộ Tingee" để tải về.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Thời gian</th>
                <th className="text-left px-4 py-3 font-medium">Nội dung</th>
                <th className="text-right px-4 py-3 font-medium">Số tiền</th>
                <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Khớp thủ công</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(t.transaction_at).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-200 max-w-xs truncate">
                    {t.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-400">
                    +{formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    {t.status === "matched" ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle size={12} /> Đã khớp
                      </span>
                    ) : t.status === "unmatched" ? (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <AlertCircle size={12} /> Không khớp
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-yellow-400">
                        <AlertCircle size={12} /> Chờ
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.status === "pending" && contributions.length > 0 && (
                      <select
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white outline-none max-w-[160px]"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) manualMatch(t.id, e.target.value);
                        }}
                      >
                        <option value="">Chọn thành viên...</option>
                        {contributions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {(c.member as any)?.name} (T{c.month}/{c.year})
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
