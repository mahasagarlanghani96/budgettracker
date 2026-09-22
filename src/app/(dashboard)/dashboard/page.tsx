'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
}

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
  if (!data) return <div className="text-center py-12 text-muted-foreground">Failed to load dashboard</div>;

  const statCards = [
    { label: 'Total Balance', value: formatCurrency(data.totalBalance), icon: Wallet, color: 'text-blue-600', href: '/accounts' },
    { label: 'Monthly Income', value: formatCurrency(data.monthlyIncome), icon: TrendingUp, color: 'text-green-600', href: '/reports' },
    { label: 'Monthly Expense', value: formatCurrency(data.monthlyExpense), icon: TrendingDown, color: 'text-red-600', href: '/reports' },
    { label: 'Receivables', value: formatCurrency(data.receivables), icon: HandCoins, color: 'text-orange-600', href: '/loans?direction=GIVEN' },
    { label: 'Payables', value: formatCurrency(data.payables), icon: HandCoins, color: 'text-purple-600', href: '/loans?direction=TAKEN' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your financial overview at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-lg font-bold tabular-nums mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/accounts">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-3">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{data.accountCount}</p>
                <p className="text-xs text-muted-foreground">Accounts</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/loans">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-3">
              <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{data.activeLoans}</p>
                <p className="text-xs text-muted-foreground">Active Loans</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/committees">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{data.activeCommittees}</p>
                <p className="text-xs text-muted-foreground">Active Committees</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Link href="/transactions" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{tx.description || tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.category?.name || tx.type} &middot; {tx.sourceAccount?.name}
                      </p>
                    </div>
                    <span
                      className={`font-medium tabular-nums ml-2 whitespace-nowrap ${
                        tx.type === 'INCOME' || tx.type === 'LOAN_REPAYMENT_RECEIVED'
                          ? 'text-green-600'
                          : tx.type === 'TRANSFER'
                            ? 'text-blue-600'
                            : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'INCOME' || tx.type === 'LOAN_REPAYMENT_RECEIVED' ? '+' : '-'}
                      {formatCurrency(tx.amount.toString())}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Savings Goals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Savings Goals</CardTitle>
            <Link href="/savings" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {data.savingsGoals.length === 0 ? (
              <div className="text-center py-4">
                <PiggyBank className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No savings goals yet</p>
                <Link href="/savings" className="text-sm text-primary hover:underline">Create one</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.savingsGoals.map((goal) => (
                  <div key={goal.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{goal.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
