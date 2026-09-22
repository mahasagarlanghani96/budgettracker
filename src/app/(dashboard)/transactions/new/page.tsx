'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const transactionTypes = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'TRANSFER', label: 'Transfer' },
];

export default function NewTransactionPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'EXPENSE',
    sourceAccountId: '',
    destAccountId: '',
    categoryId: '',
    amount: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ]).then(([accRes, catRes]) => {
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
      if (accRes.data?.[0]) {
        setForm((f) => ({ ...f, sourceAccountId: accRes.data[0].id }));
      }
    });
  }, []);

  const filteredCategories = categories.filter(
    (c) => form.type === 'TRANSFER' || c.type === (form.type === 'INCOME' ? 'INCOME' : 'EXPENSE')
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        sourceAccountId: form.sourceAccountId,
        amount: parseFloat(form.amount),
        description: form.description,
        transactionDate: form.transactionDate,
        notes: form.notes || undefined,
      };

      if (form.type !== 'TRANSFER' && form.categoryId) {
        payload.categoryId = form.categoryId;
      }
      if (form.type === 'TRANSFER' && form.destAccountId) {
        payload.destAccountId = form.destAccountId;
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push('/transactions');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create transaction');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">New Transaction</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type *</label>
                <Select
                  options={transactionTypes}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value, categoryId: '' })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {form.type === 'TRANSFER' ? 'From Account' : 'Account'} *
                </label>
                <Select
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                  value={form.sourceAccountId}
                  onChange={(e) => setForm({ ...form, sourceAccountId: e.target.value })}
                  placeholder="Select account"
                />
              </div>

              {form.type === 'TRANSFER' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Account *</label>
                  <Select
                    options={accounts
                      .filter((a) => a.id !== form.sourceAccountId)
                      .map((a) => ({ value: a.id, label: a.name }))}
                    value={form.destAccountId}
                    onChange={(e) => setForm({ ...form, destAccountId: e.target.value })}
                    placeholder="Select destination"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    placeholder="Select category"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What was this for?"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <Input
                  type="date"
                  value={form.transactionDate}
                  onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Link href="/transactions">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Transaction'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
