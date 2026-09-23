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
import { Target, Plus, Pencil, Trash2 } from 'lucide-react';

interface FinancialTarget {
  id: string;
  name: string;
  type: string;
  amount: { toString(): string };
  month: number;
  year: number;
  categoryId?: string | null;
  notes?: string | null;
  currentAmount: string;
  progress: number;
  onTrack: boolean;
}

const targetTypeOptions = [
  { value: 'MAX_EXPENSE', label: 'Max Expense (Category)' },
  { value: 'MAX_TOTAL_EXPENSE', label: 'Max Total Expense' },
  { value: 'MIN_INCOME', label: 'Min Income' },
  { value: 'MIN_SAVINGS', label: 'Min Savings' },
];

export default function TargetsPage() {
  const [targets, setTargets] = useState<FinancialTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<FinancialTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'MAX_EXPENSE', amount: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), categoryId: '' });
  const [editForm, setEditForm] = useState({ name: '', type: 'MAX_EXPENSE', amount: '', month: '', year: '', notes: '' });

  function fetchTargets() {
    fetch('/api/targets').then((r) => r.json()).then((res) => setTargets(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { fetchTargets(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), month: parseInt(form.month), year: parseInt(form.year), categoryId: form.categoryId || undefined }),
      });
      if (res.ok) { setShowCreate(false); setForm({ name: '', type: 'MAX_EXPENSE', amount: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), categoryId: '' }); fetchTargets(); }
    } finally { setSaving(false); }
  }

  function openEdit(t: FinancialTarget) {
    setEditing(t);
    setEditForm({
      name: t.name,
      type: t.type,
      amount: t.amount.toString(),
      month: String(t.month),
      year: String(t.year),
      notes: t.notes || '',
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/targets/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          type: editForm.type,
          amount: parseFloat(editForm.amount),
          month: parseInt(editForm.month),
          year: parseInt(editForm.year),
          categoryId: editing.categoryId || undefined,
          notes: editForm.notes || undefined,
        }),
      });
      if (res.ok) { setEditing(null); fetchTargets(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update target'); }
    } finally { setSaving(false); }
  }

  async function handleDelete(t: FinancialTarget) {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/targets/${t.id}`, { method: 'DELETE' });
    if (res.ok) { fetchTargets(); }
    else { const d = await res.json(); alert(d.error || 'Failed to delete target'); }
  }

  const typeLabels: Record<string, string> = {
    MAX_EXPENSE: 'Max Expense',
    MAX_TOTAL_EXPENSE: 'Max Total Expense',
    MIN_INCOME: 'Min Income',
    MIN_SAVINGS: 'Min Savings',
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financial Targets</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> New Target</Button>
      </div>

      {targets.length === 0 ? (
        <EmptyState icon={<Target className="h-12 w-12" />} title="No targets set" description="Set financial targets to track your spending and saving goals" action={<Button onClick={() => setShowCreate(true)}>Create Target</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {targets.map((t) => {
            const isMax = t.type.startsWith('MAX');
            const progressColor = t.onTrack
              ? 'bg-green-500'
              : t.progress > 90
              ? 'bg-red-500'
              : 'bg-yellow-500';

            return (
              <Card key={t.id} className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge variant={t.onTrack ? 'success' : 'destructive'} className="text-xs">
                        {t.onTrack ? 'On Track' : 'Over'}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{typeLabels[t.type] || t.type} · {t.month}/{t.year}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{formatCurrency(t.currentAmount)}</span>
                      <span className="text-muted-foreground">{isMax ? 'limit' : 'target'} {formatCurrency(t.amount.toString())}</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${Math.min(t.progress, 100)}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.progress.toFixed(1)}% {isMax ? 'used' : 'achieved'}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Financial Target</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., Monthly Grocery Limit" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type *</label>
                <Select
                  options={[
                    { value: 'MAX_EXPENSE', label: 'Max Expense (Category)' },
                    { value: 'MAX_TOTAL_EXPENSE', label: 'Max Total Expense' },
                    { value: 'MIN_INCOME', label: 'Min Income' },
                    { value: 'MIN_SAVINGS', label: 'Min Savings' },
                  ]}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Input type="number" min="1" max="12" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Input type="number" min="2000" max="2100" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Amount *</label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Target Modal */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Financial Target</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type *</label>
                <Select options={targetTypeOptions} value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Input type="number" min="1" max="12" value={editForm.month} onChange={(e) => setEditForm({ ...editForm, month: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Input type="number" min="2000" max="2100" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Amount *</label><Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Notes</label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
