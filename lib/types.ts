export type MatchResult = "win" | "lose" | "draw";
export type TingeeStatus = "pending" | "matched" | "unmatched";

export interface Member {
  id: string;
  name: string;
  phone?: string;
  join_date: string;
  leave_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface MonthlyContribution {
  id: string;
  member_id: string;
  year: number;
  month: number;
  amount: number;
  paid: boolean;
  paid_at?: string;
  tingee_ref?: string;
  notes?: string;
  created_at: string;
  // joined
  member?: Member;
}

export interface Match {
  id: string;
  match_date: string;
  opponent: string;
  result: MatchResult;
  field_cost: number;
  via_percentage: number;
  opponent_percentage: number;
  via_amount: number;
  opponent_amount: number;
  opponent_paid: boolean;
  opponent_paid_at?: string;
  notes?: string;
  year: number;
  month: number;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string;
  year: number;
  month: number;
  notes?: string;
  created_at: string;
}

export interface TingeeTransaction {
  id: string;
  tingee_id?: string;
  amount: number;
  description?: string;
  transaction_at: string;
  matched_contribution_id?: string;
  status: TingeeStatus;
  raw_data?: Record<string, unknown>;
  created_at: string;
}

export interface MonthSummary {
  year: number;
  month: number;
  totalContributions: number;
  paidContributions: number;
  unpaidContributions: number;
  activeMembers: number;
  totalFieldCost: number;
  viaFieldCost: number;
  totalExpenses: number;
  balance: number;
}
