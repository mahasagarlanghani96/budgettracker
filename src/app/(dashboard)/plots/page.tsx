'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
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

export default function PlotsPage() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [editing, setEditing] = useState<Plot | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', totalPrice: '', notes: '' });
  const [editForm, setEditForm] = useState({ name: '', location: '', totalPrice: '', notes: '', isActive: true });
  const [payForm, setPayForm] = useState({ amount: '', accountId: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' });
  const [historyPlot, setHistoryPlot] = useState<Plot | null>(null);
  const [payments, setPayments] = useState<PlotPayment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PlotPayment | null>(null);
  const [payEditForm, setPayEditForm] = useState({ amount: '', accountId: '', transactionDate: '', dueDate: '', notes: '' });

  function fetchPlots() {
    fetch('/api/plots').then((r) => r.json()).then((res) => setPlots(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPlots();
    fetch('/api/accounts').then((r) => r.json()).then((res) => setAccounts(res.data || []));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, location: form.location, totalPrice: parseFloat(form.totalPrice), notes: form.notes || undefined }),
      });
      if (res.ok) { setShowCreate(false); setForm({ name: '', location: '', totalPrice: '', notes: '' }); fetchPlots(); }
    } finally { setSaving(false); }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!showPayment) return;
    if (!payForm.accountId) { alert('Please select an account'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/plots/${showPayment}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(payForm.amount), accountId: payForm.accountId, transactionDate: payForm.transactionDate, notes: payForm.notes || undefined }),
      });
      if (res.ok) { setShowPayment(null); setPayForm({ amount: '', accountId: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' }); fetchPlots(); }
      else { const d = await res.json(); alert(d.error || 'Failed to record payment'); }
    } finally { setSaving(false); }
  }

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
    setPayEditForm({
      amount: p.amount.toString(),
      accountId: p.accountId || '',
      transactionDate: p.transactionDate ? p.transactionDate.split('T')[0] : '',
      dueDate: p.dueDate ? p.dueDate.split('T')[0] : '',
      notes: p.notes || '',
    });
  }

  async function handleEditPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!historyPlot || !editingPayment) return;
    if (!payEditForm.accountId) { alert('Please select an account'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/plots/${historyPlot.id}/payments/${editingPayment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payEditForm.amount),
          accountId: payEditForm.accountId,
          transactionDate: payEditForm.transactionDate,
          dueDate: payEditForm.dueDate || null,
          notes: payEditForm.notes || undefined,
        }),
      });
      if (res.ok) { setEditingPayment(null); fetchHistory(historyPlot.id); fetchPlots(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update payment'); }
    } finally { setSaving(false); }
  }

  async function handleDeletePayment(p: PlotPayment) {
    if (!historyPlot) return;
    if (!confirm('Delete this payment? This cannot be undone.')) return;
    const res = await fetch(`/api/plots/${historyPlot.id}/payments/${p.id}`, { method: 'DELETE' });
    if (res.ok) { fetchHistory(historyPlot.id); fetchPlots(); }
    else { const d = await res.json(); alert(d.error || 'Failed to delete payment'); }
  }

  function openEdit(plot: Plot) {
    setEditing(plot);
    setEditForm({
      name: plot.name,
      location: plot.location || '',
      totalPrice: plot.totalPrice.toString(),
      notes: plot.notes || '',
      isActive: plot.isActive,
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/plots/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          location: editForm.location || undefined,
          totalPrice: parseFloat(editForm.totalPrice),
          notes: editForm.notes || undefined,
          isActive: editForm.isActive,
        }),
      });
      if (res.ok) { setEditing(null); fetchPlots(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update plot'); }
    } finally { setSaving(false); }
  }

  async function handleDelete(plot: Plot) {
    if (!confirm(`Delete "${plot.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/plots/${plot.id}`, { method: 'DELETE' });
    if (res.ok) { fetchPlots(); }
    else { const d = await res.json(); alert(d.error || 'Failed to delete plot'); }
  }

  if (loading) return <PageLoading />;

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

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Plot</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., DHA Phase 6 Plot" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Location</label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., DHA Phase 6, Karachi" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Total Price *</label><Input type="number" step="0.01" value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Notes</label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showPayment} onOpenChange={() => setShowPayment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Make Payment</DialogTitle></DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Amount *</label><Input type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Account *</label><Select options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={payForm.accountId} onChange={(e) => setPayForm({ ...payForm, accountId: e.target.value })} placeholder="Select account" required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Date</label><Input type="date" value={payForm.transactionDate} onChange={(e) => setPayForm({ ...payForm, transactionDate: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Notes</label><Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowPayment(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Paying...' : 'Confirm'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment History Modal */}
      <Dialog open={!!historyPlot} onOpenChange={(open) => { if (!open) { setHistoryPlot(null); setEditingPayment(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPayment ? 'Edit Payment' : `Payment History — ${historyPlot?.name ?? ''}`}</DialogTitle></DialogHeader>
          {editingPayment ? (
            <form onSubmit={handleEditPayment} className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">Amount *</label><Input type="number" step="0.01" value={payEditForm.amount} onChange={(e) => setPayEditForm({ ...payEditForm, amount: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Account *</label><Select options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={payEditForm.accountId} onChange={(e) => setPayEditForm({ ...payEditForm, accountId: e.target.value })} placeholder="Select account" required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Date *</label><Input type="date" value={payEditForm.transactionDate} onChange={(e) => setPayEditForm({ ...payEditForm, transactionDate: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Due Date</label><Input type="date" value={payEditForm.dueDate} onChange={(e) => setPayEditForm({ ...payEditForm, dueDate: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Notes</label><Input value={payEditForm.notes} onChange={(e) => setPayEditForm({ ...payEditForm, notes: e.target.value })} placeholder="Optional" /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setEditingPayment(null)}>Back</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button></DialogFooter>
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
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Location</label><Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Total Price *</label><Input type="number" step="0.01" value={editForm.totalPrice} onChange={(e) => setEditForm({ ...editForm, totalPrice: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Notes</label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
              Active
            </label>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
