'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import { Plus, Wallet, Landmark, CreditCard, PiggyBank } from 'lucide-react';
import Link from 'next/link';

const accountTypeOptions = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank Account' },
  { value: 'WALLET', label: 'Digital Wallet' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'SAVINGS_ACCOUNT', label: 'Savings Account' },
  { value: 'OTHER', label: 'Other' },
];

const typeIcons: Record<string, React.ReactNode> = {
  CASH: <Wallet className="h-5 w-5" />,
  BANK: <Landmark className="h-5 w-5" />,
  CREDIT_CARD: <CreditCard className="h-5 w-5" />,
  SAVINGS_ACCOUNT: <PiggyBank className="h-5 w-5" />,
  WALLET: <Wallet className="h-5 w-5" />,
  OTHER: <Wallet className="h-5 w-5" />,
};

interface Account {
  id: string;
  name: string;
  accountType: string;
  bankName?: string | null;
  accountNumber?: string | null;
  openingBalance: { toString(): string };
  currentBalance: string;
  isActive: boolean;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '', accountType: 'CASH', bankName: '', accountNumber: '', openingBalance: '0',
  });

  function fetchAccounts() {
    fetch('/api/accounts')
      .then((r) => r.json())
      .then((res) => setAccounts(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchAccounts(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          accountType: form.accountType,
          openingBalance: parseFloat(form.openingBalance) || 0,
          notes: [form.bankName, form.accountNumber].filter(Boolean).join(' — ') || undefined,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ name: '', accountType: 'CASH', bankName: '', accountNumber: '', openingBalance: '0' });
        fetchAccounts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <PageLoading />;

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.currentBalance || '0'), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">Total: {formatCurrency(totalBalance.toString())}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-12 w-12" />}
          title="No accounts yet"
          description="Create your first account to start tracking finances"
          action={<Button onClick={() => setShowCreate(true)}>Create Account</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Link key={account.id} href={`/accounts/${account.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {typeIcons[account.accountType] || typeIcons.OTHER}
                      </div>
                      <div>
                        <CardTitle className="text-base">{account.name}</CardTitle>
                        {account.bankName && (
                          <p className="text-xs text-muted-foreground">{account.bankName}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {account.accountType.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatCurrency(account.currentBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Opening: {formatCurrency(account.openingBalance.toString())}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Account Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Cash Wallet, Meezan Bank"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type *</label>
              <Select
                options={accountTypeOptions}
                value={form.accountType}
                onChange={(e) => setForm({ ...form, accountType: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank Name</label>
              <Input
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Number</label>
              <Input
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Opening Balance</label>
              <Input
                type="number"
                step="0.01"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Account'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
