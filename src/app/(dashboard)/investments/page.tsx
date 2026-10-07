'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { FormField } from '@/components/forms/FormField';
import { useResourceForm } from '@/hooks/useResourceForm';
import { investmentSchema, investmentUpdateSchema, investmentProfitSchema, investmentCloseSchema } from '@/lib/validations/schemas';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useConfirm } from '@/hooks/use-confirm';
import { TrendingUp, Plus, ArrowUp, ArrowDown, Pencil, Trash2, DollarSign, History, XCircle } from 'lucide-react';

interface Investment {
  id: string;
  name: string;
  investmentType: string;
  amountInvested: { toString(): string };
  currentValue: { toString(): string };
  profitLoss: string;
  profitLossPercent: number;
  status: string;
  investmentDate: string;
  accountId: string;
  notes?: string | null;
  isActive: boolean;
  isHistorical: boolean;
}

interface ProfitEntry {
  id: string;
  amount: { toString(): string };
  taxAmount: { toString(): string } | null;
  expectedAmount: { toString(): string } | null;
  transactionDate: string;
  notes?: string | null;
}

const investmentTypeOptions = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'property', label: 'Property' },
  { value: 'business', label: 'Business' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'gold', label: 'Gold' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
];

export default function InvestmentsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [recordingProfit, setRecordingProfit] = useState<Investment | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Investment | null>(null);
  const [profitHistory, setProfitHistory] = useState<ProfitEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [closing, setClosing] = useState<Investment | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const fetchInvestments = useCallback(() => {
    fetch('/api/investments').then((r) => r.json()).then((res) => setInvestments(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchInvestments();
    fetch('/api/accounts').then((r) => r.json()).then((res) => setAccounts(res.data || [])).catch(console.error);
  }, [fetchInvestments]);

  const createForm = useResourceForm({
    schema: investmentSchema,
    initial: { name: '', investmentType: '', amountInvested: '', currentValue: null, accountId: '', investmentDate: today, isHistorical: false, notes: '' },
    onSubmit: (data) => fetch('/api/investments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setShowCreate(false); createForm.reset(); fetchInvestments(); },
  });

  const editFormHook = useResourceForm({
    schema: investmentUpdateSchema,
    initial: { name: '', investmentType: '', amountInvested: '', currentValue: null, accountId: '', investmentDate: '', isHistorical: false, notes: '', isActive: true },
    onSubmit: (data) => fetch(`/api/investments/${editing!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setEditing(null); fetchInvestments(); },
  });

  const profitForm = useResourceForm({
    schema: investmentProfitSchema,
    initial: { grossAmount: '', taxAmount: 0, taxPercent: '', netAmount: '', transactionDate: today, notes: '' },
    onSubmit: (data) => fetch(`/api/investments/${recordingProfit!.id}/profit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setRecordingProfit(null); profitForm.reset(); fetchInvestments(); },
  });

  const closeForm = useResourceForm({
    schema: investmentCloseSchema,
    initial: { returnAmount: '', taxAmount: 0, taxPercent: '', netAmount: '', transactionDate: today, notes: '' },
    onSubmit: (data) => fetch(`/api/investments/${closing!.id}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setClosing(null); closeForm.reset(); fetchInvestments(); },
  });

  function openClose(inv: Investment) {
    setClosing(inv);
    const amt = parseFloat(inv.amountInvested.toString());
    closeForm.setForm({
      returnAmount: amt,
      taxAmount: 0,
      taxPercent: '',
      netAmount: amt,
      transactionDate: today,
      notes: '',
    });
  }

  function handleCloseReturnChange(val: string) {
    const ret = val === '' ? '' : Number(val);
    closeForm.setField('returnAmount', ret);
    if (typeof ret === 'number' && ret >= 0) {
      const tax = typeof closeForm.form.taxAmount === 'number' ? closeForm.form.taxAmount : 0;
      closeForm.setField('netAmount', Math.round((ret - tax) * 100) / 100);
    }
  }

  function handleCloseTaxChange(val: string) {
    const tax = val === '' ? 0 : Number(val);
    closeForm.setField('taxAmount', tax);
    const ret = typeof closeForm.form.returnAmount === 'number' ? closeForm.form.returnAmount : 0;
    if (ret > 0) {
      closeForm.setField('netAmount', Math.round((ret - tax) * 100) / 100);
      if (ret > 0 && tax > 0) {
        closeForm.setField('taxPercent', Math.round((tax / ret) * 10000) / 100);
      }
    }
  }

  function openEdit(inv: Investment) {
    setEditing(inv);
    editFormHook.setForm({
      name: inv.name,
      investmentType: inv.investmentType,
      amountInvested: parseFloat(inv.amountInvested.toString()),
      currentValue: parseFloat(inv.currentValue.toString()) || null,
      accountId: inv.accountId || '',
      investmentDate: inv.investmentDate ? inv.investmentDate.split('T')[0] : '',
      isHistorical: inv.isHistorical,
      notes: inv.notes || '',
      isActive: inv.isActive,
    });
  }

  function openProfitRecord(inv: Investment) {
    setRecordingProfit(inv);
    profitForm.reset();
  }

  function openHistory(inv: Investment) {
    setViewingHistory(inv);
    setHistoryLoading(true);
    fetch(`/api/investments/${inv.id}/profit`)
      .then((r) => r.json())
      .then((res) => setProfitHistory(res.data || []))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }

  async function handleDelete(inv: Investment) {
    if (!(await confirm(`Delete "${inv.name}"? This cannot be undone.`))) return;
    const res = await fetch(`/api/investments/${inv.id}`, { method: 'DELETE' });
    if (res.ok) fetchInvestments();
  }

  function handleGrossChange(val: string) {
    const gross = val === '' ? '' : Number(val);
    profitForm.setField('grossAmount', gross);
    if (typeof gross === 'number' && gross > 0) {
      const tax = typeof profitForm.form.taxAmount === 'number' ? profitForm.form.taxAmount : 0;
      profitForm.setField('netAmount', Math.round((gross - tax) * 100) / 100);
    }
  }

  function handleTaxAmountChange(val: string) {
    const tax = val === '' ? 0 : Number(val);
    profitForm.setField('taxAmount', tax);
    const gross = typeof profitForm.form.grossAmount === 'number' ? profitForm.form.grossAmount : 0;
    if (gross > 0) {
      profitForm.setField('netAmount', Math.round((gross - tax) * 100) / 100);
      if (gross > 0 && tax > 0) {
        profitForm.setField('taxPercent', Math.round((tax / gross) * 10000) / 100);
      }
    }
  }

  if (loading) return <PageLoading />;

  const activeInvestments = investments.filter((i) => i.isActive);
  const totalInvested = activeInvestments.reduce((s, i) => s + parseFloat(i.amountInvested.toString()), 0);
  const totalCurrent = activeInvestments.reduce((s, i) => s + parseFloat(i.currentValue.toString()), 0);
  const totalPL = totalCurrent - totalInvested;
  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  return (
    <div className="space-y-6">
      {ConfirmDialog}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investments</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Add Investment</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Invested</p><p className="text-xl font-bold tabular-nums">{formatCurrency(totalInvested.toString())}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Current Value</p><p className="text-xl font-bold tabular-nums">{formatCurrency(totalCurrent.toString())}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Profit / Loss</p><p className={`text-xl font-bold tabular-nums ${totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalPL >= 0 ? '+' : ''}{formatCurrency(totalPL.toString())}</p></CardContent></Card>
      </div>

      {investments.length === 0 ? (
        <EmptyState icon={<TrendingUp className="h-12 w-12" />} title="No investments" description="Track your investment portfolio" action={<Button onClick={() => setShowCreate(true)}>Add Investment</Button>} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Invested</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((inv) => {
                  const pl = parseFloat(inv.profitLoss);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{inv.name}</span>
                          {inv.isHistorical && <Badge variant="outline" className="ml-2 text-[10px]">Historical</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{inv.investmentType}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(inv.amountInvested.toString())}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(inv.currentValue.toString())}</TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center gap-1 tabular-nums ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {pl >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {inv.profitLossPercent}%
                        </span>
                      </TableCell>
                      <TableCell><Badge variant={inv.isActive ? 'success' : 'secondary'} className="text-xs">{inv.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {inv.isActive && <Button variant="ghost" size="icon" onClick={() => openProfitRecord(inv)} title="Record Profit" aria-label="Record profit"><DollarSign className="h-4 w-4" /></Button>}
                          <Button variant="ghost" size="icon" onClick={() => openHistory(inv)} title="Profit History" aria-label="Profit history"><History className="h-4 w-4" /></Button>
                          {inv.isActive && <Button variant="ghost" size="icon" onClick={() => openClose(inv)} title="Close Investment" aria-label={`Close ${inv.name}`}><XCircle className="h-4 w-4" /></Button>}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(inv)} title="Edit" aria-label={`Edit ${inv.name}`}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(inv)} title="Delete" aria-label={`Delete ${inv.name}`}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Investment Modal */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) createForm.reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Investment</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={createForm.errors.name}>
              <Input value={createForm.form.name as string} onChange={(e) => createForm.setField('name', e.target.value)} placeholder="e.g., Raqami Flexi-Week" />
            </FormField>
            <FormField label="Investment Type" required error={createForm.errors.investmentType}>
              <Select options={investmentTypeOptions} value={createForm.form.investmentType as string} onChange={(e) => createForm.setField('investmentType', e.target.value)} placeholder="Select type" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Invested Amount" required error={createForm.errors.amountInvested}>
                <Input type="number" step="0.01" value={createForm.form.amountInvested as string | number} onChange={(e) => createForm.setField('amountInvested', e.target.value === '' ? '' : Number(e.target.value))} />
              </FormField>
              <FormField label="Current Value" error={createForm.errors.currentValue}>
                <Input type="number" step="0.01" value={(createForm.form.currentValue as number | null) ?? ''} onChange={(e) => createForm.setField('currentValue', e.target.value === '' ? null : Number(e.target.value))} placeholder="Same as invested if blank" />
              </FormField>
            </div>
            <FormField label="Account" required error={createForm.errors.accountId}>
              <Select options={accountOptions} value={createForm.form.accountId as string} onChange={(e) => createForm.setField('accountId', e.target.value)} placeholder="Select account" />
            </FormField>
            <FormField label="Investment Date" required error={createForm.errors.investmentDate}>
              <Input type="date" value={createForm.form.investmentDate as string} onChange={(e) => createForm.setField('investmentDate', e.target.value)} />
            </FormField>
            <FormField label="Notes" error={createForm.errors.notes}>
              <Textarea value={createForm.form.notes as string} onChange={(e) => createForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createForm.form.isHistorical as boolean} onChange={(e) => createForm.setField('isHistorical', e.target.checked)} />
              Pre-existing investment — tracking only, won&apos;t affect account balance
            </label>
            {createForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{createForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createForm.saving}>{createForm.saving ? 'Saving...' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Investment Modal */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Investment</DialogTitle></DialogHeader>
          <form onSubmit={editFormHook.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={editFormHook.errors.name}>
              <Input value={editFormHook.form.name as string} onChange={(e) => editFormHook.setField('name', e.target.value)} />
            </FormField>
            <FormField label="Investment Type" required error={editFormHook.errors.investmentType}>
              <Select options={investmentTypeOptions} value={editFormHook.form.investmentType as string} onChange={(e) => editFormHook.setField('investmentType', e.target.value)} placeholder="Select type" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Invested Amount" required error={editFormHook.errors.amountInvested}>
                <Input type="number" step="0.01" value={editFormHook.form.amountInvested as string | number} onChange={(e) => editFormHook.setField('amountInvested', e.target.value === '' ? '' : Number(e.target.value))} />
              </FormField>
              <FormField label="Current Value" error={editFormHook.errors.currentValue}>
                <Input type="number" step="0.01" value={(editFormHook.form.currentValue as number | null) ?? ''} onChange={(e) => editFormHook.setField('currentValue', e.target.value === '' ? null : Number(e.target.value))} />
              </FormField>
            </div>
            <FormField label="Account" required error={editFormHook.errors.accountId}>
              <Select options={accountOptions} value={editFormHook.form.accountId as string} onChange={(e) => editFormHook.setField('accountId', e.target.value)} placeholder="Select account" />
            </FormField>
            <FormField label="Investment Date" required error={editFormHook.errors.investmentDate}>
              <Input type="date" value={editFormHook.form.investmentDate as string} onChange={(e) => editFormHook.setField('investmentDate', e.target.value)} />
            </FormField>
            <FormField label="Notes" error={editFormHook.errors.notes}>
              <Textarea value={editFormHook.form.notes as string} onChange={(e) => editFormHook.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={editFormHook.form.isActive as boolean} onChange={(e) => editFormHook.setField('isActive', e.target.checked)} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editFormHook.form.isHistorical as boolean} onChange={(e) => editFormHook.setField('isHistorical', e.target.checked)} />
                Pre-existing investment — tracking only
              </label>
            </div>
            {editFormHook.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editFormHook.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={editFormHook.saving}>{editFormHook.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Profit Modal */}
      <Dialog open={!!recordingProfit} onOpenChange={(open) => { if (!open) { setRecordingProfit(null); profitForm.reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Profit — {recordingProfit?.name}</DialogTitle></DialogHeader>
          <form onSubmit={profitForm.handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Gross Profit" required error={profitForm.errors.grossAmount}>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={profitForm.form.grossAmount as string | number}
                  onChange={(e) => handleGrossChange(e.target.value)}
                  placeholder="Before tax"
                />
              </FormField>
              <FormField label="Tax Deducted" error={profitForm.errors.taxAmount}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={profitForm.form.taxAmount as number}
                  onChange={(e) => handleTaxAmountChange(e.target.value)}
                  placeholder="0.00"
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tax %" error={profitForm.errors.taxPercent}>
                <Input
                  type="number"
                  step="0.01"
                  value={(profitForm.form.taxPercent as number | null | string) ?? ''}
                  onChange={(e) => profitForm.setField('taxPercent', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="Auto-calculated"
                />
              </FormField>
              <FormField label="Net Received" required error={profitForm.errors.netAmount}>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={profitForm.form.netAmount as string | number}
                  onChange={(e) => profitForm.setField('netAmount', e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="After tax — credited to account"
                />
              </FormField>
            </div>
            <FormField label="Date" required error={profitForm.errors.transactionDate}>
              <Input type="date" value={profitForm.form.transactionDate as string} onChange={(e) => profitForm.setField('transactionDate', e.target.value)} />
            </FormField>
            <FormField label="Notes" error={profitForm.errors.notes}>
              <Textarea value={profitForm.form.notes as string} onChange={(e) => profitForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            <p className="text-xs text-muted-foreground">
              The net amount will be credited to the investment&apos;s linked account and the investment&apos;s current value will be updated.
            </p>
            {profitForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{profitForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecordingProfit(null)}>Cancel</Button>
              <Button type="submit" disabled={profitForm.saving}>{profitForm.saving ? 'Recording...' : 'Record Profit'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Investment Modal */}
      <Dialog open={!!closing} onOpenChange={(open) => { if (!open) { setClosing(null); closeForm.reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close Investment — {closing?.name}</DialogTitle></DialogHeader>
          {closing && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Amount Invested</span><span className="font-medium tabular-nums">{formatCurrency(closing.amountInvested.toString())}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Current Value</span><span className="font-medium tabular-nums">{formatCurrency(closing.currentValue.toString())}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total P/L</span><span className={`font-medium tabular-nums ${parseFloat(closing.profitLoss) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{parseFloat(closing.profitLoss) >= 0 ? '+' : ''}{formatCurrency(closing.profitLoss)}</span></div>
            </div>
          )}
          <form onSubmit={closeForm.handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Return Amount" required error={closeForm.errors.returnAmount}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={closeForm.form.returnAmount as string | number}
                  onChange={(e) => handleCloseReturnChange(e.target.value)}
                  placeholder="Amount returned to you"
                />
              </FormField>
              <FormField label="Tax Deducted" error={closeForm.errors.taxAmount}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={closeForm.form.taxAmount as number}
                  onChange={(e) => handleCloseTaxChange(e.target.value)}
                  placeholder="0.00"
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tax %" error={closeForm.errors.taxPercent}>
                <Input
                  type="number"
                  step="0.01"
                  value={(closeForm.form.taxPercent as number | null | string) ?? ''}
                  onChange={(e) => closeForm.setField('taxPercent', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="Auto-calculated"
                />
              </FormField>
              <FormField label="Net Received" required error={closeForm.errors.netAmount}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={closeForm.form.netAmount as string | number}
                  onChange={(e) => closeForm.setField('netAmount', e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Credited to account"
                />
              </FormField>
            </div>
            <FormField label="Close Date" required error={closeForm.errors.transactionDate}>
              <Input type="date" value={closeForm.form.transactionDate as string} onChange={(e) => closeForm.setField('transactionDate', e.target.value)} />
            </FormField>
            <FormField label="Notes" error={closeForm.errors.notes}>
              <Textarea value={closeForm.form.notes as string} onChange={(e) => closeForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            <p className="text-xs text-muted-foreground">
              The net amount will be credited to the linked account. The investment will be marked as closed.
            </p>
            {closeForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{closeForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClosing(null)}>Cancel</Button>
              <Button type="submit" disabled={closeForm.saving} variant="destructive">{closeForm.saving ? 'Closing...' : 'Close Investment'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Profit History Modal */}
      <Dialog open={!!viewingHistory} onOpenChange={(open) => !open && setViewingHistory(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Profit History — {viewingHistory?.name}</DialogTitle></DialogHeader>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          ) : profitHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No profit entries recorded yet.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">{formatDate(entry.transactionDate)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{entry.expectedAmount ? formatCurrency(entry.expectedAmount.toString()) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-destructive">{entry.taxAmount ? `-${formatCurrency(entry.taxAmount.toString())}` : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium text-green-600">{formatCurrency(entry.amount.toString())}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t pt-2 mt-2 px-4 pb-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Net Profit</span>
                  <span className="text-green-600 tabular-nums">
                    {formatCurrency(profitHistory.reduce((s, e) => s + parseFloat(e.amount.toString()), 0).toString())}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingHistory(null)}>Close</Button>
            {viewingHistory && (
              <Button onClick={() => { setViewingHistory(null); openProfitRecord(viewingHistory); }}>Record New Profit</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
