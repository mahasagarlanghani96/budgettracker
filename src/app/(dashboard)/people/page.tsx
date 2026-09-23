'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { Contact, Plus, Pencil, Trash2 } from 'lucide-react';

interface Person {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  relationship?: string | null;
  notes?: string | null;
  isActive: boolean;
  _count?: { loans?: number; committeeMembers?: number; transactions?: number };
}

const emptyForm = { name: '', phone: '', email: '', relationship: '', notes: '', isActive: true };

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function usageText(p: Person) {
  const c = p._count || {};
  const parts: string[] = [];
  if (c.loans) parts.push(plural(c.loans, 'loan'));
  if (c.committeeMembers) parts.push(plural(c.committeeMembers, 'committee'));
  if (c.transactions) parts.push(plural(c.transactions, 'transaction'));
  return parts.length ? parts.join(' · ') : 'Unused';
}

export default function PeoplePage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function fetchPersons() {
    fetch('/api/persons').then((r) => r.json()).then((res) => setPersons(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { fetchPersons(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: Person) {
    setEditing(p);
    setForm({
      name: p.name,
      phone: p.phone || '',
      email: p.email || '',
      relationship: p.relationship || '',
      notes: p.notes || '',
      isActive: p.isActive,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
      relationship: form.relationship || undefined,
      notes: form.notes || undefined,
    };
    try {
      const res = editing
        ? await fetch(`/api/persons/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, isActive: form.isActive }),
          })
        : await fetch('/api/persons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (res.ok) { closeForm(); fetchPersons(); }
      else { const d = await res.json(); alert(d.error || (editing ? 'Failed to update person' : 'Failed to create person')); }
    } finally { setSaving(false); }
  }

  async function handleDelete(p: Person) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/persons/${p.id}`, { method: 'DELETE' });
    if (res.ok) { fetchPersons(); }
    else { const d = await res.json(); alert(d.error || 'Failed to delete person'); }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">People</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Person</Button>
      </div>

      {persons.length === 0 ? (
        <EmptyState icon={<Contact className="h-12 w-12" />} title="No people" description="Add the people you lend to, borrow from, or share committees with" action={<Button onClick={openCreate}>Add Person</Button>} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {persons.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.relationship || '—'}</TableCell>
                    <TableCell>{p.phone || '—'}</TableCell>
                    <TableCell>{p.email || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{usageText(p)}</TableCell>
                    <TableCell><Badge variant={p.isActive ? 'success' : 'secondary'} className="text-xs">{p.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Person Modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Person' : 'Add Person'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Relationship</label><Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="e.g., Friend, Colleague" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Phone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Notes</label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" /></div>
            {editing && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active
              </label>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
