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
import { savingsGoalSchema, savingsGoalUpdateSchema, savingsTransactionInputSchema } from '@/lib/validations/schemas';
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

const today = new Date().toISOString().split('T')[0];

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDeposit, setShowDeposit] = useState<string | null>(null);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [historyGoal, setHistoryGoal] = useState<SavingsGoal | null>(null);
  const [transactions, setTransactions] = useState<SavingsTx[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingTx, setEditingTx] = useState<SavingsTx | null>(null);

  function fetchGoals() {
    fetch('/api/savings').then((r) => r.json()).then((res) => setGoals(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchGoals();
    fetch('/api/accounts').then((r) => r.json()).then((res) => setAccounts(res.data || []));
  }, []);

  // Create goal form
  const createForm = useResourceForm({
    schema: savingsGoalSchema,
    initial: { name: '', targetAmount: '', targetDate: null, notes: '' },
    onSubmit: (data) => fetch('/api/savings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setShowCreate(false); createForm.reset(); fetchGoals(); },
  });

  // Edit goal form
  const editFormHook = useResourceForm({
    schema: savingsGoalUpdateSchema,
    initial: { name: '', targetAmount: '', targetDate: null, notes: '', isActive: true },
    onSubmit: (data) => fetch(`/api/savings/${editing!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setEditing(null); fetchGoals(); },
  });

  // Deposit/Withdraw form
  const txForm = useResourceForm({
    schema: savingsTransactionInputSchema,
    initial: { type: 'DEPOSIT', amount: '', accountId: '', transactionDate: today, notes: '' },
    onSubmit: (data) => fetch(`/api/savings/${showDeposit!}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setShowDeposit(null); txForm.reset(); fetchGoals(); },
  });

  // Edit transaction form
  const txEditFormHook = useResourceForm({
    schema: savingsTransactionInputSchema,
    initial: { type: 'DEPOSIT', amount: '', accountId: '', transactionDate: '', notes: '' },
    onSubmit: (data) => fetch(`/api/savings/${historyGoal!.id}/transactions/${editingTx!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setEditingTx(null); fetchHistory(historyGoal!.id); fetchGoals(); },
  });

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
    txEditFormHook.setForm({
      type: tx.type,
      amount: parseFloat(tx.amount.toString()),
      accountId: tx.accountId || '',
      transactionDate: tx.transactionDate ? tx.transactionDate.split('T')[0] : '',
      notes: tx.notes || '',
    });
  }

  async function handleDeleteTx(tx: SavingsTx) {
    if (!historyGoal) return;
    if (!confirm('Delete this transaction? This cannot be undone.')) return;
    const res = await fetch(`/api/savings/${historyGoal.id}/transactions/${tx.id}`, { method: 'DELETE' });
    if (res.ok) { fetchHistory(historyGoal.id); fetchGoals(); }
  }

  function openEdit(goal: SavingsGoal) {
    setEditing(goal);
    editFormHook.setForm({
      name: goal.name,
      targetAmount: parseFloat(goal.targetAmount.toString()),
      targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : null,
      notes: goal.notes || '',
      isActive: goal.isActive,
    });
  }

  async function handleDelete(goal: SavingsGoal) {
    if (!confirm(`Delete "${goal.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/savings/${goal.id}`, { method: 'DELETE' });
    if (res.ok) fetchGoals();
  }

  if (loading) return <PageLoading />;

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

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
                    <Button size="sm" className="flex-1" onClick={() => { setShowDeposit(goal.id); txForm.setForm({ ...txForm.form, type: 'DEPOSIT' }); }}>
                      <ArrowDownToLine className="h-3 w-3 mr-1" /> Deposit
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setShowDeposit(goal.id); txForm.setForm({ ...txForm.form, type: 'WITHDRAWAL' }); }}>
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
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) createForm.reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Savings Goal</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={createForm.errors.name}>
              <Input value={createForm.form.name as string} onChange={(e) => createForm.setField('name', e.target.value)} placeholder="e.g., Emergency Fund" />
            </FormField>
            <FormField label="Target Amount" required error={createForm.errors.targetAmount}>
              <Input type="number" step="0.01" value={createForm.form.targetAmount as string | number} onChange={(e) => createForm.setField('targetAmount', e.target.value === '' ? '' : Number(e.target.value))} />
            </FormField>
            <FormField label="Target Date" error={createForm.errors.targetDate}>
              <Input type="date" value={(createForm.form.targetDate as string | null) ?? ''} onChange={(e) => createForm.setField('targetDate', e.target.value || null)} />
            </FormField>
            <FormField label="Notes" error={createForm.errors.notes}>
              <Textarea value={createForm.form.notes as string} onChange={(e) => createForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            {createForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{createForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createForm.saving}>{createForm.saving ? 'Creating...' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deposit/Withdraw Modal */}
      <Dialog open={!!showDeposit} onOpenChange={(open) => { if (!open) { setShowDeposit(null); txForm.reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{txForm.form.type === 'DEPOSIT' ? 'Deposit' : 'Withdraw'}</DialogTitle></DialogHeader>
          <form onSubmit={txForm.handleSubmit} className="space-y-4">
            <FormField label="Type" required error={txForm.errors.type}>
              <Select options={txTypeOptions} value={txForm.form.type as string} onChange={(e) => txForm.setField('type', e.target.value)} />
            </FormField>
            <FormField label="Amount" required error={txForm.errors.amount}>
              <Input type="number" step="0.01" value={txForm.form.amount as string | number} onChange={(e) => txForm.setField('amount', e.target.value === '' ? '' : Number(e.target.value))} />
            </FormField>
            <FormField label="Account" required error={txForm.errors.accountId}>
              <Select options={accountOptions} value={txForm.form.accountId as string} onChange={(e) => txForm.setField('accountId', e.target.value)} placeholder="Select account" />
            </FormField>
            <FormField label="Date" required error={txForm.errors.transactionDate}>
              <Input type="date" value={txForm.form.transactionDate as string} onChange={(e) => txForm.setField('transactionDate', e.target.value)} />
            </FormField>
            <FormField label="Notes" error={txForm.errors.notes}>
              <Textarea value={txForm.form.notes as string} onChange={(e) => txForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            {txForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{txForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDeposit(null)}>Cancel</Button>
              <Button type="submit" disabled={txForm.saving}>{txForm.saving ? 'Saving...' : 'Confirm'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction History Modal */}
      <Dialog open={!!historyGoal} onOpenChange={(open) => { if (!open) { setHistoryGoal(null); setEditingTx(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTx ? 'Edit Transaction' : `History — ${historyGoal?.name ?? ''}`}</DialogTitle></DialogHeader>
          {editingTx ? (
            <form onSubmit={txEditFormHook.handleSubmit} className="space-y-4">
              <FormField label="Type" required error={txEditFormHook.errors.type}>
                <Select options={txTypeOptions} value={txEditFormHook.form.type as string} onChange={(e) => txEditFormHook.setField('type', e.target.value)} />
              </FormField>
              <FormField label="Amount" required error={txEditFormHook.errors.amount}>
                <Input type="number" step="0.01" value={txEditFormHook.form.amount as string | number} onChange={(e) => txEditFormHook.setField('amount', e.target.value === '' ? '' : Number(e.target.value))} />
              </FormField>
              <FormField label="Account" required error={txEditFormHook.errors.accountId}>
                <Select options={accountOptions} value={txEditFormHook.form.accountId as string} onChange={(e) => txEditFormHook.setField('accountId', e.target.value)} placeholder="Select account" />
              </FormField>
              <FormField label="Date" required error={txEditFormHook.errors.transactionDate}>
                <Input type="date" value={txEditFormHook.form.transactionDate as string} onChange={(e) => txEditFormHook.setField('transactionDate', e.target.value)} />
              </FormField>
              <FormField label="Notes" error={txEditFormHook.errors.notes}>
                <Textarea value={txEditFormHook.form.notes as string} onChange={(e) => txEditFormHook.setField('notes', e.target.value)} placeholder="Optional" />
              </FormField>
              {txEditFormHook.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{txEditFormHook.serverError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingTx(null)}>Back</Button>
                <Button type="submit" disabled={txEditFormHook.saving}>{txEditFormHook.saving ? 'Saving...' : 'Save Changes'}</Button>
              </DialogFooter>
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
          <form onSubmit={editFormHook.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={editFormHook.errors.name}>
              <Input value={editFormHook.form.name as string} onChange={(e) => editFormHook.setField('name', e.target.value)} />
            </FormField>
            <FormField label="Target Amount" required error={editFormHook.errors.targetAmount}>
              <Input type="number" step="0.01" value={editFormHook.form.targetAmount as string | number} onChange={(e) => editFormHook.setField('targetAmount', e.target.value === '' ? '' : Number(e.target.value))} />
            </FormField>
            <FormField label="Target Date" error={editFormHook.errors.targetDate}>
              <Input type="date" value={(editFormHook.form.targetDate as string | null) ?? ''} onChange={(e) => editFormHook.setField('targetDate', e.target.value || null)} />
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
