'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { PageLoading } from '@/components/ui/loading';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loan, setLoan] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRepayment, setShowRepayment] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [repayForm, setRepayForm] = useState({ amount: '', accountId: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' });

  function fetchLoan() {
    fetch(`/api/loans/${id}`)
      .then((r) => r.json())
      .then((res) => setLoan(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchLoan();
    fetch('/api/accounts').then((r) => r.json()).then((res) => setAccounts(res.data || []));
  }, [id]);

  async function handleRepayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/loans/${id}/repayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(repayForm.amount),
          accountId: repayForm.accountId || undefined,
          transactionDate: repayForm.transactionDate,
          notes: repayForm.notes || undefined,
        }),
      });
      if (res.ok) {
        setShowRepayment(false);
        setRepayForm({ amount: '', accountId: '', transactionDate: new Date().toISOString().split('T')[0], notes: '' });
        fetchLoan();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSettle() {
    if (!confirm('Mark this loan as settled?')) return;
    await fetch(`/api/loans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SETTLED' }),
    });
    fetchLoan();
  }

  if (loading) return <PageLoading />;
  if (!loan) return <div className="text-center py-12 text-muted-foreground">Loan not found</div>;

  const person = loan.person as { name: string };
  const repayments = (loan.repayments || []) as Array<Record<string, unknown>>;

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
        {loan.status === 'ACTIVE' && (
          <div className="flex gap-2">
            <Button onClick={() => setShowRepayment(true)}><Plus className="h-4 w-4 mr-1" /> Repayment</Button>
            <Button variant="outline" onClick={handleSettle}>Settle</Button>
          </div>
        )}
      </div>

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {repayments.map((r) => (
                  <TableRow key={r.id as string}>
                    <TableCell>{formatDate(r.transactionDate as string)}</TableCell>
                    <TableCell className="font-medium tabular-nums">{formatCurrency((r.amount as { toString(): string }).toString())}</TableCell>
                    <TableCell>{(r.notes as string) || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Repayment Modal */}
      <Dialog open={showRepayment} onOpenChange={setShowRepayment}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Repayment</DialogTitle></DialogHeader>
          <form onSubmit={handleRepayment} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount *</label>
              <Input type="number" step="0.01" value={repayForm.amount} onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account</label>
              <Select
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                value={repayForm.accountId}
                onChange={(e) => setRepayForm({ ...repayForm, accountId: e.target.value })}
                placeholder="Select account (optional)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={repayForm.transactionDate} onChange={(e) => setRepayForm({ ...repayForm, transactionDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input value={repayForm.notes} onChange={(e) => setRepayForm({ ...repayForm, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRepayment(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Record Repayment'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
