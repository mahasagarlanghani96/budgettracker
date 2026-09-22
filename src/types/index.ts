import type {
  Account, Transaction, Category, Person, Loan, LoanRepayment,
  Committee, CommitteeEntry, CommitteeRound, CommitteeContribution,
  CommitteeReceiving, CommitteeMember, SavingsGoal, SavingsTransaction,
  Investment, Plot, PlotPayment, FinancialTarget,
} from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';

// ─── Session ─────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

// ─── API Response ────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ─── Accounts ────────────────────────────────────────────────────

export interface AccountWithBalance extends Account {
  currentBalance: Decimal | number | string;
}

// ─── Transactions ────────────────────────────────────────────────

export interface TransactionWithRelations extends Transaction {
  sourceAccount?: Account | null;
  destAccount?: Account | null;
  category?: Category | null;
  person?: Person | null;
}

// ─── Loans ───────────────────────────────────────────────────────

export interface LoanWithRepayments extends Loan {
  person: Person;
  repayments: LoanRepayment[];
  totalRepaid: number;
  outstanding: number;
}

export interface PersonWithLoans extends Person {
  loans: Loan[];
  totalGiven: number;
  totalRepaid: number;
  totalOutstanding: number;
}

// ─── Committees ──────────────────────────────────────────────────

export interface CommitteeWithDetails extends Committee {
  entries: CommitteeEntry[];
  rounds: CommitteeRound[];
  members: CommitteeMember[];
  contributions: CommitteeContribution[];
  receivings: CommitteeReceiving[];
}

// ─── Savings ─────────────────────────────────────────────────────

export interface SavingsGoalWithProgress extends SavingsGoal {
  transactions: SavingsTransaction[];
  currentAmount: number;
  progress: number; // 0–100
}

// ─── Investments ─────────────────────────────────────────────────

export interface InvestmentWithPL extends Investment {
  profitLoss: number;
}

// ─── Plots ───────────────────────────────────────────────────────

export interface PlotWithPayments extends Plot {
  payments: PlotPayment[];
  totalPaid: number;
  remaining: number;
}

// ─── Dashboard ───────────────────────────────────────────────────

export interface DashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalReceivables: number;
  totalPayables: number;
  totalSavings: number;
  totalInvestments: number;
  accounts: AccountWithBalance[];
  recentTransactions: TransactionWithRelations[];
}

// ─── Date Filter ─────────────────────────────────────────────────

export type DateFilterType = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

export interface DateRange {
  start: Date;
  end: Date;
}

// ─── Reports ─────────────────────────────────────────────────────

export interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  transfers: number;
  loansGiven: number;
  loanRepayments: number;
  committeeContributions: number;
  committeeReceivings: number;
  savingsDeposits: number;
  investmentTransactions: number;
  plotPayments: number;
  expensesByCategory: { category: string; amount: number }[];
  incomeByType: { type: string; amount: number }[];
  dailyTotals: { date: string; income: number; expense: number }[];
}
