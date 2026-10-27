'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, ArrowLeftRight, Pencil, Trash2, Lock, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useConfirm } from '@/hooks/use-confirm';
import { ListPagination } from '@/components/shared/list-pagination';

// Editable types: plain ledger entries + committee/plot types (the API now
// syncs the linked module record on edit/delete).  Loan/Savings/Investment
// remain locked — edit those from their respective module pages.
const EDITABLE_TYPES = [
  'INCOME', 'EXPENSE', 'TRANSFER', 'OTHER',
  'COMMITTEE_CONTRIBUTION', 'COMMITTEE_RECEIVING', 'PLOT_PAYMENT',
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'LOAN_GIVEN', label: 'Loan Given' },
  { value: 'LOAN_TAKEN', label: 'Loan Taken' },
  { value: 'LOAN_REPAYMENT_RECEIVED', label: 'Repayment Received' },
  { value: 'LOAN_REPAYMENT_MADE', label: 'Repayment Made' },
  { value: 'SAVINGS_DEPOSIT', label: 'Savings Deposit' },
  { value: 'SAVINGS_WITHDRAWAL', label: 'Savings Withdrawal' },
  { value: 'INVESTMENT', label: 'Investment' },
  { value: 'INVESTMENT_RETURN', label: 'Investment Return' },
  { value: 'COMMITTEE_CONTRIBUTION', label: 'Committee Contribution' },
  { value: 'COMMITTEE_RECEIVING', label: 'Committee Receiving' },
  { value: 'PLOT_PAYMENT', label: 'Plot Payment' },
];

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

interface Transaction {
  id: string;
  type: string;
  amount: { toString(): string };
  description: string;
  transactionDate: string;
  isHistorical?: boolean;
  category?: { name: string } | null;
  sourceAccount?: { name: string } | null;
  destAccount?: { name: string } | null;
  person?: { name: string } | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({ type: '', search: '', from: '', to: '', accountId: '' });
  const [searchInput, setSearchInput] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const [accounts, setAccounts] = useState<Array<{ value: string; label: string }>>([{ value: '', label: 'All Accounts' }]);

  useEffect(() => {
    fetch('/api/accounts')
      .then((r) => r.json())
      .then((res) => {
        const list = (res.data || []).map((a: { id: string; name: string }) => ({ value: a.id, label: a.name }));
        setAccounts([{ value: '', label: 'All Accounts' }, ...list]);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  const fetchTransactions = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (pageSize === 0) {
      params.set('limit', '10000');
    } else {
      params.set('limit', pageSize.toString());
    }
    if (filters.type) params.set('type', filters.type);
    if (filters.search) params.set('search', filters.search);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.accountId) params.set('accountId', filters.accountId);

    setLoading(true);
    fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((res) => {
        setTransactions(res.data || []);
        setTotalItems(res.pagination?.total || res.data?.length || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, pageSize, filters]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  async function handleDelete(tx: Transaction) {
    if (!(await confirm('Delete this transaction? This cannot be undone.'))) return;
    setDeleteError(null);
    const res = await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchTransactions();
    } else {
      const data = await res.json();
      setDeleteError(data.error || 'Failed to delete transaction');
    }
  }

  return (
    <div className="space-y-6">
      {ConfirmDialog}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">Transactions</h1>
        <Link href="/transactions/new">
          <Button size="sm" className="sm:size-default"><Plus className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">New Transaction</span></Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <Input
                placeholder="Search..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)]" onClick={() => setSearchInput('')}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select
              options={typeOptions}
              value={filters.type}
              onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setPage(1); }}
            />
            <Select
              options={accounts}
              value={filters.accountId}
              onChange={(e) => { setFilters({ ...filters, accountId: e.target.value }); setPage(1); }}
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
          {(filters.type || filters.search || filters.from || filters.to || filters.accountId) && (
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => { setFilters({ type: '', search: '', from: '', to: '', accountId: '' }); setSearchInput(''); setPage(1); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {deleteError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {deleteError}
        </div>
      )}

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
              {/* Mobile card view */}
              <div className="divide-y md:hidden">
                {transactions.map((tx) => {
                  const editable = EDITABLE_TYPES.includes(tx.type);
                  return (
                    <div key={tx.id} className={`p-4 space-y-2 ${tx.isHistorical ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{tx.description || '—'}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{formatDate(tx.transactionDate)} · {tx.sourceAccount?.name}{tx.destAccount && ` → ${tx.destAccount.name}`}</p>
                        </div>
                        <span className="text-sm font-medium tabular-nums whitespace-nowrap">
                          {formatCurrency(tx.amount.toString())}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={typeBadgeVariant[tx.type] || 'outline'} className="text-xs">
                            {tx.type.replace(/_/g, ' ')}
                          </Badge>
                          {tx.category?.name && <span className="text-xs text-[var(--text-secondary)]">{tx.category.name}</span>}
                        </div>
                        {editable ? (
                          <div className="flex gap-1">
                            <Link href={`/transactions/${tx.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                            </Link>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(tx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        ) : (
                          <span title="Linked record — edit from module page" className="text-[var(--text-secondary)]">
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden lg:table-cell">Category</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const editable = EDITABLE_TYPES.includes(tx.type);
                    return (
                      <TableRow key={tx.id} className={tx.isHistorical ? 'opacity-50' : ''}>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(tx.transactionDate)}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{tx.description || '—'}</TableCell>
                        <TableCell className="text-sm hidden lg:table-cell">{tx.category?.name || '—'}</TableCell>
                        <TableCell className="text-sm">
                          {tx.sourceAccount?.name}
                          {tx.destAccount && <span className="text-[var(--text-secondary)]"> → {tx.destAccount.name}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeBadgeVariant[tx.type] || 'outline'} className="text-xs">
                            {tx.type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                          {formatCurrency(tx.amount.toString())}
                        </TableCell>
                        <TableCell className="text-right">
                          {editable ? (
                            <div className="flex justify-end gap-1">
                              <Link href={`/transactions/${tx.id}/edit`}>
                                <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                              </Link>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(tx)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ) : (
                            <span title="Linked to a Loan/Savings/Investment record — edit from there" className="inline-flex justify-end text-[var(--text-secondary)]">
                              <Lock className="h-4 w-4" />
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          <ListPagination
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}
