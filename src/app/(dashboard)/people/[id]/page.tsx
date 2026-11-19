'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/ui/loading';
import { formatCurrency, formatDate, formatEnum } from '@/lib/utils';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, HandCoins, Users } from 'lucide-react';
import Link from 'next/link';

const typeBadgeVariant: Record<string, 'default' | 'success' | 'destructive' | 'secondary' | 'warning' | 'outline'> = {
  INCOME: 'success',
  EXPENSE: 'destructive',
  TRANSFER: 'secondary',
  LOAN_GIVEN: 'warning',
  LOAN_TAKEN: 'warning',
  LOAN_REPAYMENT_RECEIVED: 'success',
  LOAN_REPAYMENT_MADE: 'destructive',
  SAVINGS_DEPOSIT: 'warning',
  SAVINGS_WITHDRAWAL: 'secondary',
  INVESTMENT: 'warning',
  INVESTMENT_RETURN: 'success',
  COMMITTEE_CONTRIBUTION: 'destructive',
  COMMITTEE_RECEIVING: 'success',
  PLOT_PAYMENT: 'destructive',
};

interface PersonData {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  relationship?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  transactions: Array<{
    id: string;
    type: string;
    amount: { toString(): string };
    description: string;
    transactionDate: string;
    isHistorical?: boolean;
    category?: { name: string } | null;
    sourceAccount?: { name: string } | null;
    destAccount?: { name: string } | null;
  }>;
  totalTransactions: number;
  loans: Array<{
    id: string;
    direction: string;
    amount: { toString(): string };
    remainingAmount: { toString(): string };
    status: string;
    transactionDate: string;
    dueDate?: string | null;
    account: { name: string };
    _count: { repayments: number };
  }>;
  committeeMemberships: Array<{
    id: string;
    slots: number;
    committee: {
      id: string;
      name: string;
      type: string;
      status: string;
      monthlyContribution: { toString(): string };
    };
  }>;
  summary: {
    totalTransactions: number;
    totalInflow: string;
    totalOutflow: string;
    net: string;
    byType: Array<{ type: string; count: number; total: string }>;
  };
  loanSummary: {
    totalGiven: string;
    totalTaken: string;
    outstandingGiven: string;
    outstandingTaken: string;
    count: number;
  };
}

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PersonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PersonData['transactions']>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPerson = useCallback(() => {
    fetch(`/api/persons/${id}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res.data);
        setTransactions(res.data?.transactions || []);
        setTotalTransactions(res.data?.totalTransactions || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchPerson(); }, [fetchPerson]);

  async function loadMoreTransactions() {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/persons/${id}?limit=50&offset=${transactions.length}`);
      const json = await res.json();
      if (json.data?.transactions) {
        setTransactions((prev) => [...prev, ...json.data.transactions]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) return <PageLoading />;
  if (!data) return <div className="text-center py-12 text-[var(--text-secondary)]">Person not found</div>;

  const hasMore = transactions.length < totalTransactions;
  const s = data.summary;
  const ls = data.loanSummary;
  const net = parseFloat(s.net);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/people">
          <Button variant="ghost" size="icon" aria-label="Back to people"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[var(--text-primary)] truncate">{data.name}</h1>
            <Badge variant={data.isActive ? 'success' : 'secondary'} className="text-xs shrink-0">
              {data.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 text-sm text-[var(--text-secondary)] mt-1">
            {data.relationship && <span>{data.relationship}</span>}
            {data.phone && <span>{data.phone}</span>}
            {data.email && <span className="truncate">{data.email}</span>}
          </div>
        </div>
      </div>

      {data.notes && (
        <p className="text-sm text-[var(--text-secondary)] bg-[var(--glass-bg)] rounded-md px-3 py-2">{data.notes}</p>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-[var(--text-secondary)]">Total Transactions</p>
            <p className="text-2xl font-display font-bold text-[var(--text-primary)] tabular-nums">{s.totalTransactions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowDownRight className="h-5 w-5 text-[var(--emerald)] shrink-0" />
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Received from {data.name.split(' ')[0]}</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(s.totalInflow)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowUpRight className="h-5 w-5 text-[var(--coral)] shrink-0" />
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Paid to {data.name.split(' ')[0]}</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(s.totalOutflow)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-[var(--text-secondary)]">Net</p>
            <p className={`text-xl font-bold tabular-nums ${net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
              {formatCurrency(s.net)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Breakdown */}
      {s.byType.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Transaction Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {s.byType.map((t) => (
                <div key={t.type} className="flex items-center justify-between px-3 py-2 bg-[var(--glass-bg)] rounded-md">
                  <div className="flex items-center gap-2">
                    <Badge variant={typeBadgeVariant[t.type] || 'outline'} className="text-xs">
                      {formatEnum(t.type)}
                    </Badge>
                    <span className="text-xs text-[var(--text-secondary)]">&times;{t.count}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(t.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loans Section */}
      {data.loans.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HandCoins className="h-4 w-4" />
              <CardTitle className="text-base">Loans ({ls.count})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="px-3 py-2 bg-[var(--glass-bg)] rounded-md">
                <p className="text-xs text-[var(--text-secondary)]">Given to {data.name}</p>
                <p className="font-bold tabular-nums">{formatCurrency(ls.totalGiven)}</p>
                {parseFloat(ls.outstandingGiven) > 0 && (
                  <p className="text-xs text-[var(--amber)]">Outstanding: {formatCurrency(ls.outstandingGiven)}</p>
                )}
              </div>
              <div className="px-3 py-2 bg-[var(--glass-bg)] rounded-md">
                <p className="text-xs text-[var(--text-secondary)]">Taken from {data.name}</p>
                <p className="font-bold tabular-nums">{formatCurrency(ls.totalTaken)}</p>
                {parseFloat(ls.outstandingTaken) > 0 && (
                  <p className="text-xs text-[var(--amber)]">Outstanding: {formatCurrency(ls.outstandingTaken)}</p>
                )}
              </div>
            </div>
            {/* Mobile card view */}
            <div className="divide-y divide-[var(--glass-border)] md:hidden">
              {data.loans.map((loan) => (
                <Link key={loan.id} href={`/loans/${loan.id}`} className="block py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={loan.direction === 'GIVEN' ? 'success' : 'warning'} className="text-[10px]">{formatEnum(loan.direction)}</Badge>
                        <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px]">{formatEnum(loan.status)}</Badge>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{formatDate(loan.transactionDate)} · {loan.account.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{loan._count.repayments} repayment{loan._count.repayments !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium tabular-nums">{formatCurrency(loan.amount.toString())}</p>
                      <p className="text-xs text-[var(--text-secondary)] tabular-nums">Rem: {formatCurrency(loan.remainingAmount.toString())}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Direction</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Repayments</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <Link href={`/loans/${loan.id}`}>
                          <Badge variant={loan.direction === 'GIVEN' ? 'success' : 'warning'} className="text-xs cursor-pointer">
                            {formatEnum(loan.direction)}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(loan.transactionDate)}</TableCell>
                      <TableCell className="text-sm">{loan.account.name}</TableCell>
                      <TableCell>
                        <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                          {formatEnum(loan.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{loan._count.repayments}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(loan.amount.toString())}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(loan.remainingAmount.toString())}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Committee Memberships */}
      {data.committeeMemberships.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <CardTitle className="text-base">Committees ({data.committeeMemberships.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile card view */}
            <div className="divide-y divide-[var(--glass-border)] md:hidden">
              {data.committeeMemberships.map((m) => (
                <Link key={m.id} href={`/committees/${m.committee.id}`} className="block py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.committee.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--text-secondary)]">{m.committee.type === 'WAIYK' ? 'WAIYK' : formatEnum(m.committee.type)}</span>
                        <Badge variant={m.committee.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-[10px]">{formatEnum(m.committee.status)}</Badge>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{m.slots} slot{m.slots !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-sm font-medium tabular-nums shrink-0">{formatCurrency(m.committee.monthlyContribution.toString())}/mo</span>
                  </div>
                </Link>
              ))}
            </div>
            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Slots</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.committeeMemberships.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        <Link href={`/committees/${m.committee.id}`} className="hover:underline">
                          {m.committee.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{m.committee.type === 'WAIYK' ? 'WAIYK' : formatEnum(m.committee.type)}</TableCell>
                      <TableCell>
                        <Badge variant={m.committee.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs">
                          {formatEnum(m.committee.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{m.slots}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(m.committee.monthlyContribution.toString())}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Transaction History
            {totalTransactions > 0 && (
              <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">
                ({transactions.length} of {totalTransactions})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-4">No transactions with this person</p>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="divide-y divide-[var(--glass-border)] md:hidden">
                {transactions.map((tx) => (
                  <div key={tx.id} className={`py-3 first:pt-0 ${tx.isHistorical ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{tx.description || formatEnum(tx.type)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={typeBadgeVariant[tx.type] || 'outline'} className="text-[10px]">{formatEnum(tx.type)}</Badge>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {formatDate(tx.transactionDate)} · {tx.sourceAccount?.name || tx.destAccount?.name || '—'}
                        </p>
                      </div>
                      <span className="text-sm font-medium tabular-nums shrink-0">{formatCurrency(tx.amount.toString())}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className={tx.isHistorical ? 'opacity-50' : ''}>
                        <TableCell className="text-sm">{formatDate(tx.transactionDate)}</TableCell>
                        <TableCell className="text-sm">{tx.description || tx.type}</TableCell>
                        <TableCell>
                          <Badge variant={typeBadgeVariant[tx.type] || 'outline'} className="text-xs">
                            {formatEnum(tx.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-[var(--text-secondary)]">
                          {tx.sourceAccount?.name || tx.destAccount?.name || '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(tx.amount.toString())}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" size="sm" onClick={loadMoreTransactions} disabled={loadingMore}>
                    {loadingMore ? 'Loading...' : `Load more (${totalTransactions - transactions.length} remaining)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
