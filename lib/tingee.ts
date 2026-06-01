import crypto from "crypto";

// https://open-api.tingee.vn (live) | https://uat-open-api.tingee.vn (test)
const TINGEE_API_BASE = "https://open-api.tingee.vn/v1";
const TINGEE_CLIENT_ID = process.env.TINGEE_CLIENT_ID;
const TINGEE_SECRET = process.env.TINGEE_SECRET;

// Payload Tingee gửi về webhook (flat JSON, không phải nested)
export interface TingeeWebhookPayload {
  clientId: string;
  transactionCode: string;
  amount: number;
  content: string;           // nội dung chuyển khoản
  bank: string;
  accountNumber: string;
  vaAccountNumber: string;
  transactionDate: string;   // format: yyyyMMddHHmmss
  additionalData?: object[];
}

// Tạo headers xác thực cho Tingee API (HMAC SHA512)
function buildTingeeHeaders(body: string): Record<string, string> {
  if (!TINGEE_CLIENT_ID || !TINGEE_SECRET) {
    throw new Error("TINGEE_CLIENT_ID hoặc TINGEE_SECRET chưa được cấu hình");
  }
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 17); // yyyyMMddHHmmssSSS
  const signature = crypto
    .createHmac("sha512", TINGEE_SECRET)
    .update(`${timestamp}:${body}`)
    .digest("hex");
  return {
    "Content-Type": "application/json",
    "x-client-id": TINGEE_CLIENT_ID,
    "x-request-timestamp": timestamp,
    "x-signature": signature,
  };
}

/**
 * Xác thực webhook signature từ Tingee (HMAC SHA512)
 * Tingee gửi: x-signature = HMAC_SHA512("{timestamp}:{body}", secret)
 */
export function verifyTingeeWebhook(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  const secret = process.env.TINGEE_SECRET;
  if (!secret) return true; // bỏ qua nếu chưa cấu hình

  const expected = crypto
    .createHmac("sha512", secret)
    .update(`${timestamp}:${body}`)
    .digest("hex");

  return signature === expected;
}

/**
 * Tự động match giao dịch Tingee với đóng tiền tháng của thành viên
 */
function stripDiacritics(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function matchTransactionToMember(
  content: string,
  memberNames: string[]
): string | null {
  if (!content) return null;
  const normalized = stripDiacritics(content);

  for (const name of memberNames) {
    const normalizedName = stripDiacritics(name);
    const nameParts = normalizedName.split(" ").filter(Boolean);
    const matchCount = nameParts.filter((part) => normalized.includes(part)).length;

    if (matchCount >= Math.min(2, nameParts.length)) {
      return name;
    }
  }

  return null;
}

