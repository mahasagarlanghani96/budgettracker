'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { FormField } from '@/components/forms/FormField';
import { AdvancedSection } from '@/components/forms/AdvancedSection';
import { useResourceForm } from '@/hooks/useResourceForm';
import { accountUpdateSchema } from '@/lib/validations/schemas';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

const accountTypeOptions = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank Account' },
  { value: 'WALLET', label: 'Digital Wallet' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'SAVINGS_ACCOUNT', label: 'Savings Account' },
  { value: 'OTHER', label: 'Other' },
];

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [account, setAccount] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchAccount = useCallback(() => {
    fetch(`/api/accounts/${id}`)
      .then((r) => r.json())
      .then((res) => setAccount(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchAccount(); }, [fetchAccount]);

  const editForm = useResourceForm({
    schema: accountUpdateSchema,
    initial: {
      name: '',
      accountType: 'CASH',
      openingBalance: 0,
      openingDate: '',
      notes: '',
      currency: 'PKR',
      isShared: false,
      isActive: true,
    },
    onSubmit: (data) =>
      fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setShowEdit(false);
      fetchAccount();
    },
  });

  function openEdit() {
    if (!account) return;
    editForm.setForm({
      name: account.name as string,
      accountType: account.accountType as string,
      openingBalance: parseFloat((account.openingBalance as { toString(): string }).toString()) || 0,
      openingDate: account.openingDate ? (account.openingDate as string).split('T')[0] : '',
      notes: (account.notes as string) || '',
      currency: (account.currency as string) || 'PKR',
      isShared: (account.isShared as boolean) || false,
      isActive: (account.isActive as boolean) ?? true,
    });
    setShowEdit(true);
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this account?')) return;
    setDeleteError(null);
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/accounts');
    } else {
      const data = await res.json();
      setDeleteError(data.error || 'Failed to delete');
    }
  }

  if (loading) return <PageLoading />;
  if (!account) return <div className="text-center py-12 text-muted-foreground">Account not found</div>;

  const transactions = (account.recentTransactions || []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/accounts">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{account.name as string}</h1>
          <p className="text-muted-foreground">{(account.accountType as string).replace('_', ' ')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Pencil className="h-4 w-4 mr-1" /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
      </div>

      {deleteError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{deleteError}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold tabular-nums">{formatCurrency(account.currentBalance as string)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Opening Balance</p>
            <p className="text-3xl font-bold tabular-nums">{formatCurrency((account.openingBalance as { toString(): string }).toString())}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions for this account</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id as string}>
                    <TableCell className="text-sm">{formatDate(tx.transactionDate as string)}</TableCell>
                    <TableCell className="text-sm">{(tx.description as string) || (tx.type as string)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{tx.type as string}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency((tx.amount as { toString(): string }).toString())}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit} className="space-y-4">
            <FormField label="Account Name" required error={editForm.errors.name}>
              <Input
                value={editForm.form.name as string}
                onChange={(e) => editForm.setField('name', e.target.value)}
              />
            </FormField>

            <FormField label="Type" required error={editForm.errors.accountType}>
              <Select
                options={accountTypeOptions}
                value={editForm.form.accountType as string}
                onChange={(e) => editForm.setField('accountType', e.target.value)}
              />
            </FormField>

            <FormField label="Opening Balance" required error={editForm.errors.openingBalance}>
              <Input
                type="number"
                step="0.01"
                value={editForm.form.openingBalance as number}
                onChange={(e) => editForm.setField('openingBalance', parseFloat(e.target.value) || 0)}
              />
            </FormField>

            <FormField label="Opening Date" error={editForm.errors.openingDate}>
              <Input
                type="date"
                value={editForm.form.openingDate as string}
                onChange={(e) => editForm.setField('openingDate', e.target.value)}
              />
            </FormField>

            <FormField label="Notes" error={editForm.errors.notes}>
              <Textarea
                value={editForm.form.notes as string}
                onChange={(e) => editForm.setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            <FormField label="Active">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.form.isActive as boolean}
                  onChange={(e) => editForm.setField('isActive', e.target.checked)}
                />
                Account is active
              </label>
            </FormField>

            <AdvancedSection>
              <FormField label="Currency" error={editForm.errors.currency}>
                <Input
                  value={editForm.form.currency as string}
                  onChange={(e) => editForm.setField('currency', e.target.value)}
                />
              </FormField>

              <FormField label="Shared Account">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editForm.form.isShared as boolean}
                    onChange={(e) => editForm.setField('isShared', e.target.checked)}
                  />
                  Allow other users to see this account
                </label>
              </FormField>
            </AdvancedSection>

            {editForm.serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editForm.serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={editForm.saving}>{editForm.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
