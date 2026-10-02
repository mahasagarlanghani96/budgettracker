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
import { AttachmentSection } from '@/components/attachments/AttachmentSection';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const transactionTypes = [
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'COMMITTEE_CONTRIBUTION', label: 'Committee Contribution' },
  { value: 'COMMITTEE_RECEIVING', label: 'Committee Receiving' },
  { value: 'PLOT_PAYMENT', label: 'Plot Payment' },
  { value: 'OTHER', label: 'Other' },
];

const LINKED_TYPES = [
  'COMMITTEE_CONTRIBUTION', 'COMMITTEE_RECEIVING', 'PLOT_PAYMENT',
  'LOAN_GIVEN', 'LOAN_TAKEN', 'LOAN_REPAYMENT_RECEIVED', 'LOAN_REPAYMENT_MADE',
  'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL', 'INVESTMENT', 'INVESTMENT_RETURN',
];

const COMMITTEE_TYPES = ['COMMITTEE_CONTRIBUTION', 'COMMITTEE_RECEIVING'];
const EDITABLE_LINKED = ['COMMITTEE_CONTRIBUTION', 'COMMITTEE_RECEIVING', 'PLOT_PAYMENT'];

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

interface LinkedInfo {
  committeeName?: string;
  entrySlot?: number;
  roundNumber?: number;
  plotName?: string;
}

export default function EditTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; group: string }>>([]);
  const [persons, setPersons] = useState<Array<{ id: string; name: string }>>([]);
  const [transaction, setTransaction] = useState<Record<string, unknown> | null>(null);
  const [linkedInfo, setLinkedInfo] = useState<LinkedInfo>({});
  const [profitDeduction, setProfitDeduction] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { form, errors, serverError, saving, setField, handleSubmit, reset } = useResourceForm({
    schema: transactionSchema,
    initial: emptyForm,
    onSubmit: (data) => {
      const payload: Record<string, unknown> = { ...data };
      if (!payload.destAccountId) delete payload.destAccountId;
      if (!payload.categoryId) delete payload.categoryId;
      if (!payload.personId) delete payload.personId;
      if (!payload.transactionTime) delete payload.transactionTime;
      if (!payload.taxAmount) delete payload.taxAmount;
      if (!payload.taxPercent) delete payload.taxPercent;
      if (!payload.expectedAmount) delete payload.expectedAmount;

      if ((data.type as string) === 'INCOME') {
        payload.destAccountId = data.sourceAccountId;
        delete payload.sourceAccountId;
      }
      if ((data.type as string) === 'COMMITTEE_CONTRIBUTION' && profitDeduction) {
        payload.profitDeduction = parseFloat(profitDeduction);
      }
      if ((data.type as string) === 'COMMITTEE_RECEIVING') {
        payload.destAccountId = data.sourceAccountId;
        delete payload.sourceAccountId;
      }
      if ((data.type as string) === 'PLOT_PAYMENT' && dueDate) {
        payload.dueDate = dueDate;
      }

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
        const accountId = tx.sourceAccountId || tx.destAccountId || '';
        reset({
          type: tx.type,
          amount: tx.amount,
          sourceAccountId: accountId,
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

        // Extract linked info for display
        const info: LinkedInfo = {};
        if (tx.committeeContrib) {
          info.committeeName = tx.committeeContrib.committee?.name;
          info.entrySlot = tx.committeeContrib.entry?.slotNumber;
          setProfitDeduction(tx.committeeContrib.profitDeduction?.toString() || '');
        }
        if (tx.committeeRecv) {
          info.committeeName = tx.committeeRecv.committee?.name;
          info.entrySlot = tx.committeeRecv.entry?.slotNumber;
        }
        if (tx.plotPayment) {
          info.plotName = tx.plotPayment.plot?.name;
          setDueDate(tx.plotPayment.dueDate ? (tx.plotPayment.dueDate as string).split('T')[0] : '');
        }
        setLinkedInfo(info);
      }
    }).finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const txType = (transaction?.type as string) || '';
  const isLinked = LINKED_TYPES.includes(txType);
  const isEditableLinked = EDITABLE_LINKED.includes(txType);
  const isCommittee = COMMITTEE_TYPES.includes(txType);
  const isPlot = txType === 'PLOT_PAYMENT';
  const isTransfer = (form.type as string) === 'TRANSFER';

  const filteredCategories = categories.filter(
    (c) => isTransfer || c.group === ((form.type as string) === 'INCOME' ? 'INCOME' : 'EXPENSE')
  );

  if (loading) return <PageLoading />;
  if (!transaction) return <div className="text-center py-12 text-muted-foreground">Transaction not found</div>;

  // Loan/Savings/Investment types still can't be edited here
  if (isLinked && !isEditableLinked) {
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
            This transaction was created automatically as part of a Loan, Savings, or
            Investment record, so it can&rsquo;t be edited directly here &mdash; doing so
            would leave that record out of sync. Edit it from the resource it belongs to
            instead.
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

      {/* Show linked resource info */}
      {(isCommittee || isPlot) && (
        <Card>
          <CardContent className="pt-4 pb-3 text-sm text-muted-foreground">
            {isCommittee && (
              <p>Linked to committee <span className="font-medium text-foreground">{linkedInfo.committeeName}</span>
                {linkedInfo.entrySlot != null && <>, Slot #{linkedInfo.entrySlot}</>}
              </p>
            )}
            {isPlot && (
              <p>Linked to plot <span className="font-medium text-foreground">{linkedInfo.plotName}</span></p>
            )}
            <p className="text-xs mt-1">Changes here will also update the linked record.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Type" required error={errors.type}>
                {isEditableLinked ? (
                  // Type is locked for linked transactions
                  <Input value={transactionTypes.find(t => t.value === form.type)?.label || (form.type as string)} disabled />
                ) : (
                  <Select
                    options={transactionTypes}
                    value={form.type as string}
                    onChange={(e) => { setField('type', e.target.value); setField('categoryId', ''); }}
                  />
                )}
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

            {/* Committee-specific: profit deduction */}
            {txType === 'COMMITTEE_CONTRIBUTION' && (
              <FormField label="Profit Deduction">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={profitDeduction}
                  onChange={(e) => setProfitDeduction(e.target.value)}
                  placeholder="0.00"
                />
              </FormField>
            )}

            {/* Plot-specific: due date */}
            {isPlot && (
              <FormField label="Due Date">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </FormField>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={isTransfer ? 'From Account' : (txType === 'INCOME' || txType === 'COMMITTEE_RECEIVING') ? 'Into Account' : 'Account'}
                required
                error={errors.sourceAccountId}
              >
                <Select
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                  value={form.sourceAccountId as string}
                  onChange={(e) => setField('sourceAccountId', e.target.value)}
                  placeholder="Select account"
                />
              </FormField>

              {isTransfer ? (
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
              ) : !isCommittee && !isPlot ? (
                <FormField label="Category" error={errors.categoryId}>
                  <Select
                    options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
                    value={form.categoryId as string}
                    onChange={(e) => setField('categoryId', e.target.value)}
                    placeholder="Select category"
                  />
                </FormField>
              ) : null}
            </div>

            {!isCommittee && !isPlot && (
              <FormField label="Person" error={errors.personId}>
                <Select
                  options={persons.map((p) => ({ value: p.id, label: p.name }))}
                  value={form.personId as string}
                  onChange={(e) => setField('personId', e.target.value)}
                  placeholder="Select person (optional)"
                />
              </FormField>
            )}

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

      <AttachmentSection transactionId={id} />
    </div>
  );
}
