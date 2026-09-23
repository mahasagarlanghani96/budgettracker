'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
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
  notes?: string | null;
  isActive: boolean;
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ name: '', investmentType: 'Stock', amountInvested: '', currentValue: '', investmentDate: new Date().toISOString().split('T')[0], accountId: '', notes: '' });
  const [editing, setEditing] = useState<Investment | null>(null);
  const [editForm, setEditForm] = useState({ name: '', currentValue: '', notes: '', isActive: true });

  function fetchInvestments() {
    fetch('/api/investments').then((r) => r.json()).then((res) => setInvestments(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchInvestments();
    fetch('/api/accounts').then((r) => r.json()).then((res) => setAccounts(res.data || [])).catch(console.error);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amountInvested: parseFloat(form.amountInvested), currentValue: parseFloat(form.currentValue || form.amountInvested) }),
      });
      if (res.ok) { setShowCreate(false); setForm({ name: '', investmentType: 'Stock', amountInvested: '', currentValue: '', investmentDate: new Date().toISOString().split('T')[0], accountId: '', notes: '' }); fetchInvestments(); }
    } finally { setSaving(false); }
  }

  function openEdit(inv: Investment) {
    setEditing(inv);
    setEditForm({
      name: inv.name,
      currentValue: inv.currentValue.toString(),
      notes: inv.notes || '',
      isActive: inv.isActive,
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/investments/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          currentValue: parseFloat(editForm.currentValue) || 0,
          notes: editForm.notes || undefined,
          isActive: editForm.isActive,
        }),
      });
      if (res.ok) { setEditing(null); fetchInvestments(); }
      else { const data = await res.json(); alert(data.error || 'Failed to update investment'); }
    } finally { setSaving(false); }
  }

  async function handleDelete(inv: Investment) {
    if (!confirm(`Delete "${inv.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/investments/${inv.id}`, { method: 'DELETE' });
    if (res.ok) { fetchInvestments(); }
    else { const data = await res.json(); alert(data.error || 'Failed to delete investment'); }
  }

  if (loading) return <PageLoading />;

  const totalInvested = investments.reduce((s, i) => s + parseFloat(i.amountInvested.toString()), 0);
  const totalCurrent = investments.reduce((s, i) => s + parseFloat(i.currentValue.toString()), 0);
  const totalPL = totalCurrent - totalInvested;

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

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Investment</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., AAPL Shares" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Type</label><Input value={form.investmentType} onChange={(e) => setForm({ ...form, investmentType: e.target.value })} placeholder="Stock, Crypto, Gold, Property..." /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><label className="text-sm font-medium">Invested Amount *</label><Input type="number" step="0.01" value={form.amountInvested} onChange={(e) => setForm({ ...form, amountInvested: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Current Value</label><Input type="number" step="0.01" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} placeholder="Same as invested if blank" /></div>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Account *</label><select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} required><option value="">Select account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div className="space-y-2"><label className="text-sm font-medium">Date</label><Input type="date" value={form.investmentDate} onChange={(e) => setForm({ ...form, investmentDate: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Investment</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Current Value</label><Input type="number" step="0.01" value={editForm.currentValue} onChange={(e) => setEditForm({ ...editForm, currentValue: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Notes</label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional" /></div>
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
