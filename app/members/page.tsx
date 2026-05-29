"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Modal, { FormField, inputClass } from "@/components/Modal";
import {
  formatCurrency,
  formatDate,
  getCurrentYearMonth,
  CONTRIBUTION_PER_MEMBER,
} from "@/lib/utils";
import { Plus, Pencil, UserX, UserCheck, RefreshCw } from "lucide-react";
import type { Member } from "@/lib/types";

type FormData = {
  name: string;
  phone: string;
  join_date: string;
};

export default function MembersPage() {
  const { year, month } = getCurrentYearMonth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    join_date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const query = supabase.from("members").select("*").order("name");
    if (!showInactive) query.eq("is_active", true);
    const { data } = await query;
    setMembers(data ?? []);
    setLoading(false);
  }, [showInactive]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  function openAdd() {
    setEditingMember(null);
    setForm({
      name: "",
      phone: "",
      join_date: new Date().toISOString().split("T")[0],
    });
    setModalOpen(true);
  }

  function openEdit(m: Member) {
    setEditingMember(m);
    setForm({
      name: m.name,
      phone: m.phone ?? "",
      join_date: m.join_date,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editingMember) {
      await supabase
        .from("members")
        .update({ name: form.name, phone: form.phone, join_date: form.join_date })
        .eq("id", editingMember.id);
    } else {
      const { data: newMember } = await supabase
        .from("members")
        .insert({ name: form.name, phone: form.phone, join_date: form.join_date })
        .select()
        .single();

      // Tự động tạo contribution tháng hiện tại
      if (newMember) {
        await supabase.from("monthly_contributions").upsert({
          member_id: newMember.id,
          year,
          month,
          amount: CONTRIBUTION_PER_MEMBER,
          paid: false,
        });
      }
    }
    setSaving(false);
    setModalOpen(false);
    loadMembers();
  }

  async function toggleActive(m: Member) {
    await supabase
      .from("members")
      .update({
        is_active: !m.is_active,
        leave_date: m.is_active ? new Date().toISOString().split("T")[0] : null,
      })
      .eq("id", m.id);
    loadMembers();
  }

  /**
   * Tạo danh sách đóng tiền cho tháng hiện tại cho tất cả thành viên active
   */
  async function generateContributions() {
    const active = members.filter((m) => m.is_active);
    if (active.length === 0) return;
    const rows = active.map((m) => ({
      member_id: m.id,
      year,
      month,
      amount: CONTRIBUTION_PER_MEMBER,
      paid: false,
    }));
    await supabase.from("monthly_contributions").upsert(rows, {
      onConflict: "member_id,year,month",
      ignoreDuplicates: true,
    });
    alert(`Đã tạo danh sách đóng tiền tháng ${month}/${year} cho ${active.length} thành viên.`);
  }

  const activeCount = members.filter((m) => m.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Thành viên</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {activeCount} đang hoạt động
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateContributions}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
          >
            <RefreshCw size={14} />
            Tạo danh sách tháng này
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 transition-colors"
          >
            <Plus size={16} />
            Thêm thành viên
          </button>
        </div>
      </div>

      {/* Filter */}
      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="rounded"
        />
        Hiện thành viên không còn thi đấu
      </label>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">
            Đang tải...
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Chưa có thành viên nào.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Tên</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                  Số điện thoại
                </th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                  Ngày vào
                </th>
                <th className="text-left px-4 py-3 font-medium">
                  Đóng tháng/tháng
                </th>
                <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className={`border-b border-gray-800 last:border-0 ${
                    !m.is_active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-white">{m.name}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                    {m.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                    {formatDate(m.join_date)}
                  </td>
                  <td className="px-4 py-3 text-green-400 font-medium">
                    {formatCurrency(CONTRIBUTION_PER_MEMBER)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.is_active
                          ? "bg-green-900/40 text-green-300"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {m.is_active ? "Hoạt động" : "Nghỉ"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                        title="Sửa"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => toggleActive(m)}
                        className={`p-1.5 rounded transition-colors ${
                          m.is_active
                            ? "text-gray-400 hover:text-red-400 hover:bg-red-900/30"
                            : "text-gray-400 hover:text-green-400 hover:bg-green-900/30"
                        }`}
                        title={m.is_active ? "Cho nghỉ" : "Kích hoạt lại"}
                      >
                        {m.is_active ? (
                          <UserX size={14} />
                        ) : (
                          <UserCheck size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMember ? "Sửa thành viên" : "Thêm thành viên mới"}
      >
        <div className="space-y-4">
          <FormField label="Tên" required>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nguyễn Văn A"
            />
          </FormField>
          <FormField label="Số điện thoại">
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0901234567"
              type="tel"
            />
          </FormField>
          <FormField label="Ngày vào" required>
            <input
              className={inputClass}
              value={form.join_date}
              onChange={(e) => setForm({ ...form, join_date: e.target.value })}
              type="date"
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
              disabled={saving || !form.name.trim()}
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
