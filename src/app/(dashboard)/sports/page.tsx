'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { FormField } from '@/components/forms/FormField';
import { useResourceForm } from '@/hooks/useResourceForm';
import { sportsTeamSchema, sportsTeamUpdateSchema, sportsMatchSchema } from '@/lib/validations/schemas';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useConfirm } from '@/hooks/use-confirm';
import { Trophy, Plus, Pencil, Trash2, Eye, Users, Swords, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { ListPagination, slicePage } from '@/components/shared/list-pagination';

interface SportsTeam {
  id: string;
  name: string;
  sport: string;
  isActive: boolean;
  notes?: string | null;
  _count?: { players: number; matches: number };
}

interface SportsMatch {
  id: string;
  opponent?: string | null;
  venue?: string | null;
  matchDate: string;
  notes?: string | null;
  totalExpenses: string;
  totalFees: string;
  collectedFees?: string;
  pendingFees?: string;
  totalFeeCount?: number;
  paidFeeCount?: number;
  team: { id: string; name: string };
}

interface TeamPlayer {
  id: string;
  name: string;
  role?: string | null;
  matchFee: number | string;
  isActive: boolean;
}

export default function SportsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [teams, setTeams] = useState<SportsTeam[]>([]);
  const [matches, setMatches] = useState<SportsMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeTab, setActiveTab] = useState<'teams' | 'matches'>('teams');
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SportsTeam | null>(null);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [editingMatch, setEditingMatch] = useState<SportsMatch | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const fetchTeams = useCallback(() => {
    fetch('/api/sports/teams')
      .then((r) => r.json())
      .then((res) => setTeams(res.data || []))
      .catch(console.error);
  }, []);

  const fetchMatches = useCallback(() => {
    fetch('/api/sports/matches')
      .then((r) => r.json())
      .then((res) => setMatches(res.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/sports/teams').then((r) => r.json()),
      fetch('/api/sports/matches').then((r) => r.json()),
    ])
      .then(([tRes, mRes]) => {
        setTeams(tRes.data || []);
        setMatches(mRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fetch players when team is selected in create match modal
  function handleTeamSelect(teamId: string) {
    createMatchForm.setField('teamId', teamId);
    if (!teamId) {
      setTeamPlayers([]);
      setSelectedPlayerIds(new Set());
      return;
    }
    setLoadingPlayers(true);
    fetch(`/api/sports/teams/${teamId}`)
      .then((r) => r.json())
      .then((res) => {
        const players: TeamPlayer[] = (res.data?.players || []).filter((p: TeamPlayer) => p.isActive);
        setTeamPlayers(players);
        setSelectedPlayerIds(new Set(players.map((p) => p.id)));
      })
      .catch(console.error)
      .finally(() => setLoadingPlayers(false));
  }

  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function toggleAllPlayers() {
    if (selectedPlayerIds.size === teamPlayers.length) {
      setSelectedPlayerIds(new Set());
    } else {
      setSelectedPlayerIds(new Set(teamPlayers.map((p) => p.id)));
    }
  }

  // Create Team form
  const createTeamForm = useResourceForm({
    schema: sportsTeamSchema,
    initial: { name: '', sport: 'Cricket', notes: '' },
    onSubmit: (data) =>
      fetch('/api/sports/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setShowCreateTeam(false);
      createTeamForm.reset();
      fetchTeams();
    },
  });

  // Edit Team form
  const editTeamForm = useResourceForm({
    schema: sportsTeamUpdateSchema,
    initial: { name: '', sport: 'Cricket', notes: '', isActive: true },
    onSubmit: (data) =>
      fetch(`/api/sports/teams/${editingTeam!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setEditingTeam(null);
      fetchTeams();
    },
  });

  // Create Match form — sends playerIds alongside the form data
  const createMatchForm = useResourceForm({
    schema: sportsMatchSchema,
    initial: { teamId: '', opponent: '', venue: '', matchDate: today, notes: '' },
    onSubmit: (data) =>
      fetch('/api/sports/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, playerIds: Array.from(selectedPlayerIds) }),
      }),
    onSuccess: () => {
      setShowCreateMatch(false);
      createMatchForm.reset();
      setTeamPlayers([]);
      setSelectedPlayerIds(new Set());
      fetchMatches();
    },
  });

  // Edit Match form
  const editMatchForm = useResourceForm({
    schema: sportsMatchSchema,
    initial: { teamId: '', opponent: '', venue: '', matchDate: today, notes: '' },
    onSubmit: (data) =>
      fetch(`/api/sports/matches/${editingMatch!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setEditingMatch(null);
      fetchMatches();
    },
  });

  function openEditMatch(match: SportsMatch) {
    setEditingMatch(match);
    editMatchForm.setForm({
      teamId: match.team.id,
      opponent: match.opponent || '',
      venue: match.venue || '',
      matchDate: match.matchDate.split('T')[0],
      notes: match.notes || '',
    });
  }

  async function handleDeleteMatch(match: SportsMatch) {
    if (!(await confirm(`Delete this match? All expenses and fees will be removed. This cannot be undone.`))) return;
    const res = await fetch(`/api/sports/matches/${match.id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchMatches();
    } else {
      try {
        const d = await res.json();
        alert(d.error || 'Failed to delete match');
      } catch {
        alert('Failed to delete match');
      }
    }
  }

  function openEditTeam(team: SportsTeam) {
    setEditingTeam(team);
    editTeamForm.setForm({
      name: team.name,
      sport: team.sport,
      notes: team.notes || '',
      isActive: team.isActive,
    });
  }

  async function handleDeleteTeam(team: SportsTeam) {
    if (!(await confirm(`Delete "${team.name}"? This cannot be undone.`))) return;
    const res = await fetch(`/api/sports/teams/${team.id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchTeams();
      fetchMatches();
    } else {
      try {
        const d = await res.json();
        alert(d.error || 'Failed to delete team');
      } catch {
        alert('Failed to delete team');
      }
    }
  }

  const paginatedTeams = slicePage(teams, page, pageSize);
  const paginatedMatches = slicePage(matches, page, pageSize);

  if (loading) return <PageLoading />;

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div className="space-y-6">
      {ConfirmDialog}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">Sports</h1>
        <div className="flex gap-2">
          {activeTab === 'teams' && (
            <Button onClick={() => { createTeamForm.reset(); setShowCreateTeam(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New Team
            </Button>
          )}
          {activeTab === 'matches' && (
            <Button onClick={() => { createMatchForm.reset({ teamId: '', opponent: '', venue: '', matchDate: today, notes: '' }); setTeamPlayers([]); setSelectedPlayerIds(new Set()); setShowCreateMatch(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New Match
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'teams' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-secondary)] hover:text-foreground'}`}
          onClick={() => { setActiveTab('teams'); setPage(1); }}
        >
          <Users className="h-4 w-4 inline mr-1.5" />
          Teams
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'matches' ? 'border-primary text-primary' : 'border-transparent text-[var(--text-secondary)] hover:text-foreground'}`}
          onClick={() => { setActiveTab('matches'); setPage(1); }}
        >
          <Swords className="h-4 w-4 inline mr-1.5" />
          Matches
        </button>
      </div>

      {/* Teams Section */}
      {activeTab === 'teams' && (
        <>
          {teams.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-12 w-12" />}
              title="No teams yet"
              description="Create a team to start tracking sports expenses"
              action={<Button onClick={() => { createTeamForm.reset(); setShowCreateTeam(true); }}>Create Team</Button>}
            />
          ) : (
            <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedTeams.map((team) => (
                <Card key={team.id} className={`h-full ${!team.isActive ? 'opacity-50' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Link href={`/sports/teams/${team.id}`} className="hover:underline">
                        <CardTitle className="text-base">{team.name}</CardTitle>
                      </Link>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">{team.sport}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`View ${team.name}`} asChild>
                          <Link href={`/sports/teams/${team.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${team.name}`} onClick={() => openEditTeam(team)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Delete ${team.name}`} onClick={() => handleDeleteTeam(team)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Players</span>
                      <span className="font-medium">{team._count?.players ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Matches</span>
                      <span className="font-medium">{team._count?.matches ?? 0}</span>
                    </div>
                    {team.notes && <p className="text-xs text-[var(--text-secondary)] truncate">{team.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
            <ListPagination page={page} pageSize={pageSize} totalItems={teams.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          )}
        </>
      )}

      {/* Matches Section */}
      {activeTab === 'matches' && (
        <>
          {matches.length === 0 ? (
            <EmptyState
              icon={<Swords className="h-12 w-12" />}
              title="No matches yet"
              description="Schedule a match to start tracking expenses and fees"
              action={
                teams.length > 0 ? (
                  <Button onClick={() => { createMatchForm.reset({ teamId: '', opponent: '', venue: '', matchDate: today, notes: '' }); setTeamPlayers([]); setSelectedPlayerIds(new Set()); setShowCreateMatch(true); }}>Create Match</Button>
                ) : (
                  <Button onClick={() => { setActiveTab('teams'); createTeamForm.reset(); setShowCreateTeam(true); }}>Create a Team First</Button>
                )
              }
            />
          ) : (
            <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Opponent</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-center">Payment Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMatches.map((match) => {
                    const total = match.totalFeeCount ?? 0;
                    const paid = match.paidFeeCount ?? 0;
                    const allPaid = total > 0 && paid === total;
                    return (
                      <TableRow key={match.id}>
                        <TableCell>{formatDate(match.matchDate)}</TableCell>
                        <TableCell className="font-medium">{match.team.name}</TableCell>
                        <TableCell>{match.opponent || '—'}</TableCell>
                        <TableCell>{match.venue || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(match.totalExpenses)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(match.totalFees)}</TableCell>
                        <TableCell className="text-center">
                          {total === 0 ? (
                            <span className="text-xs text-[var(--text-secondary)]">No fees</span>
                          ) : allPaid ? (
                            <Badge variant="success" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              All Paid
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-xs">
                              {paid}/{total} Paid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="View match" asChild>
                              <Link href={`/sports/matches/${match.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit match" onClick={() => openEditMatch(match)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Delete match" onClick={() => handleDeleteMatch(match)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <ListPagination page={page} pageSize={pageSize} totalItems={matches.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          )}
        </>
      )}

      {/* Create Team Modal */}
      <Dialog open={showCreateTeam} onOpenChange={(open) => { setShowCreateTeam(open); if (!open) createTeamForm.reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Team</DialogTitle></DialogHeader>
          <form onSubmit={createTeamForm.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={createTeamForm.errors.name}>
              <Input value={createTeamForm.form.name as string} onChange={(e) => createTeamForm.setField('name', e.target.value)} placeholder="e.g., Weekend Warriors" />
            </FormField>
            <FormField label="Sport" required error={createTeamForm.errors.sport}>
              <Input value={createTeamForm.form.sport as string} onChange={(e) => createTeamForm.setField('sport', e.target.value)} placeholder="e.g., Cricket" />
            </FormField>
            <FormField label="Notes" error={createTeamForm.errors.notes}>
              <Textarea value={createTeamForm.form.notes as string} onChange={(e) => createTeamForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            {createTeamForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{createTeamForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
              <Button type="submit" disabled={createTeamForm.saving}>{createTeamForm.saving ? 'Creating...' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Team Modal */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Team</DialogTitle></DialogHeader>
          <form onSubmit={editTeamForm.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={editTeamForm.errors.name}>
              <Input value={editTeamForm.form.name as string} onChange={(e) => editTeamForm.setField('name', e.target.value)} />
            </FormField>
            <FormField label="Sport" required error={editTeamForm.errors.sport}>
              <Input value={editTeamForm.form.sport as string} onChange={(e) => editTeamForm.setField('sport', e.target.value)} />
            </FormField>
            <FormField label="Notes" error={editTeamForm.errors.notes}>
              <Textarea value={editTeamForm.form.notes as string} onChange={(e) => editTeamForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={editTeamForm.form.isActive as boolean} onChange={(e) => editTeamForm.setField('isActive', e.target.checked)} />
              Active
            </label>
            {editTeamForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editTeamForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingTeam(null)}>Cancel</Button>
              <Button type="submit" disabled={editTeamForm.saving}>{editTeamForm.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Match Modal */}
      <Dialog open={showCreateMatch} onOpenChange={(open) => { setShowCreateMatch(open); if (!open) { createMatchForm.reset(); setTeamPlayers([]); setSelectedPlayerIds(new Set()); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Match</DialogTitle></DialogHeader>
          <form onSubmit={createMatchForm.handleSubmit} className="space-y-4">
            <FormField label="Team" required error={createMatchForm.errors.teamId}>
              <Select
                options={teamOptions}
                value={createMatchForm.form.teamId as string}
                onChange={(e) => handleTeamSelect(e.target.value)}
                placeholder="Select team"
              />
            </FormField>

            {/* Player Selection */}
            {(createMatchForm.form.teamId as string) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Players ({selectedPlayerIds.size}/{teamPlayers.length})</label>
                  {teamPlayers.length > 0 && (
                    <button type="button" className="text-xs text-primary hover:underline" onClick={toggleAllPlayers}>
                      {selectedPlayerIds.size === teamPlayers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                {loadingPlayers ? (
                  <p className="text-xs text-[var(--text-secondary)] py-2">Loading players...</p>
                ) : teamPlayers.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)] py-2">No active players in this team. <Link href={`/sports/teams/${createMatchForm.form.teamId}`} className="text-primary hover:underline">Add players</Link></p>
                ) : (
                  <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                    {teamPlayers.map((player) => (
                      <label key={player.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--glass-bg)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPlayerIds.has(player.id)}
                          onChange={() => togglePlayer(player.id)}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{player.name}</span>
                          {player.role && <span className="text-xs text-[var(--text-secondary)] ml-2">{player.role}</span>}
                        </div>
                        <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                          {formatCurrency(player.matchFee.toString())}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {selectedPlayerIds.size > 0 && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Fees will be auto-generated for {selectedPlayerIds.size} selected player{selectedPlayerIds.size !== 1 ? 's' : ''} based on their default match fee.
                  </p>
                )}
              </div>
            )}

            <FormField label="Opponent" error={createMatchForm.errors.opponent}>
              <Input value={createMatchForm.form.opponent as string} onChange={(e) => createMatchForm.setField('opponent', e.target.value)} placeholder="e.g., City XI" />
            </FormField>
            <FormField label="Venue" error={createMatchForm.errors.venue}>
              <Input value={createMatchForm.form.venue as string} onChange={(e) => createMatchForm.setField('venue', e.target.value)} placeholder="e.g., City Ground" />
            </FormField>
            <FormField label="Match Date" required error={createMatchForm.errors.matchDate}>
              <Input type="date" value={createMatchForm.form.matchDate as string} onChange={(e) => createMatchForm.setField('matchDate', e.target.value)} />
            </FormField>
            <FormField label="Notes" error={createMatchForm.errors.notes}>
              <Textarea value={createMatchForm.form.notes as string} onChange={(e) => createMatchForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            {createMatchForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{createMatchForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateMatch(false)}>Cancel</Button>
              <Button type="submit" disabled={createMatchForm.saving}>{createMatchForm.saving ? 'Creating...' : 'Create Match'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Match Modal */}
      <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Match</DialogTitle></DialogHeader>
          <form onSubmit={editMatchForm.handleSubmit} className="space-y-4">
            <FormField label="Team" required error={editMatchForm.errors.teamId}>
              <Select
                options={teamOptions}
                value={editMatchForm.form.teamId as string}
                onChange={(e) => editMatchForm.setField('teamId', e.target.value)}
                placeholder="Select team"
              />
            </FormField>
            <FormField label="Opponent" error={editMatchForm.errors.opponent}>
              <Input value={editMatchForm.form.opponent as string} onChange={(e) => editMatchForm.setField('opponent', e.target.value)} placeholder="e.g., City XI" />
            </FormField>
            <FormField label="Venue" error={editMatchForm.errors.venue}>
              <Input value={editMatchForm.form.venue as string} onChange={(e) => editMatchForm.setField('venue', e.target.value)} placeholder="e.g., City Ground" />
            </FormField>
            <FormField label="Match Date" required error={editMatchForm.errors.matchDate}>
              <Input type="date" value={editMatchForm.form.matchDate as string} onChange={(e) => editMatchForm.setField('matchDate', e.target.value)} />
            </FormField>
            <FormField label="Notes" error={editMatchForm.errors.notes}>
              <Textarea value={editMatchForm.form.notes as string} onChange={(e) => editMatchForm.setField('notes', e.target.value)} placeholder="Optional" />
            </FormField>
            {editMatchForm.serverError && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{editMatchForm.serverError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingMatch(null)}>Cancel</Button>
              <Button type="submit" disabled={editMatchForm.saving}>{editMatchForm.saving ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
