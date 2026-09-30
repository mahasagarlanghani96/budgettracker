'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { FormField } from '@/components/forms/FormField';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface Entry {
  id: string;
  slotNumber: number;
}

interface Round {
  id: string;
  roundNumber: number;
  roundDate: string;
  contributions: Contribution[];
  receivings: Receiving[];
}

interface Account {
  id: string;
  name: string;
}

interface Contribution {
  id: string;
  entryId: string;
  roundId: string | null;
  accountId: string;
  expectedAmount: { toString(): string };
  actualAmount: { toString(): string };
  profitDeduction: { toString(): string };
  status: string;
  transactionDate: string;
  notes?: string;
  entry?: { slotNumber: number };
  account?: { name: string };
}

interface Receiving {
  id: string;
  entryId: string;
  roundId: string | null;
  accountId: string;
  expectedAmount?: { toString(): string } | null;
  actualAmount: { toString(): string };
  transactionDate: string;
  notes?: string;
  entry?: { slotNumber: number };
  account?: { name: string };
}

const statusOptions = [
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SKIPPED', label: 'Skipped' },
];

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'secondary'> = {
  PAID: 'success',
  PENDING: 'warning',
  SKIPPED: 'secondary',
};

interface ContributionsSectionProps {
  committeeId: string;
  entries: Entry[];
  rounds: Round[];
  accounts: Account[];
  monthlyContribution: string;
  onRefresh: () => void;
}

export function ContributionsSection({
  committeeId,
  entries,
  rounds,
  accounts,
  monthlyContribution,
  onRefresh,
}: ContributionsSectionProps) {
  const [showAddContrib, setShowAddContrib] = useState(false);
  const [showAddReceiving, setShowAddReceiving] = useState(false);
  const [editingContrib, setEditingContrib] = useState<Contribution | null>(null);
  const [editingReceiving, setEditingReceiving] = useState<Receiving | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contribForm, setContribForm] = useState({
    entryId: '', roundId: '', accountId: '', expectedAmount: monthlyContribution,
    actualAmount: monthlyContribution, profitDeduction: '0', status: 'PAID',
    transactionDate: new Date().toISOString().split('T')[0], notes: '',
  });

  const [recForm, setRecForm] = useState({
    entryId: '', roundId: '', accountId: '', expectedAmount: '',
    actualAmount: '', transactionDate: new Date().toISOString().split('T')[0], notes: '',
  });

  const entryOptions = entries.map((e) => ({ value: e.id, label: `Slot ${e.slotNumber}` }));
  const roundOptions = rounds.map((r) => ({ value: r.id, label: `Round ${r.roundNumber}` }));
  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  function resetContribForm() {
    setContribForm({
      entryId: entries[0]?.id || '', roundId: '', accountId: accounts[0]?.id || '',
      expectedAmount: monthlyContribution, actualAmount: monthlyContribution,
      profitDeduction: '0', status: 'PAID',
      transactionDate: new Date().toISOString().split('T')[0], notes: '',
    });
  }

  function resetRecForm() {
    setRecForm({
      entryId: entries[0]?.id || '', roundId: '', accountId: accounts[0]?.id || '',
      expectedAmount: '', actualAmount: '',
      transactionDate: new Date().toISOString().split('T')[0], notes: '',
    });
  }

  async function handleSaveContrib(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      entryId: contribForm.entryId,
      roundId: contribForm.roundId || null,
      accountId: contribForm.accountId,
      expectedAmount: parseFloat(contribForm.expectedAmount) || 0,
      actualAmount: parseFloat(contribForm.actualAmount) || 0,
      profitDeduction: parseFloat(contribForm.profitDeduction) || 0,
      status: contribForm.status,
      transactionDate: contribForm.transactionDate,
      notes: contribForm.notes || undefined,
    };

    try {
      const url = editingContrib
        ? `/api/committees/${committeeId}/contributions/${editingContrib.id}`
        : `/api/committees/${committeeId}/contributions`;
      const res = await fetch(url, {
        method: editingContrib ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save');
      } else {
        setShowAddContrib(false);
        setEditingContrib(null);
        onRefresh();
      }
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveReceiving(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      entryId: recForm.entryId,
      roundId: recForm.roundId || null,
      accountId: recForm.accountId,
      expectedAmount: recForm.expectedAmount ? parseFloat(recForm.expectedAmount) : null,
      actualAmount: parseFloat(recForm.actualAmount) || 0,
      transactionDate: recForm.transactionDate,
      notes: recForm.notes || undefined,
    };

    try {
      const url = editingReceiving
        ? `/api/committees/${committeeId}/receivings/${editingReceiving.id}`
        : `/api/committees/${committeeId}/receivings`;
      const res = await fetch(url, {
        method: editingReceiving ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save');
      } else {
        setShowAddReceiving(false);
        setEditingReceiving(null);
        onRefresh();
      }
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteContrib(contribId: string) {
    if (!confirm('Delete this contribution?')) return;
    const res = await fetch(`/api/committees/${committeeId}/contributions/${contribId}`, { method: 'DELETE' });
    if (res.ok) onRefresh();
  }

  async function handleDeleteReceiving(recId: string) {
    if (!confirm('Delete this receiving?')) return;
    const res = await fetch(`/api/committees/${committeeId}/receivings/${recId}`, { method: 'DELETE' });
    if (res.ok) onRefresh();
  }

  function openEditContrib(c: Contribution) {
    setContribForm({
      entryId: c.entryId,
      roundId: c.roundId || '',
      accountId: c.accountId,
      expectedAmount: c.expectedAmount.toString(),
      actualAmount: c.actualAmount.toString(),
      profitDeduction: c.profitDeduction.toString(),
      status: c.status,
      transactionDate: c.transactionDate.split('T')[0],
      notes: c.notes || '',
    });
    setEditingContrib(c);
    setShowAddContrib(true);
  }

  function openEditReceiving(r: Receiving) {
    setRecForm({
      entryId: r.entryId,
      roundId: r.roundId || '',
      accountId: r.accountId,
      expectedAmount: r.expectedAmount?.toString() || '',
      actualAmount: r.actualAmount.toString(),
      transactionDate: r.transactionDate.split('T')[0],
      notes: r.notes || '',
    });
    setEditingReceiving(r);
    setShowAddReceiving(true);
  }

  const allContributions = rounds.flatMap((r) =>
    r.contributions.map((c) => ({ ...c, roundNumber: r.roundNumber }))
  );
  const allReceivings = rounds.flatMap((r) =>
    r.receivings.map((rec) => ({ ...rec, roundNumber: r.roundNumber }))
  );

  return (
    <>
      {/* Contributions Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-destructive" />
            Contributions
            {allContributions.length > 0 && (
              <span className="text-xs text-muted-foreground">({allContributions.length})</span>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => { resetContribForm(); setEditingContrib(null); setShowAddContrib(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {allContributions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No contributions recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Round</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allContributions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>R{c.roundNumber}</TableCell>
                    <TableCell>Slot {c.entry?.slotNumber ?? '—'}</TableCell>
                    <TableCell>{c.account?.name ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(c.actualAmount.toString())}</TableCell>
                    <TableCell><Badge variant={statusBadgeVariant[c.status] || 'secondary'} className="text-xs">{c.status}</Badge></TableCell>
                    <TableCell className="text-sm">{formatDate(c.transactionDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditContrib(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteContrib(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receivings Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-green-600" />
            Receivings
            {allReceivings.length > 0 && (
              <span className="text-xs text-muted-foreground">({allReceivings.length})</span>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => { resetRecForm(); setEditingReceiving(null); setShowAddReceiving(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {allReceivings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No receivings recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Round</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allReceivings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>R{r.roundNumber}</TableCell>
                    <TableCell>Slot {r.entry?.slotNumber ?? '—'}</TableCell>
                    <TableCell>{r.account?.name ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(r.actualAmount.toString())}</TableCell>
                    <TableCell className="text-sm">{formatDate(r.transactionDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditReceiving(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteReceiving(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Contribution Modal */}
      <Dialog open={showAddContrib} onOpenChange={(open) => { if (!open) { setShowAddContrib(false); setEditingContrib(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingContrib ? 'Edit' : 'Add'} Contribution</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveContrib} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Slot" required>
                <Select options={entryOptions} value={contribForm.entryId} onChange={(e) => setContribForm((f) => ({ ...f, entryId: e.target.value }))} placeholder="Select slot" />
              </FormField>
              <FormField label="Round">
                <Select options={roundOptions} value={contribForm.roundId} onChange={(e) => setContribForm((f) => ({ ...f, roundId: e.target.value }))} placeholder="Select round" />
              </FormField>
            </div>

            <FormField label="Account" required>
              <Select options={accountOptions} value={contribForm.accountId} onChange={(e) => setContribForm((f) => ({ ...f, accountId: e.target.value }))} placeholder="Select account" />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Expected Amount" required>
                <Input type="number" step="0.01" value={contribForm.expectedAmount} onChange={(e) => setContribForm((f) => ({ ...f, expectedAmount: e.target.value }))} />
              </FormField>
              <FormField label="Actual Amount" required>
                <Input type="number" step="0.01" value={contribForm.actualAmount} onChange={(e) => setContribForm((f) => ({ ...f, actualAmount: e.target.value }))} />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Profit Deduction">
                <Input type="number" step="0.01" value={contribForm.profitDeduction} onChange={(e) => setContribForm((f) => ({ ...f, profitDeduction: e.target.value }))} />
              </FormField>
              <FormField label="Status">
                <Select options={statusOptions} value={contribForm.status} onChange={(e) => setContribForm((f) => ({ ...f, status: e.target.value }))} />
              </FormField>
            </div>

            <FormField label="Date" required>
              <Input type="date" value={contribForm.transactionDate} onChange={(e) => setContribForm((f) => ({ ...f, transactionDate: e.target.value }))} />
            </FormField>

            <FormField label="Notes">
              <Input value={contribForm.notes} onChange={(e) => setContribForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </FormField>

            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAddContrib(false); setEditingContrib(null); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingContrib ? 'Save Changes' : 'Add Contribution'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Receiving Modal */}
      <Dialog open={showAddReceiving} onOpenChange={(open) => { if (!open) { setShowAddReceiving(false); setEditingReceiving(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingReceiving ? 'Edit' : 'Add'} Receiving</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveReceiving} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Slot" required>
                <Select options={entryOptions} value={recForm.entryId} onChange={(e) => setRecForm((f) => ({ ...f, entryId: e.target.value }))} placeholder="Select slot" />
              </FormField>
              <FormField label="Round">
                <Select options={roundOptions} value={recForm.roundId} onChange={(e) => setRecForm((f) => ({ ...f, roundId: e.target.value }))} placeholder="Select round" />
              </FormField>
            </div>

            <FormField label="Account" required>
              <Select options={accountOptions} value={recForm.accountId} onChange={(e) => setRecForm((f) => ({ ...f, accountId: e.target.value }))} placeholder="Select account" />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Expected Amount">
                <Input type="number" step="0.01" value={recForm.expectedAmount} onChange={(e) => setRecForm((f) => ({ ...f, expectedAmount: e.target.value }))} placeholder="Optional" />
              </FormField>
              <FormField label="Actual Amount" required>
                <Input type="number" step="0.01" value={recForm.actualAmount} onChange={(e) => setRecForm((f) => ({ ...f, actualAmount: e.target.value }))} />
              </FormField>
            </div>

            <FormField label="Date" required>
              <Input type="date" value={recForm.transactionDate} onChange={(e) => setRecForm((f) => ({ ...f, transactionDate: e.target.value }))} />
            </FormField>

            <FormField label="Notes">
              <Input value={recForm.notes} onChange={(e) => setRecForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </FormField>

            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowAddReceiving(false); setEditingReceiving(null); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingReceiving ? 'Save Changes' : 'Add Receiving'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
