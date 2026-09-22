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
import { ArrowLeft, Plus, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function CommitteeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [committee, setCommittee] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [persons, setPersons] = useState<Array<{ id: string; name: string }>>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddRound, setShowAddRound] = useState(false);
  const [memberForm, setMemberForm] = useState({ personId: '', name: '', slots: '1', isUser: false });
  const [roundForm, setRoundForm] = useState({ roundDate: new Date().toISOString().split('T')[0], winningBid: '', notes: '' });
  const [saving, setSaving] = useState(false);

  function fetchCommittee() {
    fetch(`/api/committees/${id}`)
      .then((r) => r.json())
      .then((res) => setCommittee(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchCommittee();
    fetch('/api/persons').then((r) => r.json()).then((res) => setPersons(res.data || []));
  }, [id]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/committees/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: memberForm.personId, name: memberForm.name, slots: parseInt(memberForm.slots), isUser: memberForm.isUser }),
      });
      if (res.ok) { setShowAddMember(false); fetchCommittee(); }
      else { const d = await res.json(); alert(d.error); }
    } finally { setSaving(false); }
  }

  async function handleAddRound(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/committees/${id}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundDate: roundForm.roundDate, winningBid: roundForm.winningBid ? parseFloat(roundForm.winningBid) : undefined, notes: roundForm.notes || undefined }),
      });
      if (res.ok) { setShowAddRound(false); setRoundForm({ roundDate: new Date().toISOString().split('T')[0], winningBid: '', notes: '' }); fetchCommittee(); }
      else { const d = await res.json(); alert(d.error); }
    } finally { setSaving(false); }
  }

  if (loading) return <PageLoading />;
  if (!committee) return <div className="text-center py-12 text-muted-foreground">Committee not found</div>;

  const members = (committee.members || []) as Array<Record<string, unknown>>;
  const rounds = (committee.rounds || []) as Array<Record<string, unknown>>;
  const isWaiyk = committee.type === 'WAIYK';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/committees"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{committee.name as string}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant={isWaiyk ? 'warning' : 'secondary'}>{committee.type as string}</Badge>
            <Badge variant={committee.status === 'ACTIVE' ? 'success' : 'outline'}>{committee.status as string}</Badge>
          </div>
        </div>
        {committee.status === 'ACTIVE' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddMember(true)}><UserPlus className="h-4 w-4 mr-1" /> Add Member</Button>
            <Button onClick={() => setShowAddRound(true)}><Plus className="h-4 w-4 mr-1" /> New Round</Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Monthly Amount</p><p className="text-xl font-bold tabular-nums">{formatCurrency((committee.monthlyContribution as { toString(): string }).toString())}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Pool</p><p className="text-xl font-bold tabular-nums">{formatCurrency((committee.totalAmount as { toString(): string }).toString())}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Progress</p><p className="text-xl font-bold">{rounds.length} / {committee.memberCount as number} rounds</p></CardContent></Card>
      </div>

      {/* Members */}
      <Card>
        <CardHeader><CardTitle className="text-base">Members ({members.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slots</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const slots = m.slots as number;
                return (
                  <TableRow key={m.id as string}>
                    <TableCell className="font-medium">{m.name as string}</TableCell>
                    <TableCell>{slots}</TableCell>
                    <TableCell>{m.isUser ? <Badge variant="default" className="text-xs">You</Badge> : 'Member'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rounds */}
      <Card>
        <CardHeader><CardTitle className="text-base">Rounds</CardTitle></CardHeader>
        <CardContent>
          {rounds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No rounds recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payout</TableHead>
                  {isWaiyk && <TableHead>Winning Bid</TableHead>}
                  {isWaiyk && <TableHead>Profit/Member</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rounds.map((r) => (
                  <TableRow key={r.id as string}>
                    <TableCell>Round {r.roundNumber as number}</TableCell>
                    <TableCell>{formatDate(r.roundDate as string)}</TableCell>
                    <TableCell className="font-medium tabular-nums">{formatCurrency((r.payoutAmount as { toString(): string }).toString())}</TableCell>
                    {isWaiyk && <TableCell className="tabular-nums">{r.winningBid ? formatCurrency((r.winningBid as { toString(): string }).toString()) : '—'}</TableCell>}
                    {isWaiyk && <TableCell className="tabular-nums">{r.profitPerMember ? formatCurrency((r.profitPerMember as { toString(): string }).toString()) : '—'}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Member Modal */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Person</label>
              <Select options={persons.map((p) => ({ value: p.id, label: p.name }))} value={memberForm.personId} onChange={(e) => setMemberForm({ ...memberForm, personId: e.target.value })} placeholder="Select person" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Member name" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slots</label>
              <Input type="number" min="1" value={memberForm.slots} onChange={(e) => setMemberForm({ ...memberForm, slots: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isUser" checked={memberForm.isUser} onChange={(e) => setMemberForm({ ...memberForm, isUser: e.target.checked })} />
              <label htmlFor="isUser" className="text-sm">This is me (your entry)</label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Member'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Round Modal */}
      <Dialog open={showAddRound} onOpenChange={setShowAddRound}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Round</DialogTitle></DialogHeader>
          <form onSubmit={handleAddRound} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={roundForm.roundDate} onChange={(e) => setRoundForm({ ...roundForm, roundDate: e.target.value })} />
            </div>
            {isWaiyk && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Winning Bid Amount</label>
                <Input type="number" step="0.01" value={roundForm.winningBid} onChange={(e) => setRoundForm({ ...roundForm, winningBid: e.target.value })} placeholder="The bid amount winner accepts" />
                <p className="text-xs text-muted-foreground">Profit = Total Amount - Winning Bid, split among all members</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input value={roundForm.notes} onChange={(e) => setRoundForm({ ...roundForm, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddRound(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Round'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
