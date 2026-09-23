'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { FormField } from '@/components/forms/FormField';
import { useResourceForm } from '@/hooks/useResourceForm';
import { plotSchema, plotUpdateSchema, plotPaymentInputSchema } from '@/lib/validations/schemas';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MapPin, Plus, Banknote, Pencil, Trash2, History } from 'lucide-react';

interface PlotPayment {
  id: string;
  amount: { toString(): string };
  accountId: string | null;
  transactionDate: string;
  dueDate?: string | null;
  notes?: string | null;
}

interface Plot {
  id: string;
  name: string;
  location: string;
  totalPrice: { toString(): string };
  paidAmount: string;
  remainingAmount: string;
  progress: number;
  isActive: boolean;
  notes?: string | null;
}

const today = new Date().toISOString().split('T')[0];

export default function PlotsPage() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [editing, setEditing] = useState<Plot | null>(null);
  const [historyPlot, setHistoryPlot] = useState<Plot | null>(null);
  const [payments, setPayments] = useState<PlotPayment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PlotPayment | null>(null);

  function fetchPlots() {
    fetch('/api/plots').then((r) => r.json()).then((res) => setPlots(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPlots();
    fetch('/api/accounts').then((r) => r.json()).then((res) => setAccounts(res.data || []));
  }, []);

  // Create plot form
  const createForm = useResourceForm({
    schema: plotSchema,
    initial: { name: '', totalPrice: '', location: '', notes: '' },
    onSubmit: (data) => fetch('/api/plots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setShowCreate(false); createForm.reset(); fetchPlots(); },
  });

  // Edit plot form
  const editFormHook = useResourceForm({
    schema: plotUpdateSchema,
    initial: { name: '', totalPrice: '', location: '', notes: '', isActive: true },
    onSubmit: (data) => fetch(`/api/plots/${editing!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setEditing(null); fetchPlots(); },
  });

  // Make payment form
  const payForm = useResourceForm({
    schema: plotPaymentInputSchema,
    initial: { accountId: '', amount: '', transactionDate: today, dueDate: null, notes: '' },
    onSubmit: (data) => fetch(`/api/plots/${showPayment!}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setShowPayment(null); payForm.reset(); fetchPlots(); },
  });

  // Edit payment form
  const payEditFormHook = useResourceForm({
    schema: plotPaymentInputSchema,
    initial: { accountId: '', amount: '', transactionDate: '', dueDate: null, notes: '' },
    onSubmit: (data) => fetch(`/api/plots/${historyPlot!.id}/payments/${editingPayment!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setEditingPayment(null); fetchHistory(historyPlot!.id); fetchPlots(); },
  });

  function fetchHistory(plotId: string) {
    setHistoryLoading(true);
    fetch(`/api/plots/${plotId}`)
      .then((r) => r.json())
      .then((res) => setPayments(res.data?.payments || []))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }

  function openHistory(plot: Plot) {
    setHistoryPlot(plot);
    setEditingPayment(null);
    setPayments([]);
    fetchHistory(plot.id);
  }

  function openEditPayment(p: PlotPayment) {
    setEditingPayment(p);
    payEditFormHook.setForm({
      amount: parseFloat(p.amount.toString()),
      accountId: p.accountId || '',
      transactionDate: p.transactionDate ? p.transactionDate.split('T')[0] : '',
      dueDate: p.dueDate ? p.dueDate.split('T')[0] : null,
      notes: p.notes || '',
    });
  }

  async function handleDeletePayment(p: PlotPayment) {
    if (!historyPlot) return;
    if (!confirm('Delete this payment? This cannot be undone.')) return;
    const res = await fetch(`/api/plots/${historyPlot.id}/payments/${p.id}`, { method: 'DELETE' });
    if (res.ok) { fetchHistory(historyPlot.id); fetchPlots(); }
  }

  function openEdit(plot: Plot) {
    setEditing(plot);
    editFormHook.setForm({
      name: plot.name,
      location: plot.location || '',
      totalPrice: parseFloat(plot.totalPrice.toString()),
      notes: plot.notes || '',
      isActive: plot.isActive,
    });
  }

  async function handleDelete(plot: Plot) {
    if (!confirm(`Delete "${plot.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/plots/${plot.id}`, { method: 'DELETE' });
    if (res.ok) fetchPlots();
  }

  if (loading) return <PageLoading />;

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plot Payments</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Add Plot</Button>
      </div>

      {plots.length === 0 ? (
        <EmptyState icon={<MapPin className="h-12 w-12" />} title="No plots" description="Track your property plot payments" action={<Button onClick={() => setShowCreate(true)}>Add Plot</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plots.map((plot) => (
            <Card key={plot.id} className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plot.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant={plot.isActive ? 'success' : 'secondary'} className="text-xs">{plot.isActive ? 'Active' : 'Inactive'}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plot)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(plot)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {plot.location && <p className="text-xs text-muted-foreground">{plot.location}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{formatCurrency(plot.paidAmount)}</span>
                    <span className="text-muted-foreground">{formatCurrency(plot.totalPrice.toString())}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${plot.progress}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{plot.progress.toFixed(1)}% paid</p>
                    <p className="text-xs text-muted-foreground">Remaining: {formatCurrency(plot.remainingAmount)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {plot.isActive && (
                    <Button size="sm" className="flex-1" onClick={() => setShowPayment(plot.id)}>
                      <Banknote className="h-3 w-3 mr-1" /> Make Payment
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openHistory(plot)}>
                    <History className="h-3 w-3 mr-1" /> History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Plot Modal */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) createForm.reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Plot</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={createForm.errors.name}>
              <Input value={createForm.form.name as string} onChange={(e) => createForm.setField('name', e.target.value)} placeholder="e.g., DHA Phase 6 Plot" />
            </FormField>
            <FormField label="Total Price" required error={createForm.errors.totalPrice}>
              <Input type="number" step="0.01" value={createForm.form.totalPrice as string | number} onChange={(e) => createForm.setField('totalPrice', e.target.value === '' ? '' : Number(e.target.value))} />
            </FormField>
            <FormField label="Location" error={createForm.errors.location}>
              <Input value={createForm.form.location as string} onChange={(e) => createForm.setField('location', e.target.value)} placeholder="e.g., DHA Phase 6, Karachi" />
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

      {/* Make Payment Modal */}
      <Dialog open={!!showPayment} onOpenChange={(open) => { if (!open) { setShowPayment(null); payForm.reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Make Payment</DialogTitle></DialogHeader>
          <form onSubmit={payForm.handleSubmit} className="space-y-4">
            <FormField label="Amount" required error={payForm.errors.amount}>
              <Input type="number" step="0.01" value={payForm.form.amount as string | number} onChange={(e) => payForm.setField('amount', e.target.value === '' ? '' : Number(e.target.value))} />
            </FormField>
            <FormField label="Account" required error={payForm.errors.accountId}>
              <Select options={accountOptions} value={payForm.form.accountId as string} onChange={(e) => payForm.setField('accountId', e.target.value)} placeholder="Select account" />
            </FormField>
            <FormField label="Date" required error={payForm.errors.transactionDate}>
              <Input type="date" value={payForm.form.transactionDate as string} onChange={(e) => payForm.setField('transactionDate', e.target.value)} />
            </FormField>
            <FormField label="Due Date" error={payForm.errors.dueDate}>
              <Input type="date" value={(payForm.form.dueDate as string | null) ?? ''} onChange={(e) => payForm.setField('dueDate', e.target.value || null)} />
            </FormField>
            <FormField label="Notes" error={payForm.errors.notes}>
              <Textarea value={payForm.form.notes as string} onChange={(e) => payForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            {payForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{payForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPayment(null)}>Cancel</Button>
              <Button type="submit" disabled={payForm.saving}>{payForm.saving ? 'Paying...' : 'Confirm'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment History Modal */}
      <Dialog open={!!historyPlot} onOpenChange={(open) => { if (!open) { setHistoryPlot(null); setEditingPayment(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPayment ? 'Edit Payment' : `Payment History — ${historyPlot?.name ?? ''}`}</DialogTitle></DialogHeader>
          {editingPayment ? (
            <form onSubmit={payEditFormHook.handleSubmit} className="space-y-4">
              <FormField label="Amount" required error={payEditFormHook.errors.amount}>
                <Input type="number" step="0.01" value={payEditFormHook.form.amount as string | number} onChange={(e) => payEditFormHook.setField('amount', e.target.value === '' ? '' : Number(e.target.value))} />
              </FormField>
              <FormField label="Account" required error={payEditFormHook.errors.accountId}>
                <Select options={accountOptions} value={payEditFormHook.form.accountId as string} onChange={(e) => payEditFormHook.setField('accountId', e.target.value)} placeholder="Select account" />
              </FormField>
              <FormField label="Date" required error={payEditFormHook.errors.transactionDate}>
                <Input type="date" value={payEditFormHook.form.transactionDate as string} onChange={(e) => payEditFormHook.setField('transactionDate', e.target.value)} />
              </FormField>
              <FormField label="Due Date" error={payEditFormHook.errors.dueDate}>
                <Input type="date" value={(payEditFormHook.form.dueDate as string | null) ?? ''} onChange={(e) => payEditFormHook.setField('dueDate', e.target.value || null)} />
              </FormField>
              <FormField label="Notes" error={payEditFormHook.errors.notes}>
                <Textarea value={payEditFormHook.form.notes as string} onChange={(e) => payEditFormHook.setField('notes', e.target.value)} placeholder="Optional" />
              </FormField>
              {payEditFormHook.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{payEditFormHook.serverError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingPayment(null)}>Back</Button>
                <Button type="submit" disabled={payEditFormHook.saving}>{payEditFormHook.saving ? 'Saving...' : 'Save Changes'}</Button>
              </DialogFooter>
            </form>
          ) : historyLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet</p>
          ) : (
            <div className="divide-y">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium tabular-nums">{formatCurrency(p.amount.toString())}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.transactionDate)}{p.dueDate ? ` · Due ${formatDate(p.dueDate)}` : ''}</p>
                    {p.notes && <p className="text-xs text-muted-foreground truncate">{p.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPayment(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeletePayment(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Plot Modal */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Plot</DialogTitle></DialogHeader>
          <form onSubmit={editFormHook.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={editFormHook.errors.name}>
              <Input value={editFormHook.form.name as string} onChange={(e) => editFormHook.setField('name', e.target.value)} />
            </FormField>
            <FormField label="Total Price" required error={editFormHook.errors.totalPrice}>
              <Input type="number" step="0.01" value={editFormHook.form.totalPrice as string | number} onChange={(e) => editFormHook.setField('totalPrice', e.target.value === '' ? '' : Number(e.target.value))} />
            </FormField>
            <FormField label="Location" error={editFormHook.errors.location}>
              <Input value={editFormHook.form.location as string} onChange={(e) => editFormHook.setField('location', e.target.value)} />
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
