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
import { targetSchema } from '@/lib/validations/schemas';
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
  { value: 'CUSTOM', label: 'Custom' },
];

const monthOptions = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export default function TargetsPage() {
  const [targets, setTargets] = useState<FinancialTarget[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<FinancialTarget | null>(null);

  function fetchTargets() {
    fetch('/api/targets').then((r) => r.json()).then((res) => setTargets(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchTargets();
    fetch('/api/categories').then((r) => r.json()).then((res) => setCategories(res.data || [])).catch(console.error);
  }, []);

  // Create form
  const createForm = useResourceForm({
    schema: targetSchema,
    initial: { name: '', type: 'MAX_EXPENSE', categoryId: null, amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: '' },
    onSubmit: (data) => fetch('/api/targets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setShowCreate(false); createForm.reset(); fetchTargets(); },
  });

  // Edit form
  const editFormHook = useResourceForm({
    schema: targetSchema,
    initial: { name: '', type: 'MAX_EXPENSE', categoryId: null, amount: '', month: 1, year: new Date().getFullYear(), notes: '' },
    onSubmit: (data) => fetch(`/api/targets/${editing!.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { setEditing(null); fetchTargets(); },
  });

  function openEdit(t: FinancialTarget) {
    setEditing(t);
    editFormHook.setForm({
      name: t.name,
      type: t.type,
      categoryId: t.categoryId || null,
      amount: parseFloat(t.amount.toString()),
      month: t.month,
      year: t.year,
      notes: t.notes || '',
    });
  }

  async function handleDelete(t: FinancialTarget) {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/targets/${t.id}`, { method: 'DELETE' });
    if (res.ok) fetchTargets();
  }

  const typeLabels: Record<string, string> = {
    MAX_EXPENSE: 'Max Expense',
    MAX_TOTAL_EXPENSE: 'Max Total Expense',
    MIN_INCOME: 'Min Income',
    MIN_SAVINGS: 'Min Savings',
    CUSTOM: 'Custom',
  };

  if (loading) return <PageLoading />;

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

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

      {/* Create Target Modal */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) createForm.reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Financial Target</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={createForm.errors.name}>
              <Input value={createForm.form.name as string} onChange={(e) => createForm.setField('name', e.target.value)} placeholder="e.g., Monthly Grocery Limit" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Type" required error={createForm.errors.type}>
                <Select options={targetTypeOptions} value={createForm.form.type as string} onChange={(e) => createForm.setField('type', e.target.value)} />
              </FormField>
              <FormField label="Month" required error={createForm.errors.month}>
                <Select options={monthOptions} value={String(createForm.form.month)} onChange={(e) => createForm.setField('month', Number(e.target.value))} />
              </FormField>
            </div>
            {createForm.form.type === 'MAX_EXPENSE' && (
              <FormField label="Category" error={createForm.errors.categoryId}>
                <Select options={categoryOptions} value={(createForm.form.categoryId as string | null) ?? ''} onChange={(e) => createForm.setField('categoryId', e.target.value || null)} placeholder="Select category" />
              </FormField>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Year" required error={createForm.errors.year}>
                <Input type="number" min={2020} max={2100} value={createForm.form.year as number} onChange={(e) => createForm.setField('year', e.target.value === '' ? '' : Number(e.target.value))} />
              </FormField>
              <FormField label="Amount" required error={createForm.errors.amount}>
                <Input type="number" step="0.01" value={createForm.form.amount as string | number} onChange={(e) => createForm.setField('amount', e.target.value === '' ? '' : Number(e.target.value))} />
              </FormField>
            </div>
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

      {/* Edit Target Modal */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Financial Target</DialogTitle></DialogHeader>
          <form onSubmit={editFormHook.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={editFormHook.errors.name}>
              <Input value={editFormHook.form.name as string} onChange={(e) => editFormHook.setField('name', e.target.value)} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Type" required error={editFormHook.errors.type}>
                <Select options={targetTypeOptions} value={editFormHook.form.type as string} onChange={(e) => editFormHook.setField('type', e.target.value)} />
              </FormField>
              <FormField label="Month" required error={editFormHook.errors.month}>
                <Select options={monthOptions} value={String(editFormHook.form.month)} onChange={(e) => editFormHook.setField('month', Number(e.target.value))} />
              </FormField>
            </div>
            {editFormHook.form.type === 'MAX_EXPENSE' && (
              <FormField label="Category" error={editFormHook.errors.categoryId}>
                <Select options={categoryOptions} value={(editFormHook.form.categoryId as string | null) ?? ''} onChange={(e) => editFormHook.setField('categoryId', e.target.value || null)} placeholder="Select category" />
              </FormField>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Year" required error={editFormHook.errors.year}>
                <Input type="number" min={2020} max={2100} value={editFormHook.form.year as number} onChange={(e) => editFormHook.setField('year', e.target.value === '' ? '' : Number(e.target.value))} />
              </FormField>
              <FormField label="Amount" required error={editFormHook.errors.amount}>
                <Input type="number" step="0.01" value={editFormHook.form.amount as string | number} onChange={(e) => editFormHook.setField('amount', e.target.value === '' ? '' : Number(e.target.value))} />
              </FormField>
            </div>
            <FormField label="Notes" error={editFormHook.errors.notes}>
              <Textarea value={editFormHook.form.notes as string} onChange={(e) => editFormHook.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
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
