'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { FormField } from '@/components/forms/FormField';
import { useResourceForm } from '@/hooks/useResourceForm';
import { sportsExpenseSchema, sportsMatchFeeSchema } from '@/lib/validations/schemas';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useConfirm } from '@/hooks/use-confirm';
import { ArrowLeft, Plus, Pencil, Trash2, CheckCircle, Zap } from 'lucide-react';
import Link from 'next/link';

interface MatchExpense {
  id: string;
  description: string;
  amount: { toString(): string };
  accountId?: string | null;
  account?: { name: string } | null;
  notes?: string | null;
}

interface MatchFee {
  id: string;
  amount: { toString(): string };
  isPaid: boolean;
  paidDate?: string | null;
  accountId?: string | null;
  account?: { name: string } | null;
  notes?: string | null;
  player: { id: string; name: string };
}

interface MatchDetail {
  id: string;
  opponent?: string | null;
  venue?: string | null;
  matchDate: string;
  notes?: string | null;
  totalExpenses: string;
  totalFees: string;
  collectedFees: string;
  pendingFees: string;
  team: { id: string; name: string };
  expenses: MatchExpense[];
  fees: MatchFee[];
  players: Array<{ id: string; name: string; matchFee: number }>;
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MatchExpense | null>(null);
  const [showAddFee, setShowAddFee] = useState(false);
  const [editingFee, setEditingFee] = useState<MatchFee | null>(null);
  const [generating, setGenerating] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const fetchMatch = useCallback(() => {
    fetch(`/api/sports/matches/${id}`)
      .then((r) => r.json())
      .then((res) => setMatch(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchMatch();
    fetch('/api/accounts').then((r) => r.json()).then((res) => setAccounts(res.data || []));
  }, [fetchMatch]);

  // Add Expense form
  const addExpenseForm = useResourceForm({
    schema: sportsExpenseSchema,
    initial: { description: '', amount: '', accountId: '', notes: '' },
    onSubmit: (data) =>
      fetch(`/api/sports/matches/${id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, accountId: data.accountId || null }),
      }),
    onSuccess: () => {
      setShowAddExpense(false);
      addExpenseForm.reset();
      fetchMatch();
    },
  });

  // Edit Expense form
  const editExpenseForm = useResourceForm({
    schema: sportsExpenseSchema,
    initial: { description: '', amount: '', accountId: '', notes: '' },
    onSubmit: (data) =>
      fetch(`/api/sports/matches/${id}/expenses/${editingExpense!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, accountId: data.accountId || null }),
      }),
    onSuccess: () => {
      setEditingExpense(null);
      fetchMatch();
    },
  });

  // Add Fee form
  const addFeeForm = useResourceForm({
    schema: sportsMatchFeeSchema,
    initial: { playerId: '', amount: '', accountId: '', isPaid: false, paidDate: '', notes: '' },
    onSubmit: (data) =>
      fetch(`/api/sports/matches/${id}/fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, accountId: data.accountId || null, paidDate: data.paidDate || null }),
      }),
    onSuccess: () => {
      setShowAddFee(false);
      addFeeForm.reset();
      fetchMatch();
    },
  });

  // Edit Fee form
  const editFeeForm = useResourceForm({
    schema: sportsMatchFeeSchema,
    initial: { playerId: '', amount: '', accountId: '', isPaid: false, paidDate: '', notes: '' },
    onSubmit: (data) =>
      fetch(`/api/sports/matches/${id}/fees/${editingFee!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, accountId: data.accountId || null, paidDate: data.paidDate || null }),
      }),
    onSuccess: () => {
      setEditingFee(null);
      fetchMatch();
    },
  });

  function openEditExpense(expense: MatchExpense) {
    setEditingExpense(expense);
    editExpenseForm.setForm({
      description: expense.description,
      amount: parseFloat(expense.amount.toString()),
      accountId: expense.accountId || '',
      notes: expense.notes || '',
    });
  }

  function openEditFee(fee: MatchFee) {
    setEditingFee(fee);
    editFeeForm.setForm({
      playerId: fee.player.id,
      amount: parseFloat(fee.amount.toString()),
      accountId: fee.accountId || '',
      isPaid: fee.isPaid,
      paidDate: fee.paidDate ? fee.paidDate.split('T')[0] : '',
      notes: fee.notes || '',
    });
  }

  async function handleDeleteExpense(expense: MatchExpense) {
    if (!(await confirm('Delete this expense? This cannot be undone.'))) return;
    const res = await fetch(`/api/sports/matches/${id}/expenses/${expense.id}`, { method: 'DELETE' });
    if (res.ok) fetchMatch();
  }

  async function handleDeleteFee(fee: MatchFee) {
    if (!(await confirm('Delete this fee record? This cannot be undone.'))) return;
    const res = await fetch(`/api/sports/matches/${id}/fees/${fee.id}`, { method: 'DELETE' });
    if (res.ok) fetchMatch();
  }

  async function handleMarkPaid(fee: MatchFee) {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/sports/matches/${id}/fees/${fee.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: fee.player.id, amount: parseFloat(fee.amount.toString()), isPaid: true, paidDate: today, accountId: fee.accountId || null }),
    });
    if (res.ok) fetchMatch();
  }

  async function handleGenerateFees() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/sports/matches/${id}/fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoGenerate: true }),
      });
      if (res.ok) fetchMatch();
      else {
        try { const d = await res.json(); alert(d.error || 'Failed to generate fees'); }
        catch { alert('Failed to generate fees'); }
      }
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <PageLoading />;
  if (!match) return <div className="text-center py-12 text-muted-foreground">Match not found</div>;

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));
  const playerOptions = (match.players || []).map((p) => ({ value: p.id, label: p.name }));

  return (
    <div className="space-y-6">
      {ConfirmDialog}
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/sports">
          <Button variant="ghost" size="icon" aria-label="Back to sports">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{match.opponent || 'Match'}</h1>
          <p className="text-sm text-muted-foreground">
            {match.team.name} &middot; {formatDate(match.matchDate)} {match.venue ? ` &middot; ${match.venue}` : ''}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(match.totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Fees</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(match.totalFees)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Collected</p>
            <p className="text-xl font-bold tabular-nums text-green-600">{formatCurrency(match.collectedFees)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold tabular-nums text-orange-600">{formatCurrency(match.pendingFees)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Expenses ({match.expenses.length})</CardTitle>
            <Button size="sm" onClick={() => { addExpenseForm.reset(); setShowAddExpense(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {match.expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {match.expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(expense.amount.toString())}</TableCell>
                      <TableCell>{expense.account?.name || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit expense" onClick={() => openEditExpense(expense)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Delete expense" onClick={() => handleDeleteExpense(expense)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match Fees Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Match Fees ({match.fees.length})</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleGenerateFees} disabled={generating}>
                <Zap className="h-4 w-4 mr-1" /> {generating ? 'Generating...' : 'Generate Fees'}
              </Button>
              <Button size="sm" onClick={() => { addFeeForm.reset(); setShowAddFee(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Fee
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {match.fees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No fees recorded. Use &quot;Generate Fees&quot; to create fees for all players.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {match.fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">{fee.player.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(fee.amount.toString())}</TableCell>
                      <TableCell>
                        <Badge variant={fee.isPaid ? 'success' : 'warning'} className="text-xs">
                          {fee.isPaid ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>{fee.paidDate ? formatDate(fee.paidDate) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!fee.isPaid && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Mark as paid" onClick={() => handleMarkPaid(fee)}>
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit fee" onClick={() => openEditFee(fee)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Delete fee" onClick={() => handleDeleteFee(fee)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      <Dialog open={showAddExpense} onOpenChange={(open) => { setShowAddExpense(open); if (!open) addExpenseForm.reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <form onSubmit={addExpenseForm.handleSubmit} className="space-y-4">
            <FormField label="Description" required error={addExpenseForm.errors.description}>
              <Input value={addExpenseForm.form.description as string} onChange={(e) => addExpenseForm.setField('description', e.target.value)} placeholder="e.g., Ground rent" />
            </FormField>
            <FormField label="Amount" required error={addExpenseForm.errors.amount}>
              <Input type="number" step="0.01" value={addExpenseForm.form.amount as string | number} onChange={(e) => addExpenseForm.setField('amount', e.target.value === '' ? '' : Number(e.target.value))} />
            </FormField>
            <FormField label="Account" error={addExpenseForm.errors.accountId}>
              <Select options={accountOptions} value={addExpenseForm.form.accountId as string} onChange={(e) => addExpenseForm.setField('accountId', e.target.value)} placeholder="Select account (optional)" />
            </FormField>
            <FormField label="Notes" error={addExpenseForm.errors.notes}>
              <Textarea value={addExpenseForm.form.notes as string} onChange={(e) => addExpenseForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            {addExpenseForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{addExpenseForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddExpense(false)}>Cancel</Button>
              <Button type="submit" disabled={addExpenseForm.saving}>{addExpenseForm.saving ? 'Adding...' : 'Add Expense'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Modal */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
          <form onSubmit={editExpenseForm.handleSubmit} className="space-y-4">
            <FormField label="Description" required error={editExpenseForm.errors.description}>
              <Input value={editExpenseForm.form.description as string} onChange={(e) => editExpenseForm.setField('description', e.target.value)} />
            </FormField>
            <FormField label="Amount" required error={editExpenseForm.errors.amount}>
              <Input type="number" step="0.01" value={editExpenseForm.form.amount as string | number} onChange={(e) => editExpenseForm.setField('amount', e.target.value === '' ? '' : Number(e.target.value))} />
            </FormField>
            <FormField label="Account" error={editExpenseForm.errors.accountId}>
              <Select options={accountOptions} value={editExpenseForm.form.accountId as string} onChange={(e) => editExpenseForm.setField('accountId', e.target.value)} placeholder="Select account (optional)" />
            </FormField>
            <FormField label="Notes" error={editExpenseForm.errors.notes}>
              <Textarea value={editExpenseForm.form.notes as string} onChange={(e) => editExpenseForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            {editExpenseForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editExpenseForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingExpense(null)}>Cancel</Button>
              <Button type="submit" disabled={editExpenseForm.saving}>{editExpenseForm.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Fee Modal */}
      <Dialog open={showAddFee} onOpenChange={(open) => { setShowAddFee(open); if (!open) addFeeForm.reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Match Fee</DialogTitle></DialogHeader>
          <form onSubmit={addFeeForm.handleSubmit} className="space-y-4">
            <FormField label="Player" required error={addFeeForm.errors.playerId}>
              <Select options={playerOptions} value={addFeeForm.form.playerId as string} onChange={(e) => addFeeForm.setField('playerId', e.target.value)} placeholder="Select player" />
            </FormField>
            <FormField label="Amount" required error={addFeeForm.errors.amount}>
              <Input type="number" step="0.01" value={addFeeForm.form.amount as string | number} onChange={(e) => addFeeForm.setField('amount', e.target.value === '' ? '' : Number(e.target.value))} />
            </FormField>
            <FormField label="Account" error={addFeeForm.errors.accountId}>
              <Select options={accountOptions} value={addFeeForm.form.accountId as string} onChange={(e) => addFeeForm.setField('accountId', e.target.value)} placeholder="Select account (optional)" />
            </FormField>
            <FormField label="Paid">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={addFeeForm.form.isPaid as boolean} onChange={(e) => addFeeForm.setField('isPaid', e.target.checked)} />
                Mark as paid
              </label>
            </FormField>
            {addFeeForm.form.isPaid && (
              <FormField label="Paid Date" error={addFeeForm.errors.paidDate}>
                <Input type="date" value={addFeeForm.form.paidDate as string} onChange={(e) => addFeeForm.setField('paidDate', e.target.value)} />
              </FormField>
            )}
            <FormField label="Notes" error={addFeeForm.errors.notes}>
              <Textarea value={addFeeForm.form.notes as string} onChange={(e) => addFeeForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            {addFeeForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{addFeeForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddFee(false)}>Cancel</Button>
              <Button type="submit" disabled={addFeeForm.saving}>{addFeeForm.saving ? 'Adding...' : 'Add Fee'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Fee Modal */}
      <Dialog open={!!editingFee} onOpenChange={(open) => !open && setEditingFee(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Match Fee</DialogTitle></DialogHeader>
          <form onSubmit={editFeeForm.handleSubmit} className="space-y-4">
            <FormField label="Player" required error={editFeeForm.errors.playerId}>
              <Select options={playerOptions} value={editFeeForm.form.playerId as string} onChange={(e) => editFeeForm.setField('playerId', e.target.value)} placeholder="Select player" />
            </FormField>
            <FormField label="Amount" required error={editFeeForm.errors.amount}>
              <Input type="number" step="0.01" value={editFeeForm.form.amount as string | number} onChange={(e) => editFeeForm.setField('amount', e.target.value === '' ? '' : Number(e.target.value))} />
            </FormField>
            <FormField label="Account" error={editFeeForm.errors.accountId}>
              <Select options={accountOptions} value={editFeeForm.form.accountId as string} onChange={(e) => editFeeForm.setField('accountId', e.target.value)} placeholder="Select account (optional)" />
            </FormField>
            <FormField label="Paid">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editFeeForm.form.isPaid as boolean} onChange={(e) => editFeeForm.setField('isPaid', e.target.checked)} />
                Mark as paid
              </label>
            </FormField>
            {editFeeForm.form.isPaid && (
              <FormField label="Paid Date" error={editFeeForm.errors.paidDate}>
                <Input type="date" value={editFeeForm.form.paidDate as string} onChange={(e) => editFeeForm.setField('paidDate', e.target.value)} />
              </FormField>
            )}
            <FormField label="Notes" error={editFeeForm.errors.notes}>
              <Textarea value={editFeeForm.form.notes as string} onChange={(e) => editFeeForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            {editFeeForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editFeeForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingFee(null)}>Cancel</Button>
              <Button type="submit" disabled={editFeeForm.saving}>{editFeeForm.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
