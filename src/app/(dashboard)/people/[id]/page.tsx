'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/ui/loading';
import { formatCurrency, formatDate } from '@/lib/utils';
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
  if (!data) return <div className="text-center py-12 text-muted-foreground">Person not found</div>;

  const hasMore = transactions.length < totalTransactions;
  const s = data.summary;
  const ls = data.loanSummary;
  const net = parseFloat(s.net);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/people">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{data.name}</h1>
            <Badge variant={data.isActive ? 'success' : 'secondary'} className="text-xs">
              {data.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground mt-1">
            {data.relationship && <span>{data.relationship}</span>}
            {data.phone && <span>{data.phone}</span>}
            {data.email && <span>{data.email}</span>}
          </div>
        </div>
      </div>

      {data.notes && (
        <p className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">{data.notes}</p>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold tabular-nums">{s.totalTransactions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowDownRight className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total Inflow</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(s.totalInflow)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total Outflow</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(s.totalOutflow)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={`text-xl font-bold tabular-nums ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
                <div key={t.type} className="flex items-center justify-between px-3 py-2 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <Badge variant={typeBadgeVariant[t.type] || 'outline'} className="text-xs">
                      {t.type.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">&times;{t.count}</span>
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
              <div className="px-3 py-2 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">Given to {data.name}</p>
                <p className="font-bold tabular-nums">{formatCurrency(ls.totalGiven)}</p>
                {parseFloat(ls.outstandingGiven) > 0 && (
                  <p className="text-xs text-orange-600">Outstanding: {formatCurrency(ls.outstandingGiven)}</p>
                )}
              </div>
              <div className="px-3 py-2 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">Taken from {data.name}</p>
                <p className="font-bold tabular-nums">{formatCurrency(ls.totalTaken)}</p>
                {parseFloat(ls.outstandingTaken) > 0 && (
                  <p className="text-xs text-orange-600">Outstanding: {formatCurrency(ls.outstandingTaken)}</p>
                )}
              </div>
            </div>
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
                          {loan.direction}
                        </Badge>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(loan.transactionDate)}</TableCell>
                    <TableCell className="text-sm">{loan.account.name}</TableCell>
                    <TableCell>
                      <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                        {loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{loan._count.repayments}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(loan.amount.toString())}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(loan.remainingAmount.toString())}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                    <TableCell className="text-sm">{m.committee.type}</TableCell>
                    <TableCell>
                      <Badge variant={m.committee.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs">
                        {m.committee.status}
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
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Transaction History
            {totalTransactions > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({transactions.length} of {totalTransactions})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions with this person</p>
          ) : (
            <>
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
                          {tx.type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.sourceAccount?.name || tx.destAccount?.name || '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(tx.amount.toString())}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
