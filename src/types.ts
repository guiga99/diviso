export interface Friend {
  id: string;
  name: string;
  email?: string;
  avatarColor?: string; // Tailwind bg-class for UI styling
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdAt: string;
}

export type SplitType = 'equal' | 'exact' | 'percentage';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  groupId: string | null; // null represents individual/direct ledger between friends
  paidById: string; // Who paid
  splitType: SplitType;
  splits: Record<string, number>; // If equal: Map of memberId -> 1 (true). If exact: Map of memberId -> value. If percentage: Map of memberId -> percentage.
  isSettlement?: boolean; // True if this was a direct peer-to-peer payment (settlement of debt)
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind text color class
  bgColor: string; // Tailwind background color class
}

export interface Debt {
  fromId: string;
  toId: string;
  amount: number;
}

export interface MemberBalance {
  memberId: string;
  balance: number; // positive = creditor, negative = debtor
}
