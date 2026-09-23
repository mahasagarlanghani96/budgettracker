'use client';

import { useEffect, useState } from 'react';
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
import { investmentSchema, investmentUpdateSchema } from '@/lib/validations/schemas';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Plus, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';

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

const today = new Date().toISOString().split('T')[0];

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);

  function fetchInvestments() {
    fetch('/api/investments').then((r) => r.json()).then((res) => setInvestments(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchInvestments();
    fetch('/api/accounts').then((r) => r.json()).then((res) => setAccounts(res.data || [])).catch(console.error);
  }, []);

  const createForm = useResourceForm({
    schema: investmentSchema,
    initial: { name: '', investmentType: '', amountInvested: '', currentValue: null, accountId: '', investmentDate: today, notes: '' },
    onSubmit: (data) => fetch('/api/investments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setShowCreate(false); createForm.reset(); fetchInvestments(); },
  });

  const editFormHook = useResourceForm({
    schema: investmentUpdateSchema,
    initial: { name: '', investmentType: '', amountInvested: '', currentValue: null, accountId: '', investmentDate: '', notes: '', isActive: true },
    onSubmit: (data) => fetch(`/api/investments/${editing!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setEditing(null); fetchInvestments(); },
  });

  function openEdit(inv: Investment) {
    setEditing(inv);
    editFormHook.setForm({
      name: inv.name,
      investmentType: inv.investmentType,
      amountInvested: parseFloat(inv.amountInvested.toString()),
      currentValue: parseFloat(inv.currentValue.toString()) || null,
      accountId: inv.accountId || '',
      investmentDate: inv.investmentDate ? inv.investmentDate.split('T')[0] : '',
      notes: inv.notes || '',
      isActive: inv.isActive,
    });
  }

  async function handleDelete(inv: Investment) {
    if (!confirm(`Delete "${inv.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/investments/${inv.id}`, { method: 'DELETE' });
    if (res.ok) fetchInvestments();
  }

  if (loading) return <PageLoading />;

  const totalInvested = investments.reduce((s, i) => s + parseFloat(i.amountInvested.toString()), 0);
  const totalCurrent = investments.reduce((s, i) => s + parseFloat(i.currentValue.toString()), 0);
  const totalPL = totalCurrent - totalInvested;
  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  return (
    <div className="space-y-6">
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
                      <TableCell className="font-medium">{inv.name}</TableCell>
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
                          <Button variant="ghost" size="icon" onClick={() => openEdit(inv)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(inv)}><Trash2 className="h-4 w-4" /></Button>
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
              <Input value={createForm.form.name as string} onChange={(e) => createForm.setField('name', e.target.value)} placeholder="e.g., AAPL Shares" />
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
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={editFormHook.form.isActive as boolean} onChange={(e) => editFormHook.setField('isActive', e.target.checked)} />
              Active
            </label>
            {editFormHook.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editFormHook.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={editFormHook.saving}>{editFormHook.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
