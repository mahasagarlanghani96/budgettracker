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
import { PiggyBank, Plus, ArrowDownToLine, ArrowUpFromLine, Pencil, Trash2, History } from 'lucide-react';

interface SavingsTx {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: { toString(): string };
  accountId: string | null;
  transactionDate: string;
  notes?: string | null;
}

const txTypeOptions = [{ value: 'DEPOSIT', label: 'Deposit' }, { value: 'WITHDRAWAL', label: 'Withdrawal' }];

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: { toString(): string };
  currentAmount: string;
  progress: number;
  isActive: boolean;
  targetDate?: string;
  notes?: string | null;
}

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDeposit, setShowDeposit] = useState<string | null>(null);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', targetAmount: '', targetDate: '' });
  const [editForm, setEditForm] = useState({ name: '', targetAmount: '', targetDate: '', notes: '', isActive: true });
  const [txForm, setTxForm] = useState({ type: 'DEPOSIT', amount: '', accountId: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' });
  const [historyGoal, setHistoryGoal] = useState<SavingsGoal | null>(null);
  const [transactions, setTransactions] = useState<SavingsTx[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingTx, setEditingTx] = useState<SavingsTx | null>(null);
  const [txEditForm, setTxEditForm] = useState({ type: 'DEPOSIT', amount: '', accountId: '', transactionDate: '', notes: '' });

  function fetchGoals() {
    fetch('/api/savings').then((r) => r.json()).then((res) => setGoals(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchGoals();
    fetch('/api/accounts').then((r) => r.json()).then((res) => setAccounts(res.data || []));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, targetAmount: parseFloat(form.targetAmount), targetDate: form.targetDate || undefined }),
      });
      if (res.ok) { setShowCreate(false); setForm({ name: '', targetAmount: '', targetDate: '' }); fetchGoals(); }
    } finally { setSaving(false); }
  }

  async function handleTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!showDeposit) return;
    if (!txForm.accountId) { alert('Please select an account'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/savings/${showDeposit}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...txForm, amount: parseFloat(txForm.amount), accountId: txForm.accountId, notes: txForm.notes || undefined }),
      });
      if (res.ok) { setShowDeposit(null); setTxForm({ type: 'DEPOSIT', amount: '', accountId: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' }); fetchGoals(); }
      else { const d = await res.json(); alert(d.error || 'Failed to record transaction'); }
    } finally { setSaving(false); }
  }

  function fetchHistory(goalId: string) {
    setHistoryLoading(true);
    fetch(`/api/savings/${goalId}`)
      .then((r) => r.json())
      .then((res) => setTransactions(res.data?.transactions || []))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }

  function openHistory(goal: SavingsGoal) {
    setHistoryGoal(goal);
    setEditingTx(null);
    setTransactions([]);
    fetchHistory(goal.id);
  }

  function openEditTx(tx: SavingsTx) {
    setEditingTx(tx);
    setTxEditForm({
      type: tx.type,
      amount: tx.amount.toString(),
      accountId: tx.accountId || '',
      transactionDate: tx.transactionDate ? tx.transactionDate.split('T')[0] : '',
      notes: tx.notes || '',
    });
  }

  async function handleEditTx(e: React.FormEvent) {
    e.preventDefault();
    if (!historyGoal || !editingTx) return;
    if (!txEditForm.accountId) { alert('Please select an account'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/savings/${historyGoal.id}/transactions/${editingTx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txEditForm.type,
          amount: parseFloat(txEditForm.amount),
          accountId: txEditForm.accountId,
          transactionDate: txEditForm.transactionDate,
          notes: txEditForm.notes || undefined,
        }),
      });
      if (res.ok) { setEditingTx(null); fetchHistory(historyGoal.id); fetchGoals(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update transaction'); }
    } finally { setSaving(false); }
  }

  async function handleDeleteTx(tx: SavingsTx) {
    if (!historyGoal) return;
    if (!confirm('Delete this transaction? This cannot be undone.')) return;
    const res = await fetch(`/api/savings/${historyGoal.id}/transactions/${tx.id}`, { method: 'DELETE' });
    if (res.ok) { fetchHistory(historyGoal.id); fetchGoals(); }
    else { const d = await res.json(); alert(d.error || 'Failed to delete transaction'); }
  }

  function openEdit(goal: SavingsGoal) {
    setEditing(goal);
    setEditForm({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : '',
      notes: goal.notes || '',
      isActive: goal.isActive,
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/savings/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          targetAmount: parseFloat(editForm.targetAmount),
          targetDate: editForm.targetDate || null,
          notes: editForm.notes || undefined,
          isActive: editForm.isActive,
        }),
      });
      if (res.ok) { setEditing(null); fetchGoals(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update goal'); }
    } finally { setSaving(false); }
  }

  async function handleDelete(goal: SavingsGoal) {
    if (!confirm(`Delete "${goal.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/savings/${goal.id}`, { method: 'DELETE' });
    if (res.ok) { fetchGoals(); }
    else { const d = await res.json(); alert(d.error || 'Failed to delete goal'); }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Savings Goals</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> New Goal</Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={<PiggyBank className="h-12 w-12" />} title="No savings goals" description="Set a target and start saving" action={<Button onClick={() => setShowCreate(true)}>Create Goal</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Card key={goal.id} className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{goal.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant={goal.isActive ? 'success' : 'secondary'} className="text-xs">{goal.isActive ? 'Active' : 'Inactive'}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(goal)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(goal)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-muted-foreground">{formatCurrency(goal.targetAmount.toString())}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${goal.progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{goal.progress.toFixed(1)}% complete</p>
                </div>
                {goal.isActive && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => { setShowDeposit(goal.id); setTxForm({ ...txForm, type: 'DEPOSIT' }); }}>
                      <ArrowDownToLine className="h-3 w-3 mr-1" /> Deposit
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setShowDeposit(goal.id); setTxForm({ ...txForm, type: 'WITHDRAWAL' }); }}>
                      <ArrowUpFromLine className="h-3 w-3 mr-1" /> Withdraw
                    </Button>
                  </div>
                )}
                <Button size="sm" variant="outline" className="w-full" onClick={() => openHistory(goal)}>
                  <History className="h-3 w-3 mr-1" /> History
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Goal Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Savings Goal</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., Emergency Fund" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Target Amount *</label><Input type="number" step="0.01" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Target Date</label><Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deposit/Withdraw Modal */}
      <Dialog open={!!showDeposit} onOpenChange={() => setShowDeposit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{txForm.type === 'DEPOSIT' ? 'Deposit' : 'Withdraw'}</DialogTitle></DialogHeader>
          <form onSubmit={handleTransaction} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Type</label><Select options={txTypeOptions} value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Amount *</label><Input type="number" step="0.01" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Account *</label><Select options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={txForm.accountId} onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })} placeholder="Select account" required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Date</label><Input type="date" value={txForm.transactionDate} onChange={(e) => setTxForm({ ...txForm, transactionDate: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowDeposit(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Confirm'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction History Modal */}
      <Dialog open={!!historyGoal} onOpenChange={(open) => { if (!open) { setHistoryGoal(null); setEditingTx(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTx ? 'Edit Transaction' : `History — ${historyGoal?.name ?? ''}`}</DialogTitle></DialogHeader>
          {editingTx ? (
            <form onSubmit={handleEditTx} className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">Type</label><Select options={txTypeOptions} value={txEditForm.type} onChange={(e) => setTxEditForm({ ...txEditForm, type: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Amount *</label><Input type="number" step="0.01" value={txEditForm.amount} onChange={(e) => setTxEditForm({ ...txEditForm, amount: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Account *</label><Select options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={txEditForm.accountId} onChange={(e) => setTxEditForm({ ...txEditForm, accountId: e.target.value })} placeholder="Select account" required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Date *</label><Input type="date" value={txEditForm.transactionDate} onChange={(e) => setTxEditForm({ ...txEditForm, transactionDate: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Notes</label><Input value={txEditForm.notes} onChange={(e) => setTxEditForm({ ...txEditForm, notes: e.target.value })} placeholder="Optional" /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setEditingTx(null)}>Back</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button></DialogFooter>
            </form>
          ) : historyLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions recorded yet</p>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={tx.type === 'DEPOSIT' ? 'success' : 'warning'} className="text-xs">{tx.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}</Badge>
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(tx.amount.toString())}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(tx.transactionDate)}</p>
                    {tx.notes && <p className="text-xs text-muted-foreground truncate">{tx.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTx(tx)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteTx(tx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Goal Modal */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Savings Goal</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Target Amount *</label><Input type="number" step="0.01" value={editForm.targetAmount} onChange={(e) => setEditForm({ ...editForm, targetAmount: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Target Date</label><Input type="date" value={editForm.targetDate} onChange={(e) => setEditForm({ ...editForm, targetDate: e.target.value })} /></div>
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
