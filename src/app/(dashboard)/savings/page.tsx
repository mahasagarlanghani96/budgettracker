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
import { PiggyBank, Plus, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: { toString(): string };
  currentAmount: string;
  progress: number;
  status: string;
  targetDate?: string;
  description?: string;
}

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDeposit, setShowDeposit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', targetAmount: '', targetDate: '' });
  const [txForm, setTxForm] = useState({ type: 'DEPOSIT', amount: '', accountId: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' });

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
    setSaving(true);
    try {
      const res = await fetch(`/api/savings/${showDeposit}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...txForm, amount: parseFloat(txForm.amount), accountId: txForm.accountId || undefined }),
      });
      if (res.ok) { setShowDeposit(null); setTxForm({ type: 'DEPOSIT', amount: '', accountId: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' }); fetchGoals(); }
    } finally { setSaving(false); }
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
                  <Badge variant={goal.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs">{goal.status}</Badge>
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
                {goal.status === 'ACTIVE' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => { setShowDeposit(goal.id); setTxForm({ ...txForm, type: 'DEPOSIT' }); }}>
                      <ArrowDownToLine className="h-3 w-3 mr-1" /> Deposit
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setShowDeposit(goal.id); setTxForm({ ...txForm, type: 'WITHDRAWAL' }); }}>
                      <ArrowUpFromLine className="h-3 w-3 mr-1" /> Withdraw
                    </Button>
                  </div>
                )}
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
            <div className="space-y-2"><label className="text-sm font-medium">Type</label><Select options={[{ value: 'DEPOSIT', label: 'Deposit' }, { value: 'WITHDRAWAL', label: 'Withdrawal' }]} value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Amount *</label><Input type="number" step="0.01" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Account</label><Select options={accounts.map((a) => ({ value: a.id, label: a.name }))} value={txForm.accountId} onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })} placeholder="Optional" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Date</label><Input type="date" value={txForm.transactionDate} onChange={(e) => setTxForm({ ...txForm, transactionDate: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowDeposit(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Confirm'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
