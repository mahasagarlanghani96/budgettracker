'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'LOAN_GIVEN', label: 'Loan Given' },
  { value: 'LOAN_TAKEN', label: 'Loan Taken' },
  { value: 'LOAN_REPAYMENT_RECEIVED', label: 'Repayment Received' },
  { value: 'LOAN_REPAYMENT_MADE', label: 'Repayment Made' },
];

const typeBadgeVariant: Record<string, 'default' | 'success' | 'destructive' | 'secondary' | 'warning' | 'outline'> = {
  INCOME: 'success',
  EXPENSE: 'destructive',
  TRANSFER: 'secondary',
  LOAN_GIVEN: 'warning',
  LOAN_TAKEN: 'warning',
  LOAN_REPAYMENT_RECEIVED: 'success',
  LOAN_REPAYMENT_MADE: 'destructive',
};

interface Transaction {
  id: string;
  type: string;
  amount: { toString(): string };
  description: string;
  transactionDate: string;
  category?: { name: string } | null;
  sourceAccount?: { name: string } | null;
  destAccount?: { name: string } | null;
  person?: { name: string } | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ type: '', search: '', from: '', to: '' });

  const fetchTransactions = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '25');
    if (filters.type) params.set('type', filters.type);
    if (filters.search) params.set('search', filters.search);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);

    setLoading(true);
    fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((res) => {
        setTransactions(res.data || []);
        setTotalPages(res.pagination?.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Link href="/transactions/new">
          <Button><Plus className="h-4 w-4 mr-2" /> New Transaction</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9"
                value={filters.search}
                onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
              />
            </div>
            <Select
              options={typeOptions}
              value={filters.type}
              onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setPage(1); }}
            />
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => { setFilters({ ...filters, from: e.target.value }); setPage(1); }}
              placeholder="From date"
            />
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => { setFilters({ ...filters, to: e.target.value }); setPage(1); }}
              placeholder="To date"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <PageLoading />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-12 w-12" />}
          title="No transactions found"
          description="Record your first transaction to get started"
          action={<Link href="/transactions/new"><Button>Add Transaction</Button></Link>}
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(tx.transactionDate)}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{tx.description || '—'}</TableCell>
                      <TableCell className="text-sm">{tx.category?.name || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {tx.sourceAccount?.name}
                        {tx.destAccount && <span className="text-muted-foreground"> → {tx.destAccount.name}</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeBadgeVariant[tx.type] || 'outline'} className="text-xs">
                          {tx.type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                        {formatCurrency(tx.amount.toString())}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
