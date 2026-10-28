'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { ListPagination } from '@/components/shared/list-pagination';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Tags } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  type: string;
  amount: string;
  description?: string;
  notes?: string;
  transactionDate: string;
  sourceAccount?: { name: string } | null;
  destAccount?: { name: string } | null;
  person?: { name: string } | null;
}

interface CategoryDetail {
  id: string;
  name: string;
  group: 'INCOME' | 'EXPENSE';
  icon?: string | null;
  isSystem: boolean;
  isActive: boolean;
  transactions: Transaction[];
  totalTransactions: number;
  totalAmount: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchCategory = useCallback(() => {
    setLoading(true);
    fetch(`/api/categories/${id}?page=${page}&limit=${pageSize}`)
      .then((r) => r.json())
      .then((res) => setCategory(res.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, page, pageSize]);

  useEffect(() => { fetchCategory(); }, [fetchCategory]);

  if (loading) return <PageLoading />;
  if (!category) return <div className="text-center py-12 text-[var(--text-secondary)]">Category not found</div>;

  function accountName(tx: Transaction) {
    return tx.sourceAccount?.name || tx.destAccount?.name || '—';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/categories">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">
            {category.icon ? <span className="mr-2">{category.icon}</span> : null}
            {category.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={category.group === 'INCOME' ? 'success' : 'warning'} className="text-xs">
              {category.group === 'INCOME' ? 'Income' : 'Expense'}
            </Badge>
            {category.isSystem && <Badge variant="secondary" className="text-xs">System</Badge>}
            {!category.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[var(--text-secondary)]">Total Transactions</p>
            <p className="text-3xl font-bold tabular-nums">{category.totalTransactions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[var(--text-secondary)]">Total Amount</p>
            <p className="text-3xl font-bold tabular-nums">{formatCurrency(category.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Transactions
            {category.totalTransactions > 0 && (
              <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">
                ({category.totalTransactions})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {category.transactions.length === 0 ? (
            <EmptyState
              icon={<Tags className="h-12 w-12" />}
              title="No transactions"
              description="No transactions have been recorded under this category yet."
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{formatDate(tx.transactionDate)}</TableCell>
                        <TableCell className="text-sm">{tx.description || tx.type}</TableCell>
                        <TableCell className="text-sm">{accountName(tx)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{tx.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {category.transactions.map((tx) => (
                  <div key={tx.id} className="glass rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{tx.description || tx.type}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(tx.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span>{formatDate(tx.transactionDate)}</span>
                      <span>{accountName(tx)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <ListPagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={category.totalTransactions}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
