'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { FormField } from '@/components/forms/FormField';
import { AdvancedSection } from '@/components/forms/AdvancedSection';
import { useResourceForm } from '@/hooks/useResourceForm';
import { accountSchema } from '@/lib/validations/schemas';
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

const today = new Date().toISOString().split('T')[0];

const initialForm = {
  name: '',
  accountType: 'CASH',
  openingBalance: 0,
  openingDate: today,
  notes: '',
  currency: 'PKR',
  isShared: false,
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAccounts = useCallback(() => {
    fetch('/api/accounts')
      .then((r) => r.json())
      .then((res) => setAccounts(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const { form, errors, serverError, saving, setField, handleSubmit, reset } = useResourceForm({
    schema: accountSchema,
    initial: initialForm,
    onSubmit: (data) =>
      fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setShowCreate(false);
      reset();
      fetchAccounts();
    },
  });

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Account Name" required error={errors.name}>
              <Input
                value={form.name as string}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g., Cash Wallet, Meezan Bank"
              />
            </FormField>

            <FormField label="Type" required error={errors.accountType}>
              <Select
                options={accountTypeOptions}
                value={form.accountType as string}
                onChange={(e) => setField('accountType', e.target.value)}
              />
            </FormField>

            <FormField label="Opening Balance" required error={errors.openingBalance}>
              <Input
                type="number"
                step="0.01"
                value={form.openingBalance as number}
                onChange={(e) => setField('openingBalance', parseFloat(e.target.value) || 0)}
              />
            </FormField>

            <FormField label="Opening Date" error={errors.openingDate}>
              <Input
                type="date"
                value={form.openingDate as string}
                onChange={(e) => setField('openingDate', e.target.value)}
              />
            </FormField>

            <FormField label="Notes" error={errors.notes}>
              <Textarea
                value={form.notes as string}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            <AdvancedSection>
              <FormField label="Currency" error={errors.currency}>
                <Input
                  value={form.currency as string}
                  onChange={(e) => setField('currency', e.target.value)}
                />
              </FormField>

              <FormField label="Shared Account">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isShared as boolean}
                    onChange={(e) => setField('isShared', e.target.checked)}
                  />
                  Allow other users to see this account
                </label>
              </FormField>
            </AdvancedSection>

            {serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Account'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
