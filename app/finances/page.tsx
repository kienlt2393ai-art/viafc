"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Modal, { FormField, inputClass, selectClass } from "@/components/Modal";
import {
  formatCurrency,
  getCurrentYearMonth,
  getMonthLabel,
  CONTRIBUTION_PER_MEMBER,
} from "@/lib/utils";
import { CheckCircle, XCircle, Plus, Trash2 } from "lucide-react";
import type { MonthlyContribution, Member, Expense } from "@/lib/types";

const EXPENSE_CATEGORIES = [
  { value: "field", label: "Tiền sân" },
  { value: "equipment", label: "Dụng cụ" },
  { value: "jersey", label: "Áo đấu" },
  { value: "food", label: "Ăn uống" },
  { value: "award", label: "Thưởng" },
  { value: "other", label: "Khác" },
];

export default function FinancesPage() {
  const { year, month } = getCurrentYearMonth();
  const [selMonth, setSelMonth] = useState(month);
  const [selYear, setSelYear] = useState(year);
  const [contributions, setContributions] = useState<MonthlyContribution[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "other",
    expense_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { year: curYear, month: curMonth } = getCurrentYearMonth();
    const isCurrentMonth = selYear === curYear && selMonth === curMonth;

    const [{ data: activeMembers }, { data: cData }, { data: eData }] = await Promise.all([
      supabase.from("members").select("id, name").eq("is_active", true).order("name"),
      supabase
        .from("monthly_contributions")
        .select("*, member:members(name)")
        .eq("year", selYear)
        .eq("month", selMonth),
      supabase
        .from("expenses")
        .select("*")
        .eq("year", selYear)
        .eq("month", selMonth)
        .order("expense_date", { ascending: false }),
    ]);

    // Tháng hiện tại: hiển thị tất cả thành viên active, kể cả chưa có DB row
    let merged: MonthlyContribution[] = cData ?? [];
    if (isCurrentMonth && activeMembers) {
      const existingIds = new Set((cData ?? []).map((c: any) => c.member_id));
      const virtual: MonthlyContribution[] = activeMembers
        .filter((m: any) => !existingIds.has(m.id))
        .map((m: any) => ({
          id: `virtual-${m.id}`,
          member_id: m.id,
          year: selYear,
          month: selMonth,
          amount: CONTRIBUTION_PER_MEMBER,
          paid: false,
          created_at: "",
          member: { id: m.id, name: m.name, phone: "", join_date: "", is_active: true, created_at: "" },
        }));
      merged = [...(cData ?? []), ...virtual].sort((a, b) =>
        ((a.member as any)?.name ?? "").localeCompare((b.member as any)?.name ?? "", "vi")
      );
    }

    setContributions(merged);
    setExpenses(eData ?? []);
    setLoading(false);
  }, [selYear, selMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function togglePaid(c: MonthlyContribution) {
    if (c.id.startsWith("virtual-")) {
      // Chưa có DB row → tạo mới và đánh dấu đã đóng
      await supabase.from("monthly_contributions").insert({
        member_id: c.member_id,
        year: c.year,
        month: c.month,
        amount: CONTRIBUTION_PER_MEMBER,
        paid: true,
        paid_at: new Date().toISOString(),
      });
    } else {
      await supabase.from("monthly_contributions").update({
        paid: !c.paid,
        paid_at: !c.paid ? new Date().toISOString() : null,
      }).eq("id", c.id);
    }
    loadData();
  }

  async function saveExpense() {
    if (!expenseForm.description || !expenseForm.amount) return;
    setSaving(true);
    await supabase.from("expenses").insert({
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      category: expenseForm.category,
      expense_date: expenseForm.expense_date,
      notes: expenseForm.notes,
      year: selYear,
      month: selMonth,
    });
    setSaving(false);
    setExpenseModalOpen(false);
    loadData();
  }

  async function deleteExpense(id: string) {
    if (!confirm("Xóa khoản chi này?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    loadData();
  }

  // Tính tổng
  const totalPaid = contributions.filter((c) => c.paid).reduce((s, c) => s + c.amount, 0);
  const totalExpected = contributions.length * CONTRIBUTION_PER_MEMBER;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalPaid - totalExpenses;
  const paidCount = contributions.filter((c) => c.paid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Thu chi</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {getMonthLabel(selYear, selMonth)}
          </p>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-2">
        <select
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={selMonth}
          onChange={(e) => setSelMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>Tháng {m}</option>
          ))}
        </select>
        <select
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
          value={selYear}
          onChange={(e) => setSelYear(Number(e.target.value))}
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Đã thu", value: formatCurrency(totalPaid), color: "text-green-400" },
          { label: "Kỳ vọng thu", value: formatCurrency(totalExpected), color: "text-blue-400" },
          { label: "Tổng chi", value: formatCurrency(totalExpenses), color: "text-red-400" },
          {
            label: "Số dư",
            value: formatCurrency(balance),
            color: balance >= 0 ? "text-green-400" : "text-red-400",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Đóng tiền */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">
              Đóng quỹ ({paidCount}/{contributions.length})
            </h2>
            <span className="text-xs text-gray-500">
              {formatCurrency(CONTRIBUTION_PER_MEMBER)}/người
            </span>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-500 animate-pulse">Đang tải...</div>
          ) : contributions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              Chưa có dữ liệu tháng này.
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {contributions.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePaid(c)}
                      className={`transition-colors ${
                        c.paid ? "text-green-400" : "text-gray-600 hover:text-gray-400"
                      }`}
                      title={c.paid ? "Đánh dấu chưa đóng" : "Đánh dấu đã đóng"}
                    >
                      {c.paid ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    </button>
                    <div>
                      <p className="text-sm text-gray-200 font-medium">
                        {(c.member as any)?.name ?? "—"}
                      </p>
                      {c.tingee_ref && (
                        <p className="text-xs text-green-500">
                          Tingee: {c.tingee_ref}
                        </p>
                      )}
                      {c.paid_at && (
                        <p className="text-xs text-gray-500">
                          {new Date(c.paid_at).toLocaleDateString("vi-VN")}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${c.paid ? "text-green-400" : "text-gray-500"}`}>
                    {formatCurrency(c.amount || CONTRIBUTION_PER_MEMBER)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chi tiêu */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Chi tiêu</h2>
            <button
              onClick={() => {
                setExpenseForm({
                  description: "",
                  amount: "",
                  category: "other",
                  expense_date: new Date().toISOString().split("T")[0],
                  notes: "",
                });
                setExpenseModalOpen(true);
              }}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-700/40 text-green-300 hover:bg-green-700/60 transition-colors"
            >
              <Plus size={12} />
              Thêm
            </button>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-500 animate-pulse">Đang tải...</div>
          ) : expenses.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              Chưa có khoản chi nào.
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-gray-200 font-medium">{e.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(e.expense_date).toLocaleDateString("vi-VN")} ·{" "}
                      {EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-red-400">
                      -{formatCurrency(e.amount)}
                    </span>
                    <button
                      onClick={() => deleteExpense(e.id)}
                      className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {expenses.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-800 flex justify-between items-center">
              <span className="text-sm text-gray-400">Tổng chi</span>
              <span className="text-sm font-bold text-red-400">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal thêm chi tiêu */}
      <Modal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title="Thêm khoản chi"
      >
        <div className="space-y-4">
          <FormField label="Mô tả" required>
            <input
              className={inputClass}
              placeholder="Tiền sân tháng 5..."
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
            />
          </FormField>
          <FormField label="Số tiền (VND)" required>
            <input
              className={inputClass}
              type="number"
              placeholder="6950000"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
            />
          </FormField>
          <FormField label="Danh mục">
            <select
              className={selectClass}
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Ngày">
            <input
              className={inputClass}
              type="date"
              value={expenseForm.expense_date}
              onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setExpenseModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={saveExpense}
              disabled={saving || !expenseForm.description || !expenseForm.amount}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
