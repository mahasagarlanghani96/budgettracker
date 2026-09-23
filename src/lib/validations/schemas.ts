import { z } from 'zod';

// ─── Auth ────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Accounts ────────────────────────────────────────────────────

export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  accountType: z.enum(['CASH', 'BANK', 'WALLET', 'CREDIT_CARD', 'SAVINGS_ACCOUNT', 'OTHER']),
  openingBalance: z.number().default(0),
  openingDate: z.string().optional(),
  currency: z.string().default('PKR'),
  isShared: z.boolean().default(false),
  notes: z.string().optional(),
});

// ─── Transactions ────────────────────────────────────────────────

export const transactionSchema = z.object({
  type: z.enum([
    'INCOME', 'EXPENSE', 'TRANSFER',
    'LOAN_GIVEN', 'LOAN_REPAYMENT_RECEIVED',
    'LOAN_TAKEN', 'LOAN_REPAYMENT_MADE',
    'COMMITTEE_CONTRIBUTION', 'COMMITTEE_RECEIVING',
    'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL',
    'INVESTMENT', 'INVESTMENT_RETURN',
    'PLOT_PAYMENT', 'OTHER',
  ]),
  amount: z.number().positive('Amount must be positive'),
  sourceAccountId: z.string().optional().nullable(),
  destAccountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  personId: z.string().optional().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
  transactionDate: z.string().min(1, 'Transaction date is required'),
  transactionTime: z.string().optional(),
  taxAmount: z.number().optional().nullable(),
  taxPercent: z.number().optional().nullable(),
  expectedAmount: z.number().optional().nullable(),
  isPrivate: z.boolean().default(true),
  relatedTransId: z.string().optional().nullable(),
});

// ─── Loans ───────────────────────────────────────────────────────

export const loanSchema = z.object({
  personId: z.string().min(1, 'Person is required'),
  direction: z.enum(['GIVEN', 'TAKEN']),
  amount: z.number().positive('Amount must be positive'),
  accountId: z.string().min(1, 'Account is required'),
  transactionDate: z.string().min(1, 'Date is required'),
  dueDate: z.string().optional().nullable(),
  interestRate: z.number().optional().nullable(),
  notes: z.string().optional(),
  isPrivate: z.boolean().default(true),
});

export const loanRepaymentSchema = z.object({
  personId: z.string().min(1, 'Person is required'),
  loanId: z.string().optional().nullable(), // null = general person-level repayment
  amount: z.number().positive('Amount must be positive'),
  accountId: z.string().min(1, 'Account is required'),
  transactionDate: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

// ─── People ──────────────────────────────────────────────────────

export const personSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  relationship: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Committees ──────────────────────────────────────────────────

export const committeeSchema = z.object({
  name: z.string().min(1, 'Committee name is required'),
  type: z.enum(['NORMAL', 'WAIYK']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().nullable(),
  memberCount: z.number().int().positive('Member count must be positive'),
  monthlyContribution: z.number().positive('Monthly contribution must be positive'),
  totalAmount: z.number().positive().optional().nullable(), // Waiyk: opening amount
  userSlots: z.number().int().positive().default(1),
  notes: z.string().optional(),
  isPrivate: z.boolean().default(true),
});

export const committeeRoundSchema = z.object({
  committeeId: z.string().min(1),
  roundNumber: z.number().int().positive(),
  roundDate: z.string().min(1),
  totalAmount: z.number().optional().nullable(),
  expectedAmount: z.number().optional().nullable(),
  winningBid: z.number().optional().nullable(),
  winningMember: z.string().optional().nullable(),
  payoutAmount: z.number().optional().nullable(),
  memberCount: z.number().int().optional().nullable(),
  notes: z.string().optional(),
});

export const committeeContributionSchema = z.object({
  committeeId: z.string().min(1),
  entryId: z.string().min(1),
  roundId: z.string().optional().nullable(),
  accountId: z.string().min(1),
  expectedAmount: z.number(),
  actualAmount: z.number(),
  profitDeduction: z.number().default(0),
  status: z.enum(['PAID', 'PENDING', 'SKIPPED']).default('PAID'),
  transactionDate: z.string().min(1),
  notes: z.string().optional(),
});

export const committeeReceivingSchema = z.object({
  committeeId: z.string().min(1),
  entryId: z.string().min(1),
  roundId: z.string().optional().nullable(),
  accountId: z.string().min(1),
  expectedAmount: z.number().optional().nullable(),
  actualAmount: z.number().positive(),
  transactionDate: z.string().min(1),
  notes: z.string().optional(),
});

// ─── Savings ─────────────────────────────────────────────────────

export const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  targetAmount: z.number().positive('Target must be positive'),
  targetDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const savingsTransactionSchema = z.object({
  savingsGoalId: z.string().min(1),
  accountId: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL']),
  transactionDate: z.string().min(1),
  notes: z.string().optional(),
});

// ─── Investments ─────────────────────────────────────────────────

export const investmentSchema = z.object({
  name: z.string().min(1, 'Investment name is required'),
  investmentType: z.string().min(1, 'Type is required'),
  amountInvested: z.number().positive('Amount must be positive'),
  currentValue: z.number().optional().nullable(),
  accountId: z.string().min(1, 'Account is required'),
  investmentDate: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

// ─── Plots ───────────────────────────────────────────────────────

export const plotSchema = z.object({
  name: z.string().min(1, 'Plot name is required'),
  totalPrice: z.number().positive('Price must be positive'),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const plotPaymentSchema = z.object({
  plotId: z.string().min(1),
  accountId: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  transactionDate: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

// ─── Financial Targets ───────────────────────────────────────────

export const targetSchema = z.object({
  name: z.string().min(1, 'Target name is required'),
  type: z.enum(['MAX_EXPENSE', 'MAX_TOTAL_EXPENSE', 'MIN_SAVINGS', 'MIN_INCOME', 'CUSTOM']),
  categoryId: z.string().optional().nullable(),
  amount: z.number().positive('Amount must be positive'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  notes: z.string().optional(),
});

// ─── Categories ──────────────────────────────────────────────────

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  group: z.enum(['INCOME', 'EXPENSE']),
  icon: z.string().optional(),
});

// ─── Nested-route inputs ─────────────────────────────────────────
// Routes nested under a parent (/loans/:id/repayments, ...) take the parent id
// and the loan's person from the URL/record, not from the request body.

export const loanRepaymentInputSchema = loanRepaymentSchema.omit({ personId: true, loanId: true });
export const plotPaymentInputSchema = plotPaymentSchema.omit({ plotId: true });
export const savingsTransactionInputSchema = savingsTransactionSchema.omit({ savingsGoalId: true });

export const committeeMemberSchema = z.object({
  name: z.string().min(1, 'Member name is required'),
  personId: z.string().optional().nullable(),
  slots: z.number().int().positive('Slots must be at least 1').default(1),
  isUser: z.boolean().default(false),
  notes: z.string().optional(),
});

export const committeeRoundUpdateSchema = z.object({
  roundDate: z.string().min(1, 'Date is required'),
  winningBid: z.number().positive().optional().nullable(),
  winningMember: z.string().optional().nullable(),
  notes: z.string().optional(),
});

// ─── Updates ─────────────────────────────────────────────────────

export const personUpdateSchema = personSchema.extend({ isActive: z.boolean().optional() });
export const categoryUpdateSchema = categorySchema.extend({ isActive: z.boolean().optional() });
