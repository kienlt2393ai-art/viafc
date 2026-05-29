"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  formatCurrency,
  calcFieldSplit,
  resultLabel,
  resultBadge,
  getCurrentYearMonth,
  FIELD_COST_PER_MATCH,
  OPPONENTS,
} from "@/lib/utils";
import { Plus, Trash2, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import type { Match, MatchResult } from "@/lib/types";

const RESULT_OPTIONS: { value: MatchResult; label: string; color: string; active: string }[] = [
  { value: "win",  label: "Thắng", color: "border-green-700 text-green-400", active: "bg-green-700 text-white border-green-700" },
  { value: "lose", label: "Thua",  color: "border-red-700 text-red-400",   active: "bg-red-700 text-white border-red-700" },
  { value: "draw", label: "Hòa",   color: "border-yellow-700 text-yellow-400", active: "bg-yellow-700 text-white border-yellow-700" },
];

export default function MatchesPage() {
  const { year, month } = getCurrentYearMonth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selMonth, setSelMonth] = useState(month);
  const [selYear, setSelYear] = useState(year);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Quick-add form
  const [selOpponent, setSelOpponent] = useState<string>(OPPONENTS[0]);
  const [customOpponent, setCustomOpponent] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [selResult, setSelResult] = useState<MatchResult>("win");
  const [showForm, setShowForm] = useState(false);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("year", selYear)
      .eq("month", selMonth)
      .order("match_date", { ascending: false });
    setMatches(data ?? []);
    setLoading(false);
  }, [selYear, selMonth]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  const opponentName = isCustom ? customOpponent.trim() : selOpponent;
  const preview = calcFieldSplit(selResult, FIELD_COST_PER_MATCH);

  async function handleQuickAdd() {
    if (!opponentName) return;
    setSaving(true);
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const split = calcFieldSplit(selResult, FIELD_COST_PER_MATCH);

    // Lưu trận đấu
    await supabase.from("matches").insert({
      match_date: dateStr,
      opponent: opponentName,
      result: selResult,
      field_cost: FIELD_COST_PER_MATCH,
      via_percentage: split.viaPercentage,
      opponent_percentage: split.opponentPercentage,
      via_amount: split.viaAmount,
      opponent_amount: split.opponentAmount,
      year: today.getFullYear(),
      month: today.getMonth() + 1,
    });

    // Tự động đẩy tiền sân Vỉa phải chịu vào Thu chi
    await supabase.from("expenses").insert({
      description: `Tiền sân vs ${opponentName}`,
      amount: split.viaAmount,
      category: "field",
      expense_date: dateStr,
      notes: `${resultLabel(selResult)} · Vỉa ${split.viaPercentage}% / ${opponentName} ${split.opponentPercentage}%`,
      year: today.getFullYear(),
      month: today.getMonth() + 1,
    });

    setSaving(false);
    setShowForm(false);
    loadMatches();
  }

  async function deleteMatch(id: string) {
    if (!confirm("Xóa trận đấu này?")) return;
    await supabase.from("matches").delete().eq("id", id);
    loadMatches();
  }

  async function toggleOpponentPaid(m: Match) {
    await supabase.from("matches").update({
      opponent_paid: !m.opponent_paid,
      opponent_paid_at: !m.opponent_paid ? new Date().toISOString() : null,
    }).eq("id", m.id);
    loadMatches();
  }

  const totalVia = matches.reduce((s, m) => s + m.via_amount, 0);
  const totalOpponent = matches.reduce((s, m) => s + m.opponent_amount, 0);
  const opponentUnpaid = matches.filter((m) => !m.opponent_paid).reduce((s, m) => s + m.opponent_amount, 0);
  const wins = matches.filter((m) => m.result === "win").length;
  const loses = matches.filter((m) => m.result === "lose").length;
  const draws = matches.filter((m) => m.result === "draw").length;

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Trận đấu</h1>
          <p className="text-gray-400 text-xs mt-0.5">{matches.length} trận · Tháng {selMonth}/{selYear}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 transition-colors"
        >
          <Plus size={15} />
          Thêm trận
        </button>
      </div>

      {/* Month selector */}
      <div className="flex gap-2">
        <select className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
          value={selMonth} onChange={(e) => setSelMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>Tháng {m}</option>
          ))}
        </select>
        <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
          value={selYear} onChange={(e) => setSelYear(Number(e.target.value))}>
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Quick-add form */}
      {showForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-4">
          <p className="text-sm font-semibold text-white">Thêm trận hôm nay</p>

          {/* Opponent picker */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Đối thủ</p>
            <div className="flex flex-wrap gap-2">
              {OPPONENTS.map((opp) => (
                <button key={opp}
                  onClick={() => { setSelOpponent(opp); setIsCustom(false); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    !isCustom && selOpponent === opp
                      ? "bg-blue-700 text-white border-blue-600"
                      : "border-gray-600 text-gray-300 hover:border-gray-400"
                  }`}
                >
                  {opp}
                </button>
              ))}
              <button
                onClick={() => setIsCustom(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  isCustom ? "bg-blue-700 text-white border-blue-600" : "border-gray-600 text-gray-300 hover:border-gray-400"
                }`}
              >
                Khác...
              </button>
            </div>
            {isCustom && (
              <input
                autoFocus
                className="mt-2 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                placeholder="Nhập tên đội đối thủ"
                value={customOpponent}
                onChange={(e) => setCustomOpponent(e.target.value)}
              />
            )}
          </div>

          {/* Result picker */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Kết quả</p>
            <div className="grid grid-cols-3 gap-2">
              {RESULT_OPTIONS.map((r) => (
                <button key={r.value}
                  onClick={() => setSelResult(r.value)}
                  className={`py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    selResult === r.value ? r.active : `bg-transparent ${r.color}`
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-800 rounded-lg p-3 flex justify-between text-sm">
            <div>
              <p className="text-xs text-gray-500">Vỉa FC chịu</p>
              <p className="font-bold text-red-400">{formatCurrency(preview.viaAmount)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Tiền sân</p>
              <p className="font-bold text-gray-300">{formatCurrency(FIELD_COST_PER_MATCH)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{opponentName || "Đối thủ"} chịu</p>
              <p className="font-bold text-blue-400">{formatCurrency(preview.opponentAmount)}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-lg text-sm text-gray-400 border border-gray-700 hover:bg-gray-800">
              Hủy
            </button>
            <button onClick={handleQuickAdd}
              disabled={saving || !opponentName}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-500 disabled:opacity-50">
              {saving ? "Đang lưu..." : "Lưu trận ⚡"}
            </button>
          </div>
        </div>
      )}

      {/* Summary strip */}
      {matches.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">Thành tích</span>
              <span className="text-xs text-gray-500">{matches.length} trận</span>
            </div>
            <div className="flex gap-3">
              <span className="text-sm font-bold text-green-400">{wins}W</span>
              <span className="text-sm font-bold text-red-400">{loses}L</span>
              <span className="text-sm font-bold text-yellow-400">{draws}D</span>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-3">
            <div className="text-xs text-gray-400 mb-1">Đối thủ còn nợ sân</div>
            <p className={`text-base font-bold ${opponentUnpaid > 0 ? "text-orange-400" : "text-green-400"}`}>
              {formatCurrency(opponentUnpaid)}
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-3">
            <div className="text-xs text-gray-400 mb-1">Vỉa FC chịu (sân)</div>
            <p className="text-base font-bold text-red-400">{formatCurrency(totalVia)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-3">
            <div className="text-xs text-gray-400 mb-1">Đối thủ chịu (sân)</div>
            <p className="text-base font-bold text-blue-400">{formatCurrency(totalOpponent)}</p>
          </div>
        </div>
      )}

      {/* Match cards */}
      {loading ? (
        <div className="py-12 text-center text-gray-500 animate-pulse text-sm">Đang tải...</div>
      ) : matches.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm">
          Chưa có trận nào tháng {selMonth}/{selYear}
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const expanded = expandedId === m.id;
            return (
              <div key={m.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                {/* Main row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : m.id)}
                >
                  {/* Result badge */}
                  <span className={`text-xs px-2 py-1 rounded font-bold shrink-0 ${resultBadge(m.result)}`}>
                    {resultLabel(m.result)}
                  </span>

                  {/* Opponent + date */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">vs {m.opponent}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(m.match_date + "T00:00:00").toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                      {" · "}Vỉa: <span className="text-red-400">{formatCurrency(m.via_amount)}</span>
                    </p>
                  </div>

                  {/* Payment status */}
                  <div className="shrink-0 flex items-center gap-2">
                    {m.opponent_paid ? (
                      <CheckCircle size={18} className="text-green-400" />
                    ) : (
                      <Clock size={18} className="text-orange-400" />
                    )}
                    {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t border-gray-800 px-4 py-3 space-y-3 bg-gray-800/30">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Tiền sân</p>
                        <p className="font-semibold text-gray-200">{formatCurrency(m.field_cost)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tỷ lệ ({m.via_percentage}/{m.opponent_percentage})</p>
                        <p className="font-semibold text-gray-200">Vỉa / {m.opponent}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Vỉa chịu</p>
                        <p className="font-bold text-red-400">{formatCurrency(m.via_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{m.opponent} chịu</p>
                        <p className="font-bold text-blue-400">{formatCurrency(m.opponent_amount)}</p>
                      </div>
                    </div>

                    {/* Opponent payment toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-xs text-gray-400">Tiền sân đối thủ</p>
                        <p className={`text-xs font-medium mt-0.5 ${m.opponent_paid ? "text-green-400" : "text-orange-400"}`}>
                          {m.opponent_paid
                            ? `Đã thanh toán${m.opponent_paid_at ? " · " + new Date(m.opponent_paid_at).toLocaleDateString("vi-VN") : ""}`
                            : `Chưa thanh toán · ${formatCurrency(m.opponent_amount)}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleOpponentPaid(m)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            m.opponent_paid
                              ? "bg-green-900/40 text-green-300 hover:bg-gray-700"
                              : "bg-orange-900/40 text-orange-300 hover:bg-orange-900/60"
                          }`}
                        >
                          {m.opponent_paid ? "✓ Đã trả" : "Đánh dấu đã trả"}
                        </button>
                        <button
                          onClick={() => deleteMatch(m.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
