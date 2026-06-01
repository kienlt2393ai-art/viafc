import { type ClassValue, clsx } from "clsx";
import type { MatchResult } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getMonthLabel(year: number, month: number): string {
  return `Tháng ${month}/${year}`;
}

// Tiền đóng quỹ mỗi thành viên/tháng
export const CONTRIBUTION_PER_MEMBER = 300_000;

// Tiền sân mặc định mỗi trận
export const FIELD_COST_PER_MATCH = 600_000;

// Giữ alias cũ để không break code khác
export const FIELD_COST_PER_MONTH = FIELD_COST_PER_MATCH;

// Danh sách đối thủ cố định
export const OPPONENTS = ["Kim Son", "Nong Tien", "Thai An"];

/**
 * Tính % Vỉa chịu dựa vào kết quả trận đấu
 * Thắng: Vỉa 40% - Đối thủ 60%
 * Hòa:   Vỉa 50% - Đối thủ 50%
 * Thua:  Vỉa 60% - Đối thủ 40%
 */
export function calcFieldSplit(
  result: MatchResult,
  fieldCost: number = FIELD_COST_PER_MATCH
): {
  viaPercentage: number;
  opponentPercentage: number;
  viaAmount: number;
  opponentAmount: number;
} {
  const viaPercentage = result === "win" ? 40 : result === "draw" ? 50 : 60;
  const opponentPercentage = 100 - viaPercentage;
  const viaAmount = Math.round(fieldCost * (viaPercentage / 100));
  const opponentAmount = fieldCost - viaAmount;
  return { viaPercentage, opponentPercentage, viaAmount, opponentAmount };
}

export function resultLabel(result: MatchResult): string {
  return result === "win" ? "Thắng" : result === "lose" ? "Thua" : "Hòa";
}

export function resultColor(result: MatchResult): string {
  return result === "win"
    ? "text-green-400"
    : result === "lose"
    ? "text-red-400"
    : "text-yellow-400";
}

export function resultBadge(result: MatchResult): string {
  return result === "win"
    ? "bg-green-900/50 text-green-300 border border-green-700"
    : result === "lose"
    ? "bg-red-900/50 text-red-300 border border-red-700"
    : "bg-yellow-900/50 text-yellow-300 border border-yellow-700";
}

/** Trả về năm/tháng theo giờ Việt Nam (UTC+7) — dùng cả client lẫn server */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Chuẩn hoá chuỗi tiếng Việt (bỏ dấu, lowercase) để so sánh */
export function normalizeVietnamese(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
