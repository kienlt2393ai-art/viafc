"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import StatsCard from "@/components/StatsCard";
import {
  formatCurrency,
  getMonthLabel,
  getCurrentYearMonth,
  CONTRIBUTION_PER_MEMBER,
} from "@/lib/utils";
import {
  Wallet,
  Users,
  Trophy,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  XCircle,
  Calendar,
} from "lucide-react";
import type { Match, MonthlyContribution, Member } from "@/lib/types";

export default function Dashboard() {
  const { year, month } = getCurrentYearMonth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<MonthlyContribution[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: mData }, { data: cData }, { data: matchData }] =
      await Promise.all([
        supabase.from("members").select("*").eq("is_active", true),
        supabase
          .from("monthly_contributions")
          .select("*, member:members(name)")
          .eq("year", year)
          .eq("month", month),
        supabase
          .from("matches")
          .select("*")
          .eq("year", year)
          .eq("month", month)
          .order("match_date", { ascending: false }),
      ]);

    setMembers(mData ?? []);
    setContributions(cData ?? []);
    setMatches(matchData ?? []);
    setRecentMatches((matchData ?? []).slice(0, 5));
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tính toán
  const totalContributions = contributions.reduce(
    (s, c) => s + (c.paid ? c.amount : 0),
    0
  );
  const expectedContributions = members.length * CONTRIBUTION_PER_MEMBER;
  const paidCount = contributions.filter((c) => c.paid).length;
  const unpaidCount = members.length - paidCount;
  const totalViaFieldCost = matches.reduce((s, m) => s + m.via_amount, 0);
  const balance = totalContributions - totalViaFieldCost;
  const wins = matches.filter((m) => m.result === "win").length;
  const loses = matches.filter((m) => m.result === "lose").length;
  const draws = matches.filter((m) => m.result === "draw").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tổng quan</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {getMonthLabel(year, month)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg">
          <Calendar size={14} />
          {getMonthLabel(year, month)}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Quỹ tháng này"
          value={formatCurrency(totalContributions)}
          subtitle={`Kỳ vọng: ${formatCurrency(expectedContributions)}`}
          icon={Wallet}
          color="green"
        />
        <StatsCard
          title="Đã đóng / Tổng"
          value={`${paidCount}/${members.length}`}
          subtitle={
            unpaidCount > 0
              ? `Còn ${unpaidCount} chưa đóng`
              : "Tất cả đã đóng"
          }
          icon={Users}
          color={unpaidCount === 0 ? "green" : "yellow"}
        />
        <StatsCard
          title="Chi phí sân tháng này"
          value={formatCurrency(totalViaFieldCost)}
          subtitle={`${matches.length} trận`}
          icon={TrendingDown}
          color="red"
        />
        <StatsCard
          title="Số dư ước tính"
          value={formatCurrency(balance)}
          subtitle={balance >= 0 ? "Còn dư" : "Âm quỹ"}
          icon={balance >= 0 ? TrendingUp : TrendingDown}
          color={balance >= 0 ? "blue" : "red"}
        />
      </div>

      {/* 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tình hình đóng tiền */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={16} className="text-green-400" />
            Tình hình đóng tiền — {getMonthLabel(year, month)}
          </h2>
          {contributions.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Chưa có dữ liệu tháng này.{" "}
              <a href="/members" className="text-green-400 underline">
                Tạo danh sách đóng tiền
              </a>
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {contributions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {c.paid ? (
                      <CheckCircle size={16} className="text-green-400 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-red-400 shrink-0" />
                    )}
                    <span className="text-sm text-gray-200">
                      {(c.member as any)?.name ?? "—"}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      c.paid ? "text-green-400" : "text-gray-500"
                    }`}
                  >
                    {c.paid ? formatCurrency(c.amount) : "Chưa đóng"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trận đấu gần nhất */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-yellow-400" />
            Trận đấu tháng này
          </h2>
          {/* Win/Lose/Draw summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Thắng", value: wins, color: "text-green-400 bg-green-900/30" },
              { label: "Thua", value: loses, color: "text-red-400 bg-red-900/30" },
              { label: "Hòa", value: draws, color: "text-yellow-400 bg-yellow-900/30" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className={`rounded-lg p-3 text-center ${color}`}
              >
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs opacity-75">{label}</p>
              </div>
            ))}
          </div>
          {recentMatches.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Chưa có trận nào.{" "}
              <a href="/matches" className="text-green-400 underline">
                Thêm trận đấu
              </a>
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div>
                    <p className="text-sm text-gray-200">vs {m.opponent}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(m.match_date).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        m.result === "win"
                          ? "bg-green-900/50 text-green-300"
                          : m.result === "lose"
                          ? "bg-red-900/50 text-red-300"
                          : "bg-yellow-900/50 text-yellow-300"
                      }`}
                    >
                      {m.result === "win"
                        ? "Thắng"
                        : m.result === "lose"
                        ? "Thua"
                        : "Hòa"}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Vỉa: {formatCurrency(m.via_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
