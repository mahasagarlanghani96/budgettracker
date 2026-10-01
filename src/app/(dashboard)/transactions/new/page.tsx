'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  { value: 'COMMITTEE_CONTRIBUTION', label: 'Committee Contribution' },
  { value: 'COMMITTEE_RECEIVING', label: 'Committee Receiving' },
  { value: 'PLOT_PAYMENT', label: 'Plot Payment' },
  { value: 'OTHER', label: 'Other' },
];

const COMMITTEE_TYPES = ['COMMITTEE_CONTRIBUTION', 'COMMITTEE_RECEIVING'];

interface CommitteeOption {
  id: string;
  name: string;
  type: string;
  entries: { id: string; slotNumber: number; userId: string }[];
  rounds: { id: string; roundNumber: number; roundDate: string }[];
}

interface PlotOption {
  id: string;
  name: string;
}

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

export default function NewTransactionPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; group: string }>>([]);
  const [persons, setPersons] = useState<Array<{ id: string; name: string }>>([]);
  const [committees, setCommittees] = useState<CommitteeOption[]>([]);
  const [plots, setPlots] = useState<PlotOption[]>([]);

  // Extra fields for committee/plot linking (not part of transactionSchema)
  const [committeeId, setCommitteeId] = useState('');
  const [entryId, setEntryId] = useState('');
  const [roundId, setRoundId] = useState('');
  const [profitDeduction, setProfitDeduction] = useState('');
  const [plotId, setPlotId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isHistorical, setIsHistorical] = useState(false);

  const { form, errors, serverError, saving, setField, handleSubmit } = useResourceForm({
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

      if (COMMITTEE_TYPES.includes(data.type as string)) {
        payload.committeeId = committeeId;
        payload.entryId = entryId;
        payload.roundId = roundId || undefined;
        payload.isHistorical = isHistorical;
        if (data.type === 'COMMITTEE_CONTRIBUTION' && profitDeduction) {
          payload.profitDeduction = parseFloat(profitDeduction);
        }
        if (data.type === 'COMMITTEE_RECEIVING') {
          payload.destAccountId = data.sourceAccountId;
          delete payload.sourceAccountId;
        }
      }

      if (data.type === 'PLOT_PAYMENT') {
        payload.plotId = plotId;
        payload.isHistorical = isHistorical;
        if (dueDate) payload.dueDate = dueDate;
      }

      return fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => router.push('/transactions'),
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/persons').then((r) => r.json()),
    ]).then(([accRes, catRes, perRes]) => {
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
      setPersons(perRes.data || []);
      if (accRes.data?.[0]) {
        setField('sourceAccountId', accRes.data[0].id);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch committees when a committee type is selected
  useEffect(() => {
    if (COMMITTEE_TYPES.includes(form.type as string) && committees.length === 0) {
      fetch('/api/committees').then((r) => r.json()).then((res) => {
        setCommittees(res.data || []);
      });
    }
  }, [form.type]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch committee detail (entries + rounds) when committee is picked
  const [selectedCommittee, setSelectedCommittee] = useState<CommitteeOption | null>(null);
  useEffect(() => {
    if (!committeeId) { setSelectedCommittee(null); return; }
    fetch(`/api/committees/${committeeId}`).then((r) => r.json()).then((res) => {
      if (res.data) setSelectedCommittee(res.data);
    });
  }, [committeeId]);

  // Fetch plots when plot payment type is selected
  useEffect(() => {
    if ((form.type as string) === 'PLOT_PAYMENT' && plots.length === 0) {
      fetch('/api/plots').then((r) => r.json()).then((res) => {
        setPlots(res.data || []);
      });
    }
  }, [form.type]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset linked fields on type change
  useEffect(() => {
    setCommitteeId('');
    setEntryId('');
    setRoundId('');
    setProfitDeduction('');
    setPlotId('');
    setDueDate('');
    setIsHistorical(false);
    setSelectedCommittee(null);
  }, [form.type]);

  const isCommittee = COMMITTEE_TYPES.includes(form.type as string);
  const isPlot = (form.type as string) === 'PLOT_PAYMENT';
  const isTransfer = (form.type as string) === 'TRANSFER';

  const filteredCategories = categories.filter(
    (c) => isTransfer || c.group === ((form.type as string) === 'INCOME' ? 'INCOME' : 'EXPENSE')
  );

  const userEntries = selectedCommittee?.entries || [];
  const rounds = selectedCommittee?.rounds || [];

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
                  value={form.amount as string}
                  onChange={(e) => setField('amount', e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="0.00"
                />
              </FormField>
            </div>

            {/* Committee-specific fields */}
            {isCommittee && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Committee" required>
                    <Select
                      options={committees.map((c) => ({ value: c.id, label: `${c.name} (${c.type})` }))}
                      value={committeeId}
                      onChange={(e) => { setCommitteeId(e.target.value); setEntryId(''); setRoundId(''); }}
                      placeholder="Select committee"
                    />
                  </FormField>

                  <FormField label="Your Slot / Entry" required>
                    <Select
                      options={userEntries.map((e) => ({ value: e.id, label: `Slot #${e.slotNumber}` }))}
                      value={entryId}
                      onChange={(e) => setEntryId(e.target.value)}
                      placeholder={committeeId ? 'Select slot' : 'Pick a committee first'}
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Round (optional)">
                    <Select
                      options={[
                        { value: '', label: 'No round' },
                        ...rounds.map((r) => ({
                          value: r.id,
                          label: `Round ${r.roundNumber} — ${new Date(r.roundDate).toLocaleDateString()}`,
                        })),
                      ]}
                      value={roundId}
                      onChange={(e) => setRoundId(e.target.value)}
                      placeholder="Select round"
                    />
                  </FormField>

                  {(form.type as string) === 'COMMITTEE_CONTRIBUTION' && (
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
                </div>
              </>
            )}

            {/* Plot-specific fields */}
            {isPlot && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Plot" required>
                  <Select
                    options={plots.map((p) => ({ value: p.id, label: p.name }))}
                    value={plotId}
                    onChange={(e) => setPlotId(e.target.value)}
                    placeholder="Select plot"
                  />
                </FormField>

                <FormField label="Due Date (optional)">
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </FormField>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={isTransfer ? 'From Account' : (form.type as string) === 'COMMITTEE_RECEIVING' ? 'Into Account' : 'Account'}
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

            {/* Historical toggle for committee / plot types */}
            {(isCommittee || isPlot) && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isHistorical}
                  onChange={(e) => setIsHistorical(e.target.checked)}
                />
                Historical entry — tracking only, won&apos;t affect account balance
              </label>
            )}

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
                    value={form.taxAmount as string}
                    onChange={(e) => setField('taxAmount', e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="0.00"
                  />
                </FormField>

                <FormField label="Tax Percent" error={errors.taxPercent}>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.taxPercent as string}
                    onChange={(e) => setField('taxPercent', e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="0.00"
                  />
                </FormField>
              </div>

              <FormField label="Expected Amount" error={errors.expectedAmount}>
                <Input
                  type="number"
                  step="0.01"
                  value={form.expectedAmount as string}
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
                {saving ? 'Saving...' : 'Save Transaction'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
