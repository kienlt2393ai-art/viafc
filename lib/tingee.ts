/**
 * Tingee API Integration
 *
 * Tingee là ví điện tử / tài khoản ngân hàng số.
 * Tài liệu API: https://docs.tingee.vn (liên hệ Tingee để lấy API docs chính thức)
 *
 * Hỗ trợ 2 cơ chế:
 * 1. Webhook: Tingee push notification về server khi có giao dịch mới
 * 2. Polling: Gọi API Tingee để lấy lịch sử giao dịch
 */

const TINGEE_API_BASE = "https://api.tingee.vn/v1"; // Thay đổi theo docs thực tế
const TINGEE_API_KEY = process.env.TINGEE_API_KEY;
const TINGEE_ACCOUNT_NUMBER = process.env.TINGEE_ACCOUNT_NUMBER;

export interface TingeeTransaction {
  id: string;
  amount: number;
  description: string;
  transaction_time: string;
  type: "credit" | "debit";
  balance_after?: number;
  reference?: string;
}

export interface TingeeWebhookPayload {
  event: "transaction.created" | "transaction.updated";
  data: TingeeTransaction;
  signature?: string;
}

/**
 * Lấy lịch sử giao dịch từ Tingee API (polling)
 * @param from - Từ ngày (ISO string)
 * @param to - Đến ngày (ISO string)
 */
export async function fetchTingeeTransactions(
  from?: string,
  to?: string
): Promise<TingeeTransaction[]> {
  if (!TINGEE_API_KEY) {
    throw new Error("TINGEE_API_KEY chưa được cấu hình");
  }

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (TINGEE_ACCOUNT_NUMBER) params.set("account", TINGEE_ACCOUNT_NUMBER);

  const res = await fetch(
    `${TINGEE_API_BASE}/transactions?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${TINGEE_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Tingee API lỗi ${res.status}: ${error}`);
  }

  const data = await res.json();
  // Chuẩn hóa response - điều chỉnh theo API thực tế của Tingee
  return data.transactions ?? data.data ?? data ?? [];
}

/**
 * Xác thực webhook signature từ Tingee
 */
export function verifyTingeeWebhook(
  payload: string,
  signature: string
): boolean {
  const secret = process.env.TINGEE_WEBHOOK_SECRET;
  if (!secret) return true; // Bỏ qua nếu chưa cấu hình secret

  // HMAC-SHA256 verification
  const crypto = require("crypto");
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return signature === expectedSig || signature === `sha256=${expectedSig}`;
}

/**
 * Tự động match giao dịch Tingee với đóng tiền tháng của thành viên
 * Logic: tìm thành viên có tên gần giống với nội dung giao dịch
 */
export function matchTransactionToMember(
  description: string,
  memberNames: string[]
): string | null {
  if (!description) return null;
  const desc = description.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  for (const name of memberNames) {
    const normalizedName = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

    // Kiểm tra từng từ trong tên
    const nameParts = normalizedName.split(" ");
    const matchCount = nameParts.filter((part) => desc.includes(part)).length;

    if (matchCount >= Math.min(2, nameParts.length)) {
      return name;
    }
  }

  return null;
}
