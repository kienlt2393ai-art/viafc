"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Modal, { FormField, inputClass, selectClass } from "@/components/Modal";
import {
  formatCurrency,
  calcFieldSplit,
  resultLabel,
  resultBadge,
  getCurrentYearMonth,
  FIELD_COST_PER_MONTH,
} from "@/lib/utils";
import { Plus, Trash2, DollarSign } from "lucide-react";
import type { Match, MatchResult } from "@/lib/types";

type FormData = {
  match_date: string;
  opponent: string;
  result: MatchResult;
  field_cost: number;
  notes: string;
};

export default function MatchesPage() {
  const { year, month } = getCurrentYearMonth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormData>({
    match_date: new Date().toISOString().split("T")[0],
    opponent: "",
    result: "win",
    field_cost: FIELD_COST_PER_MONTH,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [selMonth, setSelMonth] = useState(month);
  const [selYear, setSelYear] = useState(year);

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

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // Tính preview khi form thay đổi
  const preview = calcFieldSplit(form.result, form.field_cost);

  function openAdd() {
    setForm({
      match_date: new Date().toISOString().split("T")[0],
      opponent: "",
      result: "win",
      field_cost: FIELD_COST_PER_MONTH,
      notes: "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.opponent.trim()) return;
    setSaving(true);
    const split = calcFieldSplit(form.result, form.field_cost);
    const matchDate = new Date(form.match_date);
    await supabase.from("matches").insert({
      match_date: form.match_date,
      opponent: form.opponent,
      result: form.result,
      field_cost: form.field_cost,
      via_percentage: split.viaPercentage,
      opponent_percentage: split.opponentPercentage,
      via_amount: split.viaAmount,
      opponent_amount: split.opponentAmount,
      notes: form.notes,
      year: matchDate.getFullYear(),
      month: matchDate.getMonth() + 1,
    });
    setSaving(false);
    setModalOpen(false);
    loadMatches();
  }

  async function deleteMatch(id: string) {
    if (!confirm("Xóa trận đấu này?")) return;
    await supabase.from("matches").delete().eq("id", id);
    loadMatches();
  }

  async function toggleOpponentPaid(m: Match) {
    await supabase
      .from("matches")
      .update({
        opponent_paid: !m.opponent_paid,
        opponent_paid_at: !m.opponent_paid ? new Date().toISOString() : null,
      })
      .eq("id", m.id);
    loadMatches();
  }

  // Summary
  const totalVia = matches.reduce((s, m) => s + m.via_amount, 0);
  const totalOpponent = matches.reduce((s, m) => s + m.opponent_amount, 0);
  const opponentPaid = matches
    .filter((m) => m.opponent_paid)
    .reduce((s, m) => s + m.opponent_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trận đấu</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {matches.length} trận trong tháng {selMonth}/{selYear}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 transition-colors"
        >
          <Plus size={16} />
          Thêm trận
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-2">
        <select
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={selMonth}
          onChange={(e) => setSelMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              Tháng {m}
            </option>
          ))}
        </select>
        <select
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={selYear}
          onChange={(e) => setSelYear(Number(e.target.value))}
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      {matches.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Vỉa chịu (sân)",
              value: formatCurrency(totalVia),
              color: "text-red-400",
            },
            {
              label: "Đối thủ chịu (sân)",
              value: formatCurrency(totalOpponent),
              color: "text-blue-400",
            },
            {
              label: "Đối thủ đã trả",
              value: formatCurrency(opponentPaid),
              color: "text-green-400",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center"
            >
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">
            Đang tải...
          </div>
        ) : matches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có trận nào tháng này.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Ngày</th>
                <th className="text-left px-4 py-3 font-medium">Đối thủ</th>
                <th className="text-left px-4 py-3 font-medium">KQ</th>
                <th className="text-right px-4 py-3 font-medium">Vỉa chịu</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">
                  Đối thủ chịu
                </th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                  Đối thủ trả
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 text-gray-300">
                    {new Date(m.match_date).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {m.opponent}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${resultBadge(m.result)}`}>
                      {resultLabel(m.result)} ({m.via_percentage}%–{m.opponent_percentage}%)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-red-400 font-medium">
                    {formatCurrency(m.via_amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-400 font-medium hidden md:table-cell">
                    {formatCurrency(m.opponent_amount)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <button
                      onClick={() => toggleOpponentPaid(m)}
                      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${
                        m.opponent_paid
                          ? "bg-green-900/40 text-green-300 hover:bg-green-900/60"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}
                    >
                      <DollarSign size={12} />
                      {m.opponent_paid ? "Đã trả" : "Chưa trả"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteMatch(m.id)}
                      className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal thêm trận */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Thêm trận đấu"
      >
        <div className="space-y-4">
          <FormField label="Ngày thi đấu" required>
            <input
              className={inputClass}
              type="date"
              value={form.match_date}
              onChange={(e) => setForm({ ...form, match_date: e.target.value })}
            />
          </FormField>
          <FormField label="Đối thủ" required>
            <input
              className={inputClass}
              placeholder="Tên đội đối thủ"
              value={form.opponent}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })}
            />
          </FormField>
          <FormField label="Kết quả" required>
            <select
              className={selectClass}
              value={form.result}
              onChange={(e) =>
                setForm({ ...form, result: e.target.value as MatchResult })
              }
            >
              <option value="win">Thắng</option>
              <option value="lose">Thua</option>
              <option value="draw">Hòa</option>
            </select>
          </FormField>
          <FormField label="Tiền sân">
            <input
              className={inputClass}
              type="number"
              value={form.field_cost}
              onChange={(e) =>
                setForm({ ...form, field_cost: Number(e.target.value) })
              }
            />
          </FormField>

          {/* Preview phân chia */}
          <div className="bg-gray-800 rounded-lg p-3 text-sm">
            <p className="text-gray-400 text-xs mb-2 font-medium uppercase tracking-wide">
              Phân chia tiền sân
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-gray-500 text-xs">Vỉa FC chịu ({preview.viaPercentage}%)</p>
                <p className="text-red-400 font-semibold">
                  {formatCurrency(preview.viaAmount)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">
                  Đối thủ chịu ({preview.opponentPercentage}%)
                </p>
                <p className="text-blue-400 font-semibold">
                  {formatCurrency(preview.opponentAmount)}
                </p>
              </div>
            </div>
          </div>

          <FormField label="Ghi chú">
            <textarea
              className={inputClass + " resize-none"}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ghi chú thêm..."
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.opponent.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              {saving ? "Đang lưu..." : "Lưu trận"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
