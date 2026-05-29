-- =============================================
-- VIA FC - Database Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- MEMBERS
-- =============================================
create table members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  join_date date not null default current_date,
  leave_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================
-- MONTHLY CONTRIBUTIONS
-- Mỗi thành viên đóng 300k/tháng
-- =============================================
create table monthly_contributions (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references members(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  amount int not null default 300000,
  paid boolean not null default false,
  paid_at timestamptz,
  tingee_ref text, -- transaction ID từ Tingee
  notes text,
  created_at timestamptz not null default now(),
  unique (member_id, year, month)
);

-- =============================================
-- MATCHES
-- Tiền sân cố định 6.950.000/tháng, chia theo kết quả
-- Thắng: Vỉa 40% - Đối thủ 60%
-- Thua/Hòa: Vỉa 60% - Đối thủ 40%
-- =============================================
create type match_result as enum ('win', 'lose', 'draw');

create table matches (
  id uuid primary key default uuid_generate_v4(),
  match_date date not null,
  opponent text not null,
  result match_result not null,
  field_cost int not null default 6950000,
  -- Tính tự động từ result
  via_percentage int not null, -- 40 nếu thắng, 60 nếu thua/hòa
  opponent_percentage int not null, -- 60 nếu thắng, 40 nếu thua/hòa
  via_amount int not null,
  opponent_amount int not null,
  opponent_paid boolean not null default false,
  opponent_paid_at timestamptz,
  notes text,
  year int not null,
  month int not null check (month between 1 and 12),
  created_at timestamptz not null default now()
);

-- =============================================
-- EXPENSES - Chi tiêu khác
-- =============================================
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  amount int not null,
  expense_date date not null default current_date,
  category text not null default 'other',
  year int not null,
  month int not null check (month between 1 and 12),
  notes text,
  created_at timestamptz not null default now()
);

-- =============================================
-- TINGEE TRANSACTIONS
-- Giao dịch nhận tiền qua Tingee
-- =============================================
create type tingee_status as enum ('pending', 'matched', 'unmatched');

create table tingee_transactions (
  id uuid primary key default uuid_generate_v4(),
  tingee_id text unique, -- ID giao dịch từ Tingee
  amount int not null,
  description text,
  transaction_at timestamptz not null,
  matched_contribution_id uuid references monthly_contributions(id),
  status tingee_status not null default 'pending',
  raw_data jsonb,
  created_at timestamptz not null default now()
);

-- =============================================
-- INDEXES
-- =============================================
create index idx_contributions_year_month on monthly_contributions(year, month);
create index idx_contributions_member on monthly_contributions(member_id);
create index idx_matches_year_month on matches(year, month);
create index idx_expenses_year_month on expenses(year, month);
create index idx_tingee_status on tingee_transactions(status);

-- =============================================
-- ROW LEVEL SECURITY (optional - enable if needed)
-- =============================================
-- alter table members enable row level security;
-- alter table monthly_contributions enable row level security;
-- alter table matches enable row level security;
-- alter table expenses enable row level security;
-- alter table tingee_transactions enable row level security;

-- =============================================
-- SEED DATA - Cấu hình mặc định
-- =============================================
-- Thêm thành viên mẫu (xóa nếu không cần)
-- insert into members (name, phone) values
--   ('Nguyễn Văn A', '0901234567'),
--   ('Trần Văn B', '0912345678');
