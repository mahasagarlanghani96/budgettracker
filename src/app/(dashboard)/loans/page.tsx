'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { FormField } from '@/components/forms/FormField';
import { AdvancedSection } from '@/components/forms/AdvancedSection';
import { useResourceForm } from '@/hooks/useResourceForm';
import { loanSchema } from '@/lib/validations/schemas';
import { formatCurrency, formatDate } from '@/lib/utils';
import { HandCoins, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';

interface Loan {
  id: string;
  direction: 'GIVEN' | 'TAKEN';
  amount: { toString(): string };
  totalRepaid: string;
  remainingAmount: string;
  status: string;
  transactionDate: string;
  dueDate?: string;
  notes?: string;
  person: { id: string; name: string };
  account?: { name: string } | null;
}

const today = new Date().toISOString().split('T')[0];

const initialForm = {
  personId: '',
  direction: 'GIVEN',
  amount: 0,
  accountId: '',
  transactionDate: today,
  dueDate: '',
  interestRate: null as number | null,
  notes: '',
  isPrivate: true,
};

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ direction: '', status: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [persons, setPersons] = useState<Array<{ id: string; name: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);

  const fetchLoans = useCallback(() => {
    const params = new URLSearchParams();
    if (filter.direction) params.set('direction', filter.direction);
    if (filter.status) params.set('status', filter.status);
    setLoading(true);
    fetch(`/api/loans?${params}`)
      .then((r) => r.json())
      .then((res) => setLoans(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  useEffect(() => {
    Promise.all([
      fetch('/api/persons').then((r) => r.json()),
      fetch('/api/accounts').then((r) => r.json()),
    ]).then(([pRes, aRes]) => {
      setPersons(pRes.data || []);
      setAccounts(aRes.data || []);
    });
  }, []);

  const { form, errors, serverError, saving, setField, handleSubmit, reset } = useResourceForm({
    schema: loanSchema,
    initial: initialForm,
    onSubmit: (data) =>
      fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setShowCreate(false);
      reset();
      fetchLoans();
    },
  });

  const totalReceivable = loans.filter((l) => l.direction === 'GIVEN' && l.status === 'ACTIVE').reduce((s, l) => s + parseFloat(l.remainingAmount), 0);
  const totalPayable = loans.filter((l) => l.direction === 'TAKEN' && l.status === 'ACTIVE').reduce((s, l) => s + parseFloat(l.remainingAmount), 0);

  if (loading && loans.length === 0) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loans</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> New Loan</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowUpRight className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Receivable (Given)</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(totalReceivable.toString())}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowDownRight className="h-6 w-6 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Payable (Taken)</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(totalPayable.toString())}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Select
          options={[{ value: '', label: 'All' }, { value: 'GIVEN', label: 'Given' }, { value: 'TAKEN', label: 'Taken' }]}
          value={filter.direction}
          onChange={(e) => setFilter({ ...filter, direction: e.target.value })}
          className="w-40"
        />
        <Select
          options={[{ value: '', label: 'All Status' }, { value: 'ACTIVE', label: 'Active' }, { value: 'SETTLED', label: 'Settled' }]}
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="w-40"
        />
      </div>

      {loans.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-12 w-12" />}
          title="No loans found"
          description="Track loans given and taken with ease"
          action={<Button onClick={() => setShowCreate(true)}>Add Loan</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loans.map((loan) => (
            <Link key={loan.id} href={`/loans/${loan.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{loan.person.name}</CardTitle>
                    <div className="flex gap-1">
                      <Badge variant={loan.direction === 'GIVEN' ? 'success' : 'warning'} className="text-xs">
                        {loan.direction}
                      </Badge>
                      <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                        {loan.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium tabular-nums">{formatCurrency(loan.amount.toString())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Repaid</span>
                    <span className="font-medium tabular-nums">{formatCurrency(loan.totalRepaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-bold tabular-nums text-primary">{formatCurrency(loan.remainingAmount)}</span>
                  </div>
                  {loan.notes && <p className="text-xs text-muted-foreground truncate">{loan.notes}</p>}
                  <p className="text-xs text-muted-foreground">{formatDate(loan.transactionDate)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Loan Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Person" required error={errors.personId}>
              <Select
                options={persons.map((p) => ({ value: p.id, label: p.name }))}
                value={form.personId as string}
                onChange={(e) => setField('personId', e.target.value)}
                placeholder="Select person"
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Direction" required error={errors.direction}>
                <Select
                  options={[{ value: 'GIVEN', label: 'Given (You lent)' }, { value: 'TAKEN', label: 'Taken (You borrowed)' }]}
                  value={form.direction as string}
                  onChange={(e) => setField('direction', e.target.value)}
                />
              </FormField>
              <FormField label="Amount" required error={errors.amount}>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount as number || ''}
                  onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
                />
              </FormField>
            </div>

            <FormField label="Account" required error={errors.accountId}>
              <Select
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                value={form.accountId as string}
                onChange={(e) => setField('accountId', e.target.value)}
                placeholder="Select account"
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Date" required error={errors.transactionDate}>
                <Input
                  type="date"
                  value={form.transactionDate as string}
                  onChange={(e) => setField('transactionDate', e.target.value)}
                />
              </FormField>
              <FormField label="Due Date" error={errors.dueDate}>
                <Input
                  type="date"
                  value={(form.dueDate as string) || ''}
                  onChange={(e) => setField('dueDate', e.target.value || null)}
                />
              </FormField>
            </div>

            <FormField label="Interest Rate (%)" error={errors.interestRate}>
              <Input
                type="number"
                step="0.01"
                value={form.interestRate != null ? (form.interestRate as number) : ''}
                onChange={(e) => setField('interestRate', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Optional"
              />
            </FormField>

            <FormField label="Notes" error={errors.notes}>
              <Textarea
                value={(form.notes as string) || ''}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            <AdvancedSection>
              <FormField label="Private">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isPrivate as boolean}
                    onChange={(e) => setField('isPrivate', e.target.checked)}
                  />
                  Keep this loan private
                </label>
              </FormField>
            </AdvancedSection>

            {serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Loan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
