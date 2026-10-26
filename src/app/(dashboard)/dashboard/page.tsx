'use client';

import { useEffect, useState } from 'react';
import { PageLoading } from '@/components/ui/loading';
import { formatCurrency } from '@/lib/utils';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  HandCoins,
  ArrowLeftRight,
  Users,
  PiggyBank,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CreditCard,
  Send,
  Target,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  totalBalance: string;
  monthlyIncome: string;
  monthlyExpense: string;
  receivables: string;
  payables: string;
  accountCount: number;
  activeLoans: number;
  activeCommittees: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: { toString(): string };
    description: string;
    transactionDate: string;
    category?: { name: string } | null;
    sourceAccount?: { name: string } | null;
  }>;
  savingsGoals: Array<{
    id: string;
    name: string;
    targetAmount: string;
    currentAmount: string;
    progress: number;
  }>;
  expenseByCategory: Array<{ name: string; amount: string }>;
  weeklyTrend: Array<{ date: string; income: number; expense: number }>;
}

const POSITIVE_TYPES = ['INCOME', 'LOAN_REPAYMENT_RECEIVED', 'COMMITTEE_RECEIVING', 'SAVINGS_WITHDRAWAL', 'INVESTMENT_RETURN', 'LOAN_TAKEN'];
const DONUT_COLORS = ['var(--emerald)', 'var(--blue)', 'var(--coral)', 'var(--amber)', 'var(--violet)', 'var(--teal)'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ─── SVG Charts ─── */

function SavingsRing({ progress, size = 110 }: { progress: number; size?: number }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--glass-border)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#ringGrad)" strokeWidth={8} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ animation: 'ringDraw 1.2s ease-out 0.6s both' }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--emerald)" />
          <stop offset="100%" stopColor="var(--teal)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DonutChart({ data }: { data: Array<{ name: string; amount: string }> }) {
  const total = data.reduce((s, d) => s + parseFloat(d.amount), 0);
  if (total === 0) return null;
  const size = 150;
  const cx = size / 2, cy = size / 2, r = 54, strokeW = 20;
  let cumulative = 0;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((d, i) => {
            const pct = parseFloat(d.amount) / total;
            const dashLen = pct * circumference;
            const dashOffset = -cumulative * circumference;
            cumulative += pct;
            return (
              <circle
                key={i}
                cx={cx} cy={cy} r={r} fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth={strokeW}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ padding: `${strokeW + 4}px` }}>
          <span className="text-[11px] font-display font-bold text-[var(--text-primary)] tabular-nums leading-tight text-center truncate max-w-full">{formatCurrency(total.toString())}</span>
          <span className="text-[8px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">this month</span>
        </div>
      </div>
      <div className="space-y-2.5 min-w-0">
        {data.map((d, i) => {
          const pct = Math.round((parseFloat(d.amount) / total) * 100);
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{d.name}</span>
              <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">{pct}%</span>
              <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)]">{formatCurrency(d.amount)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyTrendChart({ data }: { data: Array<{ date: string; income: number; expense: number }> }) {
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  const h = 120, w = 280;
  const barW = 14, gap = (w - data.length * barW * 2) / (data.length + 1);

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h + 28} className="mx-auto">
        {data.map((d, i) => {
          const x = gap + i * (barW * 2 + gap);
          const incH = (d.income / maxVal) * h;
          const expH = (d.expense / maxVal) * h;
          const dayLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 2);
          return (
            <g key={i}>
              <rect x={x} y={h - incH} width={barW} height={incH} rx={3} fill="var(--emerald)" opacity={0.8} className="transition-all duration-500" />
              <rect x={x + barW} y={h - expH} width={barW} height={expH} rx={3} fill="var(--coral)" opacity={0.6} className="transition-all duration-500" />
              <text x={x + barW} y={h + 16} textAnchor="middle" fill="var(--text-tertiary)" fontSize="9" fontWeight="500">
                {dayLabel}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[var(--emerald)]" /><span className="text-[10px] text-[var(--text-tertiary)]">Income</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[var(--coral)]" /><span className="text-[10px] text-[var(--text-tertiary)]">Expense</span></div>
      </div>
    </div>
  );
}

function IncomeExpenseBar({ income, expense }: { income: number; expense: number }) {
  const total = income + expense;
  if (total === 0) return null;
  const incPct = (income / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--text-secondary)]">Income vs Expense</span>
        <span className="text-[var(--text-tertiary)]">{Math.round(incPct)}% / {Math.round(100 - incPct)}%</span>
      </div>
      <div className="h-2.5 bg-[var(--glass-bg)] rounded-full overflow-hidden flex">
        <div className="h-full bg-[var(--emerald)] rounded-l-full transition-all duration-700" style={{ width: `${incPct}%` }} />
        <div className="h-full bg-[var(--coral)] rounded-r-full transition-all duration-700" style={{ width: `${100 - incPct}%` }} />
      </div>
    </div>
  );
}

/* ─── Quick Actions ─── */

const quickActions = [
  { label: 'Add Income', icon: ArrowDownRight, href: '/transactions/new', accent: 'var(--emerald)', dimBg: 'var(--emerald-dim)' },
  { label: 'Add Expense', icon: ArrowUpRight, href: '/transactions/new', accent: 'var(--coral)', dimBg: 'var(--coral-dim)' },
  { label: 'Transfer', icon: Send, href: '/transactions/new', accent: 'var(--blue)', dimBg: 'var(--blue-dim)' },
  { label: 'New Loan', icon: CreditCard, href: '/loans', accent: 'var(--amber)', dimBg: 'var(--amber-dim)' },
  { label: 'Set Target', icon: Target, href: '/targets', accent: 'var(--violet)', dimBg: 'var(--violet-dim)' },
  { label: 'Save', icon: PiggyBank, href: '/savings', accent: 'var(--teal)', dimBg: 'rgba(14,165,233,0.12)' },
];

/* ─── Main Component ─── */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;
  if (!data) return <div className="text-center py-12 text-[var(--text-secondary)]">Failed to load dashboard</div>;

  const income = parseFloat(data.monthlyIncome);
  const expense = parseFloat(data.monthlyExpense);
  const netFlow = income - expense;

  const statCards = [
    { label: 'Total Balance', value: formatCurrency(data.totalBalance), icon: Wallet, accent: 'emerald' as const, href: '/accounts' },
    { label: 'Monthly Income', value: formatCurrency(data.monthlyIncome), icon: TrendingUp, accent: 'blue' as const, href: '/reports', change: income > 0 ? '+' + formatCurrency(data.monthlyIncome) : null },
    { label: 'Monthly Expense', value: formatCurrency(data.monthlyExpense), icon: TrendingDown, accent: 'coral' as const, href: '/reports' },
    { label: 'Receivables', value: formatCurrency(data.receivables), icon: HandCoins, accent: 'amber' as const, href: '/loans?direction=GIVEN' },
    { label: 'Payables', value: formatCurrency(data.payables), icon: HandCoins, accent: 'violet' as const, href: '/loans?direction=TAKEN' },
  ];

  const accentMap = {
    emerald: { text: 'var(--emerald)', dim: 'var(--emerald-dim)', glow: 'var(--emerald-glow)' },
    blue: { text: 'var(--blue)', dim: 'var(--blue-dim)', glow: 'rgba(59,130,246,0.2)' },
    coral: { text: 'var(--coral)', dim: 'var(--coral-dim)', glow: 'rgba(255,92,92,0.2)' },
    amber: { text: 'var(--amber)', dim: 'var(--amber-dim)', glow: 'rgba(255,170,44,0.2)' },
    violet: { text: 'var(--violet)', dim: 'var(--violet-dim)', glow: 'rgba(167,139,250,0.2)' },
  };

  const summaryPills = [
    { label: 'Accounts', value: data.accountCount, icon: Wallet, accent: 'blue' as const, href: '/accounts' },
    { label: 'Active Loans', value: data.activeLoans, icon: ArrowLeftRight, accent: 'amber' as const, href: '/loans' },
    { label: 'Active Committees', value: data.activeCommittees, icon: Users, accent: 'violet' as const, href: '/committees' },
  ];

  const bestGoal = data.savingsGoals.length > 0 ? data.savingsGoals.reduce((a, b) => a.progress > b.progress ? a : b) : null;

  return (
    <div className="space-y-6">
      {/* Greeting + net flow badge */}
      <div className="flex items-end justify-between animate-in-view stagger-1">
        <div>
          <h1 className="text-[26px] font-display font-bold text-[var(--text-primary)] tracking-[-0.02em]">{getGreeting()}</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">Your financial overview at a glance</p>
        </div>
        {(income > 0 || expense > 0) && (
          <div className={`glass flex items-center gap-2 px-3 py-1.5 text-sm font-semibold tabular-nums ${netFlow >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
            <Zap className="h-3.5 w-3.5" />
            {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow.toString())} net
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 animate-in-view stagger-2">
        {statCards.map((stat) => {
          const a = accentMap[stat.accent];
          return (
            <Link key={stat.label} href={stat.href}>
              <div className="glass glass-interactive relative overflow-hidden cursor-pointer p-5 group">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full" style={{ background: a.text }} />
                <div className="absolute top-0 right-0 w-24 h-24 opacity-40 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${a.glow}, transparent 70%)` }} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--text-tertiary)]">{stat.label}</p>
                    <stat.icon className="h-4 w-4 opacity-30" style={{ color: a.text }} />
                  </div>
                  <p className="text-[20px] font-display font-bold tabular-nums tracking-[-0.02em]" style={{ color: a.text }}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Income vs Expense bar */}
      <div className="glass p-5 animate-in-view stagger-3">
        <IncomeExpenseBar income={income} expense={expense} />
      </div>

      {/* Quick Actions */}
      <div className="animate-in-view stagger-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--text-tertiary)] mb-3">Quick Actions</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <div className="glass glass-interactive flex flex-col items-center gap-2 py-4 px-2 cursor-pointer text-center">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl" style={{ background: action.dimBg }}>
                  <action.icon className="h-5 w-5" style={{ color: action.accent }} />
                </div>
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Summary pills */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 animate-in-view stagger-4">
        {summaryPills.map((pill) => {
          const a = accentMap[pill.accent];
          return (
            <Link key={pill.label} href={pill.href}>
              <div className="glass glass-interactive flex items-center gap-4 p-4 cursor-pointer">
                <div className="flex items-center justify-center h-[42px] w-[42px] rounded-xl" style={{ background: a.dim }}>
                  <pill.icon className="h-5 w-5" style={{ color: a.text }} />
                </div>
                <div>
                  <p className="text-[26px] font-display font-bold text-[var(--text-primary)]">{pill.value}</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">{pill.label}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts row: Donut + Weekly Trend */}
      <div className="grid gap-6 lg:grid-cols-2 animate-in-view stagger-5">
        {/* Spending Breakdown */}
        <div className="glass">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">Spending Breakdown</h2>
            <Link href="/reports" className="text-sm text-[var(--emerald)] hover:underline">Details</Link>
          </div>
          <div className="px-6 pb-6">
            {data.expenseByCategory.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] py-8 text-center">No expenses this month</p>
            ) : (
              <DonutChart data={data.expenseByCategory} />
            )}
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="glass">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">7-Day Trend</h2>
            <Link href="/reports" className="text-sm text-[var(--emerald)] hover:underline">Reports</Link>
          </div>
          <div className="px-6 pb-6">
            {data.weeklyTrend.every(d => d.income === 0 && d.expense === 0) ? (
              <p className="text-sm text-[var(--text-tertiary)] py-8 text-center">No activity this week</p>
            ) : (
              <WeeklyTrendChart data={data.weeklyTrend} />
            )}
          </div>
        </div>
      </div>

      {/* Transactions + Savings */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <div className="glass animate-in-view stagger-6">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">Recent Transactions</h2>
            <Link href="/transactions" className="text-sm text-[var(--emerald)] hover:underline">View all</Link>
          </div>
          <div className="px-6 pb-6">
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">No transactions yet</p>
            ) : (
              <div className="space-y-0.5">
                {data.recentTransactions.slice(0, 6).map((tx) => {
                  const isPositive = POSITIVE_TYPES.includes(tx.type);
                  const isTransfer = tx.type === 'TRANSFER';
                  const iconBg = isPositive ? 'var(--emerald-dim)' : isTransfer ? 'var(--blue-dim)' : 'var(--coral-dim)';
                  const iconColor = isPositive ? 'var(--emerald)' : isTransfer ? 'var(--blue)' : 'var(--coral)';
                  const amountColor = isPositive ? 'var(--emerald)' : isTransfer ? 'var(--blue)' : 'var(--coral)';
                  const Icon = isPositive ? ArrowDownRight : isTransfer ? ArrowLeftRight : ArrowUpRight;
                  return (
                    <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[var(--glass-bg-hover)] rounded-lg px-2 -mx-2 transition-colors">
                      <div className="flex items-center justify-center h-9 w-9 rounded-xl shrink-0" style={{ background: iconBg }}>
                        <Icon className="h-4 w-4" style={{ color: iconColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          {tx.category?.name || tx.type.replace(/_/g, ' ')} · {tx.sourceAccount?.name}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums ml-2 whitespace-nowrap" style={{ color: amountColor }}>
                        {isPositive ? '+' : '-'}{formatCurrency(tx.amount.toString())}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Savings Goals */}
        <div className="glass animate-in-view stagger-7">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">Savings Goals</h2>
            <Link href="/savings" className="text-sm text-[var(--emerald)] hover:underline">View all</Link>
          </div>
          <div className="px-6 pb-6">
            {data.savingsGoals.length === 0 ? (
              <div className="text-center py-6">
                <PiggyBank className="h-8 w-8 mx-auto text-[var(--text-tertiary)] mb-2" />
                <p className="text-sm text-[var(--text-tertiary)]">No savings goals yet</p>
                <Link href="/savings" className="text-sm text-[var(--emerald)] hover:underline mt-1 inline-block">Create one</Link>
              </div>
            ) : (
              <div className="space-y-5">
                {bestGoal && (
                  <div className="flex items-center gap-5">
                    <div className="relative shrink-0">
                      <SavingsRing progress={bestGoal.progress} size={110} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-display font-bold text-[var(--text-primary)]">{Math.round(bestGoal.progress)}%</span>
                        <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider">saved</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-[var(--text-primary)]">{bestGoal.name}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                        {formatCurrency(bestGoal.currentAmount)} <span className="text-[var(--text-tertiary)]">of</span> {formatCurrency(bestGoal.targetAmount)}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                        {formatCurrency((parseFloat(bestGoal.targetAmount) - parseFloat(bestGoal.currentAmount)).toString())} remaining
                      </p>
                    </div>
                  </div>
                )}
                {data.savingsGoals.filter(g => g.id !== bestGoal?.id).map((goal) => (
                  <div key={goal.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-[var(--text-primary)]">{goal.name}</span>
                      <span className="text-[var(--text-secondary)] tabular-nums text-xs">
                        {Math.round(goal.progress)}%
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--glass-bg)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[var(--emerald)] to-[var(--teal)]"
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--text-tertiary)] mt-1">
                      <span>{formatCurrency(goal.currentAmount)}</span>
                      <span>{formatCurrency(goal.targetAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <Link
        href="/transactions/new"
        className="fixed bottom-7 right-7 z-40 flex items-center justify-center h-[52px] w-[52px] rounded-2xl bg-gradient-to-br from-[var(--emerald)] to-[var(--teal)] text-white shadow-glow-emerald hover:scale-105 hover:shadow-[0_4px_32px_rgba(0,214,143,0.4),0_0_80px_rgba(0,214,143,0.15)] transition-all duration-200"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
