'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { FormField } from '@/components/forms/FormField';
import { useResourceForm } from '@/hooks/useResourceForm';
import { sportsPlayerSchema, sportsPlayerUpdateSchema } from '@/lib/validations/schemas';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useConfirm } from '@/hooks/use-confirm';
import { ArrowLeft, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

interface Player {
  id: string;
  name: string;
  personId?: string | null;
  phone?: string | null;
  role?: string | null;
  matchFee: number;
  isActive: boolean;
}

interface TeamMatch {
  id: string;
  opponent?: string | null;
  venue?: string | null;
  matchDate: string;
  totalExpenses: string;
  totalFees: string;
}

interface Team {
  id: string;
  name: string;
  sport: string;
  isActive: boolean;
  notes?: string | null;
  players: Player[];
  matches: TeamMatch[];
}

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [persons, setPersons] = useState<Array<{ id: string; name: string }>>([]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const fetchTeam = useCallback(() => {
    fetch(`/api/sports/teams/${id}`)
      .then((r) => r.json())
      .then((res) => setTeam(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchTeam();
    fetch('/api/persons').then((r) => r.json()).then((res) => setPersons(res.data || []));
  }, [fetchTeam]);

  // Add Player form
  const addPlayerForm = useResourceForm({
    schema: sportsPlayerSchema,
    initial: { name: '', personId: '', phone: '', role: '', matchFee: 0 },
    onSubmit: (data) =>
      fetch(`/api/sports/teams/${id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, personId: data.personId || null }),
      }),
    onSuccess: () => {
      setShowAddPlayer(false);
      addPlayerForm.reset();
      fetchTeam();
    },
  });

  // Edit Player form
  const editPlayerForm = useResourceForm({
    schema: sportsPlayerUpdateSchema,
    initial: { name: '', personId: '', phone: '', role: '', matchFee: 0, isActive: true },
    onSubmit: (data) =>
      fetch(`/api/sports/teams/${id}/players/${editingPlayer!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, personId: data.personId || null }),
      }),
    onSuccess: () => {
      setEditingPlayer(null);
      fetchTeam();
    },
  });

  function openEditPlayer(player: Player) {
    setEditingPlayer(player);
    editPlayerForm.setForm({
      name: player.name,
      personId: player.personId || '',
      phone: player.phone || '',
      role: player.role || '',
      matchFee: player.matchFee,
      isActive: player.isActive,
    });
  }

  async function handleDeletePlayer(player: Player) {
    if (!(await confirm(`Remove "${player.name}" from the team?`))) return;
    const res = await fetch(`/api/sports/teams/${id}/players/${player.id}`, { method: 'DELETE' });
    if (res.ok) fetchTeam();
    else {
      try { const d = await res.json(); alert(d.error || 'Failed to delete player'); }
      catch { alert('Failed to delete player'); }
    }
  }

  if (loading) return <PageLoading />;
  if (!team) return <div className="text-center py-12 text-muted-foreground">Team not found</div>;

  const personOptions = persons.map((p) => ({ value: p.id, label: p.name }));

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
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary">{team.sport}</Badge>
            <Badge variant={team.isActive ? 'success' : 'outline'}>{team.isActive ? 'Active' : 'Inactive'}</Badge>
          </div>
        </div>
        <Button onClick={() => { addPlayerForm.reset(); setShowAddPlayer(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Player
        </Button>
      </div>

      {/* Players Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Players ({team.players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {team.players.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No players added yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Default Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.players.map((player) => (
                    <TableRow key={player.id} className={!player.isActive ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.role || '—'}</TableCell>
                      <TableCell>{player.phone || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(player.matchFee.toString())}</TableCell>
                      <TableCell>
                        <Badge variant={player.isActive ? 'success' : 'secondary'} className="text-xs">
                          {player.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${player.name}`} onClick={() => openEditPlayer(player)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Delete ${player.name}`} onClick={() => handleDeletePlayer(player)}>
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

      {/* Match History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Match History ({team.matches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {team.matches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No matches recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Opponent</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.matches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>{formatDate(match.matchDate)}</TableCell>
                      <TableCell className="font-medium">{match.opponent || '—'}</TableCell>
                      <TableCell>{match.venue || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(match.totalExpenses)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(match.totalFees)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="View match" asChild>
                          <Link href={`/sports/matches/${match.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Player Modal */}
      <Dialog open={showAddPlayer} onOpenChange={(open) => { setShowAddPlayer(open); if (!open) addPlayerForm.reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Player</DialogTitle></DialogHeader>
          <form onSubmit={addPlayerForm.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={addPlayerForm.errors.name}>
              <Input value={addPlayerForm.form.name as string} onChange={(e) => addPlayerForm.setField('name', e.target.value)} placeholder="Player name" />
            </FormField>
            <FormField label="Person" error={addPlayerForm.errors.personId}>
              <Select
                options={personOptions}
                value={addPlayerForm.form.personId as string}
                onChange={(e) => addPlayerForm.setField('personId', e.target.value)}
                placeholder="Link to a person (optional)"
              />
            </FormField>
            <FormField label="Phone" error={addPlayerForm.errors.phone}>
              <Input value={addPlayerForm.form.phone as string} onChange={(e) => addPlayerForm.setField('phone', e.target.value)} placeholder="Optional" />
            </FormField>
            <FormField label="Role" error={addPlayerForm.errors.role}>
              <Input value={addPlayerForm.form.role as string} onChange={(e) => addPlayerForm.setField('role', e.target.value)} placeholder="e.g., Batsman, Bowler" />
            </FormField>
            <FormField label="Default Match Fee" error={addPlayerForm.errors.matchFee}>
              <Input
                type="number"
                step="0.01"
                value={addPlayerForm.form.matchFee as number || ''}
                onChange={(e) => addPlayerForm.setField('matchFee', e.target.value === '' ? 0 : Number(e.target.value))}
              />
            </FormField>
            {addPlayerForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{addPlayerForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddPlayer(false)}>Cancel</Button>
              <Button type="submit" disabled={addPlayerForm.saving}>{addPlayerForm.saving ? 'Adding...' : 'Add Player'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Player Modal */}
      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Player</DialogTitle></DialogHeader>
          <form onSubmit={editPlayerForm.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={editPlayerForm.errors.name}>
              <Input value={editPlayerForm.form.name as string} onChange={(e) => editPlayerForm.setField('name', e.target.value)} />
            </FormField>
            <FormField label="Person" error={editPlayerForm.errors.personId}>
              <Select
                options={personOptions}
                value={editPlayerForm.form.personId as string}
                onChange={(e) => editPlayerForm.setField('personId', e.target.value)}
                placeholder="Link to a person (optional)"
              />
            </FormField>
            <FormField label="Phone" error={editPlayerForm.errors.phone}>
              <Input value={editPlayerForm.form.phone as string} onChange={(e) => editPlayerForm.setField('phone', e.target.value)} placeholder="Optional" />
            </FormField>
            <FormField label="Role" error={editPlayerForm.errors.role}>
              <Input value={editPlayerForm.form.role as string} onChange={(e) => editPlayerForm.setField('role', e.target.value)} placeholder="e.g., Batsman, Bowler" />
            </FormField>
            <FormField label="Default Match Fee" error={editPlayerForm.errors.matchFee}>
              <Input
                type="number"
                step="0.01"
                value={editPlayerForm.form.matchFee as number || ''}
                onChange={(e) => editPlayerForm.setField('matchFee', e.target.value === '' ? 0 : Number(e.target.value))}
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={editPlayerForm.form.isActive as boolean} onChange={(e) => editPlayerForm.setField('isActive', e.target.checked)} />
              Active
            </label>
            {editPlayerForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editPlayerForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingPlayer(null)}>Cancel</Button>
              <Button type="submit" disabled={editPlayerForm.saving}>{editPlayerForm.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
