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
import { TrendingUp, Plus, ArrowUp, ArrowDown } from 'lucide-react';

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
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ name: '', investmentType: 'Stock', amountInvested: '', currentValue: '', investmentDate: new Date().toISOString().split('T')[0], accountId: '', notes: '' });

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
                      <TableCell><Badge variant={inv.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs">{inv.status}</Badge></TableCell>
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
    </div>
  );
}
