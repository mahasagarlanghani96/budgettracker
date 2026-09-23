'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { PageLoading } from '@/components/ui/loading';
import { FormField } from '@/components/forms/FormField';
import { useResourceForm } from '@/hooks/useResourceForm';
import { loanUpdateSchema, loanRepaymentInputSchema } from '@/lib/validations/schemas';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

const loanStatusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SETTLED', label: 'Settled' },
  { value: 'WRITTEN_OFF', label: 'Written Off' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const today = new Date().toISOString().split('T')[0];

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loan, setLoan] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRepayment, setShowRepayment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [editingRepayment, setEditingRepayment] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteRepayError, setDeleteRepayError] = useState<string | null>(null);

  const fetchLoan = useCallback(() => {
    fetch(`/api/loans/${id}`)
      .then((r) => r.json())
      .then((res) => setLoan(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchLoan();
    fetch('/api/accounts').then((r) => r.json()).then((res) => setAccounts(res.data || []));
  }, [id, fetchLoan]);

  // Edit loan form
  const editForm = useResourceForm({
    schema: loanUpdateSchema,
    initial: { status: 'ACTIVE', dueDate: '', interestRate: null as number | null, notes: '', isPrivate: true },
    onSubmit: (data) =>
      fetch(`/api/loans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { setShowEdit(false); fetchLoan(); },
  });

  // Add repayment form
  const repayForm = useResourceForm({
    schema: loanRepaymentInputSchema,
    initial: { amount: 0, accountId: '', transactionDate: today, notes: '' },
    onSubmit: (data) =>
      fetch(`/api/loans/${id}/repayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setShowRepayment(false);
      repayForm.reset();
      fetchLoan();
    },
  });

  // Edit repayment form
  const repayEditForm = useResourceForm({
    schema: loanRepaymentInputSchema,
    initial: { amount: 0, accountId: '', transactionDate: '', notes: '' },
    onSubmit: (data) =>
      fetch(`/api/loans/${id}/repayments/${editingRepayment}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { setEditingRepayment(null); fetchLoan(); },
  });

  function openEdit() {
    if (!loan) return;
    editForm.setForm({
      status: loan.status as string,
      dueDate: loan.dueDate ? (loan.dueDate as string).split('T')[0] : '',
      interestRate: loan.interestRate != null ? parseFloat((loan.interestRate as { toString(): string }).toString()) : null,
      notes: (loan.notes as string) || '',
      isPrivate: (loan.isPrivate as boolean) ?? true,
    });
    setShowEdit(true);
  }

  function openEditRepayment(r: Record<string, unknown>) {
    setEditingRepayment(r.id as string);
    repayEditForm.setForm({
      amount: parseFloat((r.amount as { toString(): string }).toString()) || 0,
      accountId: (r.accountId as string) || '',
      transactionDate: r.transactionDate ? (r.transactionDate as string).split('T')[0] : '',
      notes: (r.notes as string) || '',
    });
  }

  async function handleSettle() {
    if (!confirm('Mark this loan as settled?')) return;
    setSettleError(null);
    const res = await fetch(`/api/loans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SETTLED' }),
    });
    if (res.ok) { fetchLoan(); }
    else { const d = await res.json(); setSettleError(d.error || 'Failed to settle loan'); }
  }

  async function handleDelete() {
    if (!confirm('Delete this loan? This cannot be undone.')) return;
    setDeleteError(null);
    const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
    if (res.ok) { router.push('/loans'); }
    else { const d = await res.json(); setDeleteError(d.error || 'Failed to delete loan'); }
  }

  async function handleDeleteRepayment(repaymentId: string) {
    if (!confirm('Delete this repayment? This cannot be undone.')) return;
    setDeleteRepayError(null);
    const res = await fetch(`/api/loans/${id}/repayments/${repaymentId}`, { method: 'DELETE' });
    if (res.ok) { fetchLoan(); }
    else { const d = await res.json(); setDeleteRepayError(d.error || 'Failed to delete repayment'); }
  }

  if (loading) return <PageLoading />;
  if (!loan) return <div className="text-center py-12 text-muted-foreground">Loan not found</div>;

  const person = loan.person as { name: string };
  const repayments = (loan.repayments || []) as Array<Record<string, unknown>>;
  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/loans"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Loan — {person.name}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant={loan.direction === 'GIVEN' ? 'success' : 'warning'}>{loan.direction as string}</Badge>
            <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'}>{loan.status as string}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openEdit}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
          <Button variant="outline" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
          {loan.status === 'ACTIVE' && (
            <>
              <Button onClick={() => setShowRepayment(true)}><Plus className="h-4 w-4 mr-1" /> Repayment</Button>
              <Button variant="outline" onClick={handleSettle}>Settle</Button>
            </>
          )}
        </div>
      </div>

      {deleteError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{deleteError}</p>
      )}
      {settleError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{settleError}</p>
      )}
      {deleteRepayError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{deleteRepayError}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Amount</p><p className="text-2xl font-bold tabular-nums">{formatCurrency((loan.amount as { toString(): string }).toString())}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Repaid</p><p className="text-2xl font-bold tabular-nums text-green-600">{formatCurrency(loan.totalRepaid as string)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-2xl font-bold tabular-nums text-primary">{formatCurrency(loan.remainingAmount as string)}</p></CardContent></Card>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${Math.min((parseFloat(loan.totalRepaid as string) / parseFloat((loan.amount as { toString(): string }).toString())) * 100, 100)}%` }}
        />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Repayment History</CardTitle></CardHeader>
        <CardContent>
          {repayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No repayments recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repayments.map((r) => (
                  <TableRow key={r.id as string}>
                    <TableCell>{formatDate(r.transactionDate as string)}</TableCell>
                    <TableCell className="font-medium tabular-nums">{formatCurrency((r.amount as { toString(): string }).toString())}</TableCell>
                    <TableCell>{(r.notes as string) || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRepayment(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteRepayment(r.id as string)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Repayment Modal */}
      <Dialog open={showRepayment} onOpenChange={setShowRepayment}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Repayment</DialogTitle></DialogHeader>
          <form onSubmit={repayForm.handleSubmit} className="space-y-4">
            <FormField label="Amount" required error={repayForm.errors.amount}>
              <Input
                type="number"
                step="0.01"
                value={repayForm.form.amount as number || ''}
                onChange={(e) => repayForm.setField('amount', parseFloat(e.target.value) || 0)}
              />
            </FormField>

            <FormField label="Account" required error={repayForm.errors.accountId}>
              <Select
                options={accountOptions}
                value={repayForm.form.accountId as string}
                onChange={(e) => repayForm.setField('accountId', e.target.value)}
                placeholder="Select account"
              />
            </FormField>

            <FormField label="Date" required error={repayForm.errors.transactionDate}>
              <Input
                type="date"
                value={repayForm.form.transactionDate as string}
                onChange={(e) => repayForm.setField('transactionDate', e.target.value)}
              />
            </FormField>

            <FormField label="Notes" error={repayForm.errors.notes}>
              <Textarea
                value={(repayForm.form.notes as string) || ''}
                onChange={(e) => repayForm.setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            {repayForm.serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{repayForm.serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRepayment(false)}>Cancel</Button>
              <Button type="submit" disabled={repayForm.saving}>{repayForm.saving ? 'Saving...' : 'Record Repayment'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Repayment Modal */}
      <Dialog open={!!editingRepayment} onOpenChange={(open) => !open && setEditingRepayment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Repayment</DialogTitle></DialogHeader>
          <form onSubmit={repayEditForm.handleSubmit} className="space-y-4">
            <FormField label="Amount" required error={repayEditForm.errors.amount}>
              <Input
                type="number"
                step="0.01"
                value={repayEditForm.form.amount as number || ''}
                onChange={(e) => repayEditForm.setField('amount', parseFloat(e.target.value) || 0)}
              />
            </FormField>

            <FormField label="Account" required error={repayEditForm.errors.accountId}>
              <Select
                options={accountOptions}
                value={repayEditForm.form.accountId as string}
                onChange={(e) => repayEditForm.setField('accountId', e.target.value)}
                placeholder="Select account"
              />
            </FormField>

            <FormField label="Date" required error={repayEditForm.errors.transactionDate}>
              <Input
                type="date"
                value={repayEditForm.form.transactionDate as string}
                onChange={(e) => repayEditForm.setField('transactionDate', e.target.value)}
              />
            </FormField>

            <FormField label="Notes" error={repayEditForm.errors.notes}>
              <Textarea
                value={(repayEditForm.form.notes as string) || ''}
                onChange={(e) => repayEditForm.setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            {repayEditForm.serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{repayEditForm.serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingRepayment(null)}>Cancel</Button>
              <Button type="submit" disabled={repayEditForm.saving}>{repayEditForm.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Loan Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Loan</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit} className="space-y-4">
            <FormField label="Status" error={editForm.errors.status}>
              <Select
                options={loanStatusOptions}
                value={editForm.form.status as string}
                onChange={(e) => editForm.setField('status', e.target.value)}
              />
            </FormField>

            <FormField label="Due Date" error={editForm.errors.dueDate}>
              <Input
                type="date"
                value={(editForm.form.dueDate as string) || ''}
                onChange={(e) => editForm.setField('dueDate', e.target.value || null)}
              />
            </FormField>

            <FormField label="Interest Rate (%)" error={editForm.errors.interestRate}>
              <Input
                type="number"
                step="0.01"
                value={editForm.form.interestRate != null ? (editForm.form.interestRate as number) : ''}
                onChange={(e) => editForm.setField('interestRate', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Optional"
              />
            </FormField>

            <FormField label="Notes" error={editForm.errors.notes}>
              <Textarea
                value={(editForm.form.notes as string) || ''}
                onChange={(e) => editForm.setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            <FormField label="Private" error={editForm.errors.isPrivate}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(editForm.form.isPrivate as boolean) ?? true}
                  onChange={(e) => editForm.setField('isPrivate', e.target.checked)}
                />
                Keep this loan private
              </label>
            </FormField>

            {editForm.serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editForm.serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={editForm.saving}>{editForm.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
