'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import { MapPin, Plus, Banknote } from 'lucide-react';

interface Plot {
  id: string;
  name: string;
  location: string;
  totalPrice: { toString(): string };
  paidAmount: string;
  remainingAmount: string;
  progress: number;
  status: string;
}

export default function PlotsPage() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', totalPrice: '', notes: '' });
  const [payForm, setPayForm] = useState({ amount: '', accountId: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' });

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
    setSaving(true);
    try {
      const res = await fetch(`/api/plots/${showPayment}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(payForm.amount), accountId: payForm.accountId || undefined, transactionDate: payForm.transactionDate, notes: payForm.notes || undefined }),
      });
      if (res.ok) { setShowPayment(null); setPayForm({ amount: '', accountId: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' }); fetchPlots(); }
    } finally { setSaving(false); }
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
                  <Badge variant={plot.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs">{plot.status}</Badge>
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
                {plot.status === 'ACTIVE' && (
                  <Button size="sm" className="w-full" onClick={() => setShowPayment(plot.id)}>
                    <Banknote className="h-3 w-3 mr-1" /> Make Payment
                  </Button>
                )}
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
            <div className="space-y-2"><label className="text-sm font-medium">Account</label><Select options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={payForm.accountId} onChange={(e) => setPayForm({ ...payForm, accountId: e.target.value })} placeholder="Select account" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Date</label><Input type="date" value={payForm.transactionDate} onChange={(e) => setPayForm({ ...payForm, transactionDate: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Notes</label><Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowPayment(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Paying...' : 'Confirm'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
