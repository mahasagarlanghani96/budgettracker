'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
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
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', accountType: 'CASH', openingBalance: '0', notes: '' });

  function fetchAccount() {
    fetch(`/api/accounts/${id}`)
      .then((r) => r.json())
      .then((res) => setAccount(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchAccount(); }, [id]);

  function openEdit() {
    if (!account) return;
    setEditForm({
      name: account.name as string,
      accountType: account.accountType as string,
      openingBalance: (account.openingBalance as { toString(): string }).toString(),
      notes: (account.notes as string) || '',
    });
    setShowEdit(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          accountType: editForm.accountType,
          openingBalance: parseFloat(editForm.openingBalance) || 0,
          notes: editForm.notes || undefined,
        }),
      });
      if (res.ok) {
        setShowEdit(false);
        fetchAccount();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update account');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this account?')) return;
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/accounts');
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete');
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
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name *</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type *</label>
              <Select
                options={accountTypeOptions}
                value={editForm.accountType}
                onChange={(e) => setEditForm({ ...editForm, accountType: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Opening Balance</label>
              <Input
                type="number"
                step="0.01"
                value={editForm.openingBalance}
                onChange={(e) => setEditForm({ ...editForm, openingBalance: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
