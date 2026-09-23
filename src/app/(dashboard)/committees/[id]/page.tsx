'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { PageLoading } from '@/components/ui/loading';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Plus, UserPlus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

const committeeStatusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function CommitteeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [committee, setCommittee] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [persons, setPersons] = useState<Array<{ id: string; name: string }>>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddRound, setShowAddRound] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [memberForm, setMemberForm] = useState({ personId: '', name: '', slots: '1', isUser: false });
  const [roundForm, setRoundForm] = useState({ roundDate: new Date().toISOString().split('T')[0], winningBid: '', notes: '' });
  const [editForm, setEditForm] = useState({ name: '', status: 'ACTIVE', notes: '' });
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [memberEditForm, setMemberEditForm] = useState({ personId: '', name: '', slots: '1', isUser: false, notes: '' });
  const [editingRound, setEditingRound] = useState<string | null>(null);
  const [roundEditForm, setRoundEditForm] = useState({ roundDate: '', winningBid: '', winningMember: '', notes: '' });
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
      else { const d = await res.json(); alert(d.error || 'Failed to add member'); }
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
      else { const d = await res.json(); alert(d.error || 'Failed to create round'); }
    } finally { setSaving(false); }
  }

  function openEdit() {
    if (!committee) return;
    setEditForm({
      name: committee.name as string,
      status: committee.status as string,
      notes: (committee.notes as string) || '',
    });
    setShowEdit(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/committees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name, status: editForm.status, notes: editForm.notes || undefined }),
      });
      if (res.ok) { setShowEdit(false); fetchCommittee(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update committee'); }
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm('Delete this committee? This cannot be undone.')) return;
    const res = await fetch(`/api/committees/${id}`, { method: 'DELETE' });
    if (res.ok) { router.push('/committees'); }
    else { const d = await res.json(); alert(d.error || 'Failed to delete committee'); }
  }

  function openEditMember(m: Record<string, unknown>) {
    setEditingMember(m.id as string);
    setMemberEditForm({
      personId: (m.personId as string) || '',
      name: m.name as string,
      slots: String(m.slots ?? 1),
      isUser: !!m.isUser,
      notes: (m.notes as string) || '',
    });
  }

  async function handleEditMember(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/committees/${id}/members/${editingMember}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: memberEditForm.name,
          personId: memberEditForm.personId || null,
          slots: parseInt(memberEditForm.slots),
          isUser: memberEditForm.isUser,
          notes: memberEditForm.notes || undefined,
        }),
      });
      if (res.ok) { setEditingMember(null); fetchCommittee(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update member'); }
    } finally { setSaving(false); }
  }

  async function handleDeleteMember(m: Record<string, unknown>) {
    if (!confirm(`Remove "${m.name as string}" from this committee?`)) return;
    const res = await fetch(`/api/committees/${id}/members/${m.id as string}`, { method: 'DELETE' });
    if (res.ok) { fetchCommittee(); }
    else { const d = await res.json(); alert(d.error || 'Failed to delete member'); }
  }

  function openEditRound(r: Record<string, unknown>) {
    setEditingRound(r.id as string);
    setRoundEditForm({
      roundDate: r.roundDate ? (r.roundDate as string).split('T')[0] : '',
      winningBid: r.winningBid != null ? (r.winningBid as { toString(): string }).toString() : '',
      winningMember: (r.winningMember as string) || '',
      notes: (r.notes as string) || '',
    });
  }

  async function handleEditRound(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRound) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        roundDate: roundEditForm.roundDate,
        winningMember: roundEditForm.winningMember || null,
        notes: roundEditForm.notes || undefined,
      };
      if (isWaiyk) body.winningBid = roundEditForm.winningBid ? parseFloat(roundEditForm.winningBid) : null;
      const res = await fetch(`/api/committees/${id}/rounds/${editingRound}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) { setEditingRound(null); fetchCommittee(); }
      else { const d = await res.json(); alert(d.error || 'Failed to update round'); }
    } finally { setSaving(false); }
  }

  async function handleDeleteRound(r: Record<string, unknown>) {
    if (!confirm(`Delete Round ${r.roundNumber as number}? This cannot be undone.`)) return;
    const res = await fetch(`/api/committees/${id}/rounds/${r.id as string}`, { method: 'DELETE' });
    if (res.ok) { fetchCommittee(); }
    else { const d = await res.json(); alert(d.error || 'Failed to delete round'); }
  }

  if (loading) return <PageLoading />;
  if (!committee) return <div className="text-center py-12 text-muted-foreground">Committee not found</div>;

  const members = (committee.members || []) as Array<Record<string, unknown>>;
  const rounds = (committee.rounds || []) as Array<Record<string, unknown>>;
  const isWaiyk = committee.type === 'WAIYK';
  const latestRoundNumber = rounds.reduce((max, r) => Math.max(max, r.roundNumber as number), 0);
  const personOptions = persons.map((p) => ({ value: p.id, label: p.name }));

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={openEdit}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
          <Button variant="outline" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
          {committee.status === 'ACTIVE' && (
            <>
              <Button variant="outline" onClick={() => setShowAddMember(true)}><UserPlus className="h-4 w-4 mr-1" /> Add Member</Button>
              <Button onClick={() => setShowAddRound(true)}><Plus className="h-4 w-4 mr-1" /> New Round</Button>
            </>
          )}
        </div>
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
                <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMember(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteMember(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
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
                  <TableHead>Winner</TableHead>
                  {isWaiyk && <TableHead>Winning Bid</TableHead>}
                  {isWaiyk && <TableHead>Profit/Member</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rounds.map((r) => (
                  <TableRow key={r.id as string}>
                    <TableCell>Round {r.roundNumber as number}</TableCell>
                    <TableCell>{formatDate(r.roundDate as string)}</TableCell>
                    <TableCell className="font-medium tabular-nums">{formatCurrency((r.payoutAmount as { toString(): string }).toString())}</TableCell>
                    <TableCell>{(r.winningMember as string) || '—'}</TableCell>
                    {isWaiyk && <TableCell className="tabular-nums">{r.winningBid ? formatCurrency((r.winningBid as { toString(): string }).toString()) : '—'}</TableCell>}
                    {isWaiyk && <TableCell className="tabular-nums">{r.profitPerMember ? formatCurrency((r.profitPerMember as { toString(): string }).toString()) : '—'}</TableCell>}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRound(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        {(r.roundNumber as number) === latestRoundNumber && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteRound(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
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
              <Select options={personOptions} value={memberForm.personId} onChange={(e) => setMemberForm({ ...memberForm, personId: e.target.value })} placeholder="Select person" />
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

      {/* Edit Member Modal */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          <form onSubmit={handleEditMember} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Person</label>
              <Select options={personOptions} value={memberEditForm.personId} onChange={(e) => setMemberEditForm({ ...memberEditForm, personId: e.target.value })} placeholder="None" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input value={memberEditForm.name} onChange={(e) => setMemberEditForm({ ...memberEditForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slots *</label>
              <Input type="number" min="1" value={memberEditForm.slots} onChange={(e) => setMemberEditForm({ ...memberEditForm, slots: e.target.value })} required />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="editIsUser" checked={memberEditForm.isUser} onChange={(e) => setMemberEditForm({ ...memberEditForm, isUser: e.target.checked })} />
              <label htmlFor="editIsUser" className="text-sm">This is me (your entry)</label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input value={memberEditForm.notes} onChange={(e) => setMemberEditForm({ ...memberEditForm, notes: e.target.value })} placeholder="Optional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
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

      {/* Edit Round Modal */}
      <Dialog open={!!editingRound} onOpenChange={(open) => !open && setEditingRound(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Round</DialogTitle></DialogHeader>
          <form onSubmit={handleEditRound} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date *</label>
              <Input type="date" value={roundEditForm.roundDate} onChange={(e) => setRoundEditForm({ ...roundEditForm, roundDate: e.target.value })} required />
            </div>
            {isWaiyk && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Winning Bid Amount</label>
                <Input type="number" step="0.01" value={roundEditForm.winningBid} onChange={(e) => setRoundEditForm({ ...roundEditForm, winningBid: e.target.value })} placeholder="The bid amount winner accepts" />
                <p className="text-xs text-muted-foreground">Profit = Total Amount - Winning Bid, split among all members</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Winning Member</label>
              <Input value={roundEditForm.winningMember} onChange={(e) => setRoundEditForm({ ...roundEditForm, winningMember: e.target.value })} placeholder="Optional" list="committee-member-names" />
              <datalist id="committee-member-names">
                {members.map((m) => <option key={m.id as string} value={m.name as string} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input value={roundEditForm.notes} onChange={(e) => setRoundEditForm({ ...roundEditForm, notes: e.target.value })} placeholder="Optional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingRound(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Committee Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Committee</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select options={committeeStatusOptions} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
