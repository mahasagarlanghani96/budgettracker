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
import { AdvancedSection } from '@/components/forms/AdvancedSection';
import { useResourceForm } from '@/hooks/useResourceForm';
import { committeeUpdateSchema, committeeMemberSchema, committeeRoundUpdateSchema } from '@/lib/validations/schemas';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Plus, UserPlus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

const committeeTypeOptions = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'WAIYK', label: 'Waiyk' },
];

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
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editingRound, setEditingRound] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCommittee = useCallback(() => {
    fetch(`/api/committees/${id}`)
      .then((r) => r.json())
      .then((res) => setCommittee(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchCommittee();
    fetch('/api/persons').then((r) => r.json()).then((res) => setPersons(res.data || []));
  }, [fetchCommittee]);

  // --- Edit Committee Form ---
  const editForm = useResourceForm({
    schema: committeeUpdateSchema,
    initial: { name: '', type: 'NORMAL', status: 'ACTIVE', startDate: '', endDate: '', memberCount: '', monthlyContribution: '', totalAmount: '', notes: '', isPrivate: true },
    onSubmit: (data) => {
      const payload = { ...data };
      if (!payload.endDate) payload.endDate = null;
      if (!payload.totalAmount) payload.totalAmount = null;
      return fetch(`/api/committees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => { setShowEdit(false); fetchCommittee(); },
  });

  function openEdit() {
    if (!committee) return;
    editForm.reset({
      name: committee.name as string,
      type: (committee.type as string) || 'NORMAL',
      status: (committee.status as string) || 'ACTIVE',
      startDate: committee.startDate ? (committee.startDate as string).split('T')[0] : '',
      endDate: committee.endDate ? (committee.endDate as string).split('T')[0] : '',
      memberCount: committee.memberCount ?? '',
      monthlyContribution: committee.monthlyContribution ?? '',
      totalAmount: committee.totalAmount ?? '',
      notes: (committee.notes as string) || '',
      isPrivate: committee.isPrivate ?? true,
    });
    setShowEdit(true);
  }

  // --- Add Member Form ---
  const addMemberForm = useResourceForm({
    schema: committeeMemberSchema,
    initial: { personId: '', name: '', slots: 1, isUser: false, notes: '' },
    onSubmit: (data) =>
      fetch(`/api/committees/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { setShowAddMember(false); addMemberForm.reset(); fetchCommittee(); },
  });

  // --- Edit Member Form ---
  const editMemberForm = useResourceForm({
    schema: committeeMemberSchema,
    initial: { personId: '', name: '', slots: 1, isUser: false, notes: '' },
    onSubmit: (data) =>
      fetch(`/api/committees/${id}/members/${editingMember}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, personId: data.personId || null }),
      }),
    onSuccess: () => { setEditingMember(null); fetchCommittee(); },
  });

  function openEditMember(m: Record<string, unknown>) {
    setEditingMember(m.id as string);
    editMemberForm.reset({
      personId: (m.personId as string) || '',
      name: m.name as string,
      slots: m.slots ?? 1,
      isUser: !!m.isUser,
      notes: (m.notes as string) || '',
    });
  }

  // --- Add Round Form ---
  const addRoundForm = useResourceForm({
    schema: committeeRoundUpdateSchema,
    initial: { roundDate: new Date().toISOString().split('T')[0], winningBid: '', winningMember: '', notes: '' },
    onSubmit: (data) => {
      const payload: Record<string, unknown> = { roundDate: data.roundDate, notes: data.notes || undefined };
      if (data.winningBid) payload.winningBid = data.winningBid;
      if (data.winningMember) payload.winningMember = data.winningMember;
      return fetch(`/api/committees/${id}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => { setShowAddRound(false); addRoundForm.reset({ roundDate: new Date().toISOString().split('T')[0], winningBid: '', winningMember: '', notes: '' }); fetchCommittee(); },
  });

  // --- Edit Round Form ---
  const editRoundForm = useResourceForm({
    schema: committeeRoundUpdateSchema,
    initial: { roundDate: '', winningBid: '', winningMember: '', notes: '' },
    onSubmit: (data) => {
      const payload: Record<string, unknown> = {
        roundDate: data.roundDate,
        winningMember: data.winningMember || null,
        notes: data.notes || undefined,
      };
      if (committee?.type === 'WAIYK') {
        payload.winningBid = data.winningBid ? data.winningBid : null;
      }
      return fetch(`/api/committees/${id}/rounds/${editingRound}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => { setEditingRound(null); fetchCommittee(); },
  });

  function openEditRound(r: Record<string, unknown>) {
    setEditingRound(r.id as string);
    editRoundForm.reset({
      roundDate: r.roundDate ? (r.roundDate as string).split('T')[0] : '',
      winningBid: r.winningBid ?? '',
      winningMember: (r.winningMember as string) || '',
      notes: (r.notes as string) || '',
    });
  }

  // --- Delete handlers ---
  async function handleDelete() {
    if (!confirm('Delete this committee? This cannot be undone.')) return;
    setDeleteError(null);
    const res = await fetch(`/api/committees/${id}`, { method: 'DELETE' });
    if (res.ok) { router.push('/committees'); }
    else {
      try { const d = await res.json(); setDeleteError(d.error || 'Failed to delete committee'); }
      catch { setDeleteError('Failed to delete committee'); }
    }
  }

  async function handleDeleteMember(m: Record<string, unknown>) {
    if (!confirm(`Remove "${m.name as string}" from this committee?`)) return;
    setDeleteError(null);
    const res = await fetch(`/api/committees/${id}/members/${m.id as string}`, { method: 'DELETE' });
    if (res.ok) { fetchCommittee(); }
    else {
      try { const d = await res.json(); setDeleteError(d.error || 'Failed to delete member'); }
      catch { setDeleteError('Failed to delete member'); }
    }
  }

  async function handleDeleteRound(r: Record<string, unknown>) {
    if (!confirm(`Delete Round ${r.roundNumber as number}? This cannot be undone.`)) return;
    setDeleteError(null);
    const res = await fetch(`/api/committees/${id}/rounds/${r.id as string}`, { method: 'DELETE' });
    if (res.ok) { fetchCommittee(); }
    else {
      try { const d = await res.json(); setDeleteError(d.error || 'Failed to delete round'); }
      catch { setDeleteError('Failed to delete round'); }
    }
  }

  if (loading) return <PageLoading />;
  if (!committee) return <div className="text-center py-12 text-muted-foreground">Committee not found</div>;

  const members = (committee.members || []) as Array<Record<string, unknown>>;
  const rounds = (committee.rounds || []) as Array<Record<string, unknown>>;
  const isWaiyk = committee.type === 'WAIYK';
  const editIsWaiyk = (editForm.form.type as string) === 'WAIYK';
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
              <Button variant="outline" onClick={() => { addMemberForm.reset(); setShowAddMember(true); }}><UserPlus className="h-4 w-4 mr-1" /> Add Member</Button>
              <Button onClick={() => { addRoundForm.reset({ roundDate: new Date().toISOString().split('T')[0], winningBid: '', winningMember: '', notes: '' }); setShowAddRound(true); }}><Plus className="h-4 w-4 mr-1" /> New Round</Button>
            </>
          )}
        </div>
      </div>

      {deleteError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{deleteError}</p>
      )}

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
          <form onSubmit={addMemberForm.handleSubmit} className="space-y-4">
            <FormField label="Person" error={addMemberForm.errors.personId}>
              <Select
                options={personOptions}
                value={addMemberForm.form.personId as string}
                onChange={(e) => addMemberForm.setField('personId', e.target.value)}
                placeholder="Select person"
              />
            </FormField>

            <FormField label="Name" required error={addMemberForm.errors.name}>
              <Input
                value={addMemberForm.form.name as string}
                onChange={(e) => addMemberForm.setField('name', e.target.value)}
                placeholder="Member name"
              />
            </FormField>

            <FormField label="Slots" error={addMemberForm.errors.slots}>
              <Input
                type="number"
                min="1"
                value={addMemberForm.form.slots as number}
                onChange={(e) => addMemberForm.setField('slots', e.target.value ? parseInt(e.target.value) : 1)}
              />
            </FormField>

            <FormField label="Is User" error={addMemberForm.errors.isUser}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={addMemberForm.form.isUser as boolean}
                  onChange={(e) => addMemberForm.setField('isUser', e.target.checked)}
                />
                This is me (your entry)
              </label>
            </FormField>

            <FormField label="Notes" error={addMemberForm.errors.notes}>
              <Textarea
                value={addMemberForm.form.notes as string}
                onChange={(e) => addMemberForm.setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            {addMemberForm.serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{addMemberForm.serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
              <Button type="submit" disabled={addMemberForm.saving}>{addMemberForm.saving ? 'Adding...' : 'Add Member'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          <form onSubmit={editMemberForm.handleSubmit} className="space-y-4">
            <FormField label="Person" error={editMemberForm.errors.personId}>
              <Select
                options={personOptions}
                value={editMemberForm.form.personId as string}
                onChange={(e) => editMemberForm.setField('personId', e.target.value)}
                placeholder="None"
              />
            </FormField>

            <FormField label="Name" required error={editMemberForm.errors.name}>
              <Input
                value={editMemberForm.form.name as string}
                onChange={(e) => editMemberForm.setField('name', e.target.value)}
              />
            </FormField>

            <FormField label="Slots" error={editMemberForm.errors.slots}>
              <Input
                type="number"
                min="1"
                value={editMemberForm.form.slots as number}
                onChange={(e) => editMemberForm.setField('slots', e.target.value ? parseInt(e.target.value) : 1)}
              />
            </FormField>

            <FormField label="Is User" error={editMemberForm.errors.isUser}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editMemberForm.form.isUser as boolean}
                  onChange={(e) => editMemberForm.setField('isUser', e.target.checked)}
                />
                This is me (your entry)
              </label>
            </FormField>

            <FormField label="Notes" error={editMemberForm.errors.notes}>
              <Textarea
                value={editMemberForm.form.notes as string}
                onChange={(e) => editMemberForm.setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            {editMemberForm.serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editMemberForm.serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
              <Button type="submit" disabled={editMemberForm.saving}>{editMemberForm.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Round Modal */}
      <Dialog open={showAddRound} onOpenChange={setShowAddRound}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Round</DialogTitle></DialogHeader>
          <form onSubmit={addRoundForm.handleSubmit} className="space-y-4">
            <FormField label="Date" error={addRoundForm.errors.roundDate}>
              <Input
                type="date"
                value={addRoundForm.form.roundDate as string}
                onChange={(e) => addRoundForm.setField('roundDate', e.target.value)}
              />
            </FormField>

            {isWaiyk && (
              <>
                <FormField label="Winning Bid Amount" error={addRoundForm.errors.winningBid} hint="Profit = Total Amount - Winning Bid, split among all members">
                  <Input
                    type="number"
                    step="0.01"
                    value={addRoundForm.form.winningBid as string | number}
                    onChange={(e) => addRoundForm.setField('winningBid', e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="The bid amount winner accepts"
                  />
                </FormField>

                <FormField label="Winning Member" error={addRoundForm.errors.winningMember}>
                  <Input
                    value={addRoundForm.form.winningMember as string}
                    onChange={(e) => addRoundForm.setField('winningMember', e.target.value)}
                    placeholder="Optional"
                    list="add-round-member-names"
                  />
                  <datalist id="add-round-member-names">
                    {members.map((m) => <option key={m.id as string} value={m.name as string} />)}
                  </datalist>
                </FormField>
              </>
            )}

            <FormField label="Notes" error={addRoundForm.errors.notes}>
              <Textarea
                value={addRoundForm.form.notes as string}
                onChange={(e) => addRoundForm.setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            {addRoundForm.serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{addRoundForm.serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddRound(false)}>Cancel</Button>
              <Button type="submit" disabled={addRoundForm.saving}>{addRoundForm.saving ? 'Creating...' : 'Create Round'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Round Modal */}
      <Dialog open={!!editingRound} onOpenChange={(open) => !open && setEditingRound(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Round</DialogTitle></DialogHeader>
          <form onSubmit={editRoundForm.handleSubmit} className="space-y-4">
            <FormField label="Date" required error={editRoundForm.errors.roundDate}>
              <Input
                type="date"
                value={editRoundForm.form.roundDate as string}
                onChange={(e) => editRoundForm.setField('roundDate', e.target.value)}
              />
            </FormField>

            {isWaiyk && (
              <FormField label="Winning Bid Amount" error={editRoundForm.errors.winningBid} hint="Profit = Total Amount - Winning Bid, split among all members">
                <Input
                  type="number"
                  step="0.01"
                  value={editRoundForm.form.winningBid as string | number}
                  onChange={(e) => editRoundForm.setField('winningBid', e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="The bid amount winner accepts"
                />
              </FormField>
            )}

            <FormField label="Winning Member" error={editRoundForm.errors.winningMember}>
              <Input
                value={editRoundForm.form.winningMember as string}
                onChange={(e) => editRoundForm.setField('winningMember', e.target.value)}
                placeholder="Optional"
                list="committee-member-names"
              />
              <datalist id="committee-member-names">
                {members.map((m) => <option key={m.id as string} value={m.name as string} />)}
              </datalist>
            </FormField>

            <FormField label="Notes" error={editRoundForm.errors.notes}>
              <Textarea
                value={editRoundForm.form.notes as string}
                onChange={(e) => editRoundForm.setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            {editRoundForm.serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editRoundForm.serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingRound(null)}>Cancel</Button>
              <Button type="submit" disabled={editRoundForm.saving}>{editRoundForm.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Committee Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Committee</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={editForm.errors.name}>
              <Input
                value={editForm.form.name as string}
                onChange={(e) => editForm.setField('name', e.target.value)}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Type" error={editForm.errors.type}>
                <Select
                  options={committeeTypeOptions}
                  value={editForm.form.type as string}
                  onChange={(e) => editForm.setField('type', e.target.value)}
                />
              </FormField>

              <FormField label="Status" error={editForm.errors.status}>
                <Select
                  options={committeeStatusOptions}
                  value={editForm.form.status as string}
                  onChange={(e) => editForm.setField('status', e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Start Date" error={editForm.errors.startDate}>
                <Input
                  type="date"
                  value={editForm.form.startDate as string}
                  onChange={(e) => editForm.setField('startDate', e.target.value)}
                />
              </FormField>

              <FormField label="End Date" error={editForm.errors.endDate}>
                <Input
                  type="date"
                  value={editForm.form.endDate as string}
                  onChange={(e) => editForm.setField('endDate', e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Member Count" error={editForm.errors.memberCount}>
                <Input
                  type="number"
                  min="1"
                  value={editForm.form.memberCount as string | number}
                  onChange={(e) => editForm.setField('memberCount', e.target.value ? parseInt(e.target.value) : '')}
                />
              </FormField>

              <FormField label="Monthly Contribution" error={editForm.errors.monthlyContribution}>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.form.monthlyContribution as string | number}
                  onChange={(e) => editForm.setField('monthlyContribution', e.target.value ? parseFloat(e.target.value) : '')}
                />
              </FormField>
            </div>

            {editIsWaiyk && (
              <FormField label="Total Amount" error={editForm.errors.totalAmount}>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.form.totalAmount as string | number}
                  onChange={(e) => editForm.setField('totalAmount', e.target.value ? parseFloat(e.target.value) : '')}
                />
              </FormField>
            )}

            <FormField label="Notes" error={editForm.errors.notes}>
              <Textarea
                value={editForm.form.notes as string}
                onChange={(e) => editForm.setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            <AdvancedSection>
              <FormField label="Private" error={editForm.errors.isPrivate}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editForm.form.isPrivate as boolean}
                    onChange={(e) => editForm.setField('isPrivate', e.target.checked)}
                  />
                  Mark as private
                </label>
              </FormField>
            </AdvancedSection>

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
