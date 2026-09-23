'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageLoading } from '@/components/ui/loading';
import { FormField } from '@/components/forms/FormField';
import { AdvancedSection } from '@/components/forms/AdvancedSection';
import { useResourceForm } from '@/hooks/useResourceForm';
import { transactionSchema } from '@/lib/validations/schemas';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const transactionTypes = [
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'OTHER', label: 'Other' },
];

// Only plain ledger entries can be edited here.
const EDITABLE_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER', 'OTHER'];

const emptyForm = {
  type: 'EXPENSE',
  amount: '',
  sourceAccountId: '',
  destAccountId: '',
  categoryId: '',
  personId: '',
  description: '',
  transactionDate: new Date().toISOString().split('T')[0],
  notes: '',
  transactionTime: '',
  taxAmount: '',
  taxPercent: '',
  expectedAmount: '',
  isPrivate: true,
};

export default function EditTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [persons, setPersons] = useState<Array<{ id: string; name: string }>>([]);
  const [transaction, setTransaction] = useState<Record<string, unknown> | null>(null);

  const { form, errors, serverError, saving, setField, handleSubmit, reset } = useResourceForm({
    schema: transactionSchema,
    initial: emptyForm,
    onSubmit: (data) => {
      const payload = { ...data };
      if (!payload.destAccountId) delete payload.destAccountId;
      if (!payload.categoryId) delete payload.categoryId;
      if (!payload.personId) delete payload.personId;
      if (!payload.transactionTime) delete payload.transactionTime;
      if (!payload.taxAmount) delete payload.taxAmount;
      if (!payload.taxPercent) delete payload.taxPercent;
      if (!payload.expectedAmount) delete payload.expectedAmount;
      return fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => router.push('/transactions'),
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/transactions/${id}`).then((r) => r.json()),
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/persons').then((r) => r.json()),
    ]).then(([txRes, accRes, catRes, perRes]) => {
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
      setPersons(perRes.data || []);
      const tx = txRes.data;
      setTransaction(tx);
      if (tx) {
        reset({
          type: tx.type,
          amount: tx.amount,
          sourceAccountId: tx.sourceAccountId || '',
          destAccountId: tx.destAccountId || '',
          categoryId: tx.categoryId || '',
          personId: tx.personId || '',
          description: tx.description || '',
          transactionDate: (tx.transactionDate as string).split('T')[0],
          notes: tx.notes || '',
          transactionTime: tx.transactionTime || '',
          taxAmount: tx.taxAmount ?? '',
          taxPercent: tx.taxPercent ?? '',
          expectedAmount: tx.expectedAmount ?? '',
          isPrivate: tx.isPrivate ?? true,
        });
      }
    }).finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCategories = categories.filter(
    (c) => (form.type as string) === 'TRANSFER' || c.type === ((form.type as string) === 'INCOME' ? 'INCOME' : 'EXPENSE')
  );

  if (loading) return <PageLoading />;
  if (!transaction) return <div className="text-center py-12 text-muted-foreground">Transaction not found</div>;

  if (!EDITABLE_TYPES.includes(transaction.type as string)) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/transactions">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">Edit Transaction</h1>
        </div>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            This transaction was created automatically as part of a Loan, Committee,
            Savings, Investment, or Plot record, so it can&rsquo;t be edited directly here —
            doing so would leave that record out of sync. Edit it from the resource it
            belongs to instead.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Transaction</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Type" required error={errors.type}>
                <Select
                  options={transactionTypes}
                  value={form.type as string}
                  onChange={(e) => { setField('type', e.target.value); setField('categoryId', ''); }}
                />
              </FormField>

              <FormField label="Amount" required error={errors.amount}>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount as string | number}
                  onChange={(e) => setField('amount', e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="0.00"
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={(form.type as string) === 'TRANSFER' ? 'From Account' : 'Account'} required error={errors.sourceAccountId}>
                <Select
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                  value={form.sourceAccountId as string}
                  onChange={(e) => setField('sourceAccountId', e.target.value)}
                  placeholder="Select account"
                />
              </FormField>

              {(form.type as string) === 'TRANSFER' ? (
                <FormField label="To Account" error={errors.destAccountId}>
                  <Select
                    options={accounts
                      .filter((a) => a.id !== (form.sourceAccountId as string))
                      .map((a) => ({ value: a.id, label: a.name }))}
                    value={form.destAccountId as string}
                    onChange={(e) => setField('destAccountId', e.target.value)}
                    placeholder="Select destination"
                  />
                </FormField>
              ) : (
                <FormField label="Category" error={errors.categoryId}>
                  <Select
                    options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
                    value={form.categoryId as string}
                    onChange={(e) => setField('categoryId', e.target.value)}
                    placeholder="Select category"
                  />
                </FormField>
              )}
            </div>

            <FormField label="Person" error={errors.personId}>
              <Select
                options={persons.map((p) => ({ value: p.id, label: p.name }))}
                value={form.personId as string}
                onChange={(e) => setField('personId', e.target.value)}
                placeholder="Select person (optional)"
              />
            </FormField>

            <FormField label="Description" error={errors.description}>
              <Input
                value={form.description as string}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="What was this for?"
              />
            </FormField>

            <FormField label="Date" required error={errors.transactionDate}>
              <Input
                type="date"
                value={form.transactionDate as string}
                onChange={(e) => setField('transactionDate', e.target.value)}
              />
            </FormField>

            <FormField label="Notes" error={errors.notes}>
              <Textarea
                value={form.notes as string}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Additional notes..."
              />
            </FormField>

            <AdvancedSection>
              <FormField label="Transaction Time" error={errors.transactionTime}>
                <Input
                  type="time"
                  value={form.transactionTime as string}
                  onChange={(e) => setField('transactionTime', e.target.value)}
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Tax Amount" error={errors.taxAmount}>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.taxAmount as string | number}
                    onChange={(e) => setField('taxAmount', e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="0.00"
                  />
                </FormField>

                <FormField label="Tax Percent" error={errors.taxPercent}>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.taxPercent as string | number}
                    onChange={(e) => setField('taxPercent', e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="0.00"
                  />
                </FormField>
              </div>

              <FormField label="Expected Amount" error={errors.expectedAmount}>
                <Input
                  type="number"
                  step="0.01"
                  value={form.expectedAmount as string | number}
                  onChange={(e) => setField('expectedAmount', e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="0.00"
                />
              </FormField>

              <FormField label="Private" error={errors.isPrivate}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isPrivate as boolean}
                    onChange={(e) => setField('isPrivate', e.target.checked)}
                  />
                  Mark as private
                </label>
              </FormField>
            </AdvancedSection>

            {serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{serverError}</p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <Link href="/transactions">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
