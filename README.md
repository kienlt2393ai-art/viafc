# Vỉa FC — Quản lý quỹ đội bóng

Webapp quản lý thu chi, thành viên, trận đấu cho đội bóng Vỉa FC. Tích hợp Tingee để tự động nhận và đối chiếu tiền đóng quỹ.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Payment**: Tingee API

---

## Setup — Từng bước

### 1. Clone & cài dependencies

```bash
git clone https://github.com/your-username/via-fc.git
cd via-fc
npm install
```

### 2. Tạo project Supabase

1. Vào [supabase.com](https://supabase.com) → New project
2. Vào **SQL Editor** → chạy file `supabase/migrations/20240101000000_init.sql`
3. Lấy **Project URL** và **anon key** từ Settings → API

### 3. Cấu hình biến môi trường

Copy `.env.local.example` thành `.env.local`:

```bash
cp .env.local.example .env.local
```

Điền các giá trị:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Từ Supabase Settings > API > service_role

TINGEE_API_KEY=your-key
TINGEE_ACCOUNT_NUMBER=your-account
TINGEE_WEBHOOK_SECRET=your-secret
```

### 4. Chạy local

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

### 5. Deploy lên Vercel

```bash
# Cài Vercel CLI
npm i -g vercel

# Deploy
vercel

# Hoặc kết nối GitHub repo trong Vercel dashboard
```

Thêm biến môi trường trong **Vercel → Settings → Environment Variables** (copy từ `.env.local`).

### 6. Cấu hình Tingee Webhook

Sau khi deploy xong, vào Tingee dashboard → Webhook Settings:

```
URL: https://your-app.vercel.app/api/tingee/webhook
Events: transaction.created
```

---

## Tính năng

| Tính năng | Mô tả |
|---|---|
| **Dashboard** | Tổng quan quỹ tháng, đóng tiền, trận đấu |
| **Thành viên** | Thêm/sửa/bỏ thành viên, tạo danh sách đóng tháng |
| **Trận đấu** | Ghi kết quả, tự động tính tiền sân (40%/60%) |
| **Thu chi** | Theo dõi đóng quỹ, ghi chi tiêu thủ công |
| **Tingee** | Đồng bộ giao dịch, tự động khớp với thành viên |

## Logic tiền sân

- Tiền sân cố định: **6.950.000đ/tháng**
- Đóng quỹ: **300.000đ/thành viên/tháng**
- Thắng → Vỉa chịu **40%**, đối thủ **60%**
- Thua / Hòa → Vỉa chịu **60%**, đối thủ **40%**

## Cấu trúc dự án

```
via-fc/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── members/page.tsx      # Thành viên
│   ├── matches/page.tsx      # Trận đấu
│   ├── finances/page.tsx     # Thu chi
│   ├── tingee/page.tsx       # Tingee transactions
│   └── api/tingee/
│       ├── webhook/route.ts  # Nhận webhook từ Tingee
│       └── sync/route.ts     # Đồng bộ thủ công
├── components/               # UI components
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── tingee.ts             # Tingee API integration
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Helpers, formatters
└── supabase/migrations/      # SQL schema
```
