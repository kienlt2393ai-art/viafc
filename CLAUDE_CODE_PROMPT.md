# Webapp Quản Lý Quỹ Đội Bóng — Claude Code Prompt

## Mô tả dự án
Tạo một webapp quản lý quỹ đội bóng đơn giản, chạy trên Vercel với database Supabase. App cho phép theo dõi khoản đóng góp, chi tiêu, danh sách thành viên và xem báo cáo tài chính.

---

## Tech Stack
- **Frontend**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Authentication**: Không cần (công khai)

---

## Database Schema

### 1. Table: `members`
```sql
id: uuid (primary key)
name: text (tên thành viên)
role: text (vị trí: cầu thủ, HLV, ban quản lý, ...)
phone: text (optional)
created_at: timestamp
```

### 2. Table: `contributions`
```sql
id: uuid (primary key)
member_id: uuid (FK → members.id)
amount: decimal (số tiền đóng góp)
contribution_date: date
notes: text (optional)
created_at: timestamp
```

### 3. Table: `expenses`
```sql
id: uuid (primary key)
category: text (sân/huấn luyện, trang phục, y tế, khác)
amount: decimal (số tiền chi)
description: text
expense_date: date
paid_by: uuid (FK → members.id, optional)
created_at: timestamp
```

---

## Tính năng chính

### 1. Trang chủ (Dashboard)
- Hiển thị tổng quỹ hiện tại
- Tổng đóng góp (tháng này, hết năm)
- Tổng chi tiêu (tháng này, hết năm)
- Số dư
- 3 giao dịch gần nhất

### 2. Trang Đóng Góp
- Danh sách thành viên + số tiền đã đóng
- Form thêm đóng góp mới (member, amount, date, notes)
- Xem chi tiết từng thành viên
- Export/in danh sách

### 3. Trang Chi Tiêu
- Danh sách chi tiêu theo thời gian
- Form thêm chi tiêu (category, amount, description, date, paid_by)
- Filter theo danh mục
- Tổng chi theo category

### 4. Trang Thành Viên
- Danh sách tất cả thành viên
- Thêm thành viên mới
- Sửa/xóa thành viên

### 5. Báo Cáo
- Tổng quỹ, tổng chi, tổng dư
- Chi tiêu theo danh mục (bảng + biểu đồ)
- Đóng góp theo thành viên (bảng + biểu đồ)
- Ghi chú cho từng tháng

---

## Yêu cầu giao diện
- **Responsive**: Tốt trên mobile + desktop
- **Navigation**: Menu đơn giản (Dashboard, Đóng Góp, Chi Tiêu, Thành Viên, Báo Cáo)
- **Format tiền**: VND (1.000.000 đ)
- **Font**: Clean, dễ đọc
- **Màu sắc**: Đơn giản (xanh/xám hoặc theo theme bạn chọn)
- **Icon**: Sử dụng lucide-react nếu cần

---

## Bước triển khai

### 1. Setup dự án
- Tạo Next.js project: `npx create-next-app@latest`
- Cài Tailwind, Supabase client
- Cài thư viện cần (chart.js hoặc recharts cho biểu đồ)

### 2. Tạo database Supabase
- Tạo bảng theo schema trên
- Set up RLS policy (nếu cần, hiện tại công khai)

### 3. Tạo API Routes / Server Actions
- GET /api/members
- POST /api/members
- GET /api/contributions
- POST /api/contributions
- GET /api/expenses
- POST /api/expenses
- GET /api/dashboard (tổng quỹ, thống kê)

### 4. Xây dựng UI
- Layout chính với sidebar/navbar
- Các trang theo danh sách tính năng
- Form validation cơ bản

### 5. Deploy
- Push lên GitHub
- Deploy Supabase project
- Link Vercel → GitHub
- Set environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)
- Deploy

---

## Acceptance Criteria
- ✅ App hoạt động trên Vercel + Supabase
- ✅ Có thể thêm/xóa/sửa members, contributions, expenses
- ✅ Dashboard hiển thị tổng quỹ, tổng chi, tổng dư
- ✅ Báo cáo có biểu đồ chi theo danh mục
- ✅ Responsive trên mobile + desktop
- ✅ Không lỗi database
- ✅ Data persist qua page reload

---

## Ghi chú
- Không cần authentication (công khai)
- Sử dụng Supabase client-side trực tiếp hoặc server actions (tuỳ preference)
- Có thể thêm darkmode sau
- Có thể thêm export CSV/PDF sau

---

**Ready? Chạy prompt này trong Claude Code CLI hoặc chat!**
