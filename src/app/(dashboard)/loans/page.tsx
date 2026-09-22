'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { HandCoins, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';

interface Loan {
  id: string;
  direction: 'GIVEN' | 'TAKEN';
  amount: { toString(): string };
  totalRepaid: string;
  remainingAmount: string;
  status: string;
  transactionDate: string;
  dueDate?: string;
  notes?: string;
  person: { id: string; name: string };
  account?: { name: string } | null;
}

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ direction: '', status: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [persons, setPersons] = useState<Array<{ id: string; name: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    personId: '', accountId: '', direction: 'GIVEN', amount: '', notes: '', transactionDate: new Date().toISOString().split('T')[0], dueDate: '',
  });

  function fetchLoans() {
    const params = new URLSearchParams();
    if (filter.direction) params.set('direction', filter.direction);
    if (filter.status) params.set('status', filter.status);
    setLoading(true);
    fetch(`/api/loans?${params}`)
      .then((r) => r.json())
      .then((res) => setLoans(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchLoans(); }, [filter]);

  useEffect(() => {
    Promise.all([
      fetch('/api/persons').then((r) => r.json()),
      fetch('/api/accounts').then((r) => r.json()),
    ]).then(([pRes, aRes]) => {
      setPersons(pRes.data || []);
      setAccounts(aRes.data || []);
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          accountId: form.accountId || undefined,
          dueDate: form.dueDate || undefined,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        fetchLoans();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create loan');
      }
    } finally {
      setCreating(false);
    }
  }

  const totalReceivable = loans.filter((l) => l.direction === 'GIVEN' && l.status === 'ACTIVE').reduce((s, l) => s + parseFloat(l.remainingAmount), 0);
  const totalPayable = loans.filter((l) => l.direction === 'TAKEN' && l.status === 'ACTIVE').reduce((s, l) => s + parseFloat(l.remainingAmount), 0);

  if (loading && loans.length === 0) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loans</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> New Loan</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowUpRight className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Receivable (Given)</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(totalReceivable.toString())}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowDownRight className="h-6 w-6 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Payable (Taken)</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(totalPayable.toString())}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Select
          options={[{ value: '', label: 'All' }, { value: 'GIVEN', label: 'Given' }, { value: 'TAKEN', label: 'Taken' }]}
          value={filter.direction}
          onChange={(e) => setFilter({ ...filter, direction: e.target.value })}
          className="w-40"
        />
        <Select
          options={[{ value: '', label: 'All Status' }, { value: 'ACTIVE', label: 'Active' }, { value: 'SETTLED', label: 'Settled' }]}
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="w-40"
        />
      </div>

      {loans.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-12 w-12" />}
          title="No loans found"
          description="Track loans given and taken with ease"
          action={<Button onClick={() => setShowCreate(true)}>Add Loan</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loans.map((loan) => (
            <Link key={loan.id} href={`/loans/${loan.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{loan.person.name}</CardTitle>
                    <div className="flex gap-1">
                      <Badge variant={loan.direction === 'GIVEN' ? 'success' : 'warning'} className="text-xs">
                        {loan.direction}
                      </Badge>
                      <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                        {loan.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium tabular-nums">{formatCurrency(loan.amount.toString())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Repaid</span>
                    <span className="font-medium tabular-nums">{formatCurrency(loan.totalRepaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-bold tabular-nums text-primary">{formatCurrency(loan.remainingAmount)}</span>
                  </div>
                  {loan.notes && <p className="text-xs text-muted-foreground truncate">{loan.notes}</p>}
                  <p className="text-xs text-muted-foreground">{formatDate(loan.transactionDate)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Loan Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Direction *</label>
                <Select
                  options={[{ value: 'GIVEN', label: 'Given (You lent)' }, { value: 'TAKEN', label: 'Taken (You borrowed)' }]}
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount *</label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Person *</label>
              <Select
                options={persons.map((p) => ({ value: p.id, label: p.name }))}
                value={form.personId}
                onChange={(e) => setForm({ ...form, personId: e.target.value })}
                placeholder="Select person"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account</label>
              <Select
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                placeholder="Select account (optional)"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Loan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
