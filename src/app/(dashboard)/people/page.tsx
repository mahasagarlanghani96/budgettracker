'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { FormField } from '@/components/forms/FormField';
import { useResourceForm } from '@/hooks/useResourceForm';
import { personSchema, personUpdateSchema } from '@/lib/validations/schemas';
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

const emptyCreate = { name: '', phone: '', email: '', relationship: '', notes: '' };
const emptyEdit = { name: '', phone: '', email: '', relationship: '', notes: '', isActive: true };

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
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchPersons = useCallback(() => {
    fetch('/api/persons')
      .then((r) => r.json())
      .then((res) => setPersons(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPersons(); }, [fetchPersons]);

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  const createForm = useResourceForm({
    schema: personSchema,
    initial: emptyCreate,
    onSubmit: (data) =>
      fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { closeForm(); fetchPersons(); },
  });

  const editFormHook = useResourceForm({
    schema: personUpdateSchema,
    initial: emptyEdit,
    onSubmit: (data) =>
      fetch(`/api/persons/${editing?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { closeForm(); fetchPersons(); },
  });

  const rf = editing ? editFormHook : createForm;

  function openCreate() {
    setEditing(null);
    createForm.reset(emptyCreate);
    setShowForm(true);
  }

  function openEdit(p: Person) {
    setEditing(p);
    editFormHook.reset({
      name: p.name,
      phone: p.phone || '',
      email: p.email || '',
      relationship: p.relationship || '',
      notes: p.notes || '',
      isActive: p.isActive,
    });
    setShowForm(true);
  }

  async function handleDelete(p: Person) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    const res = await fetch(`/api/persons/${p.id}`, { method: 'DELETE' });
    if (res.ok) { fetchPersons(); }
    else {
      try { const d = await res.json(); setDeleteError(d.error || 'Failed to delete person'); }
      catch { setDeleteError('Failed to delete person'); }
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">People</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Person</Button>
      </div>

      {deleteError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{deleteError}</p>
      )}

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
          <form onSubmit={rf.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={rf.errors.name}>
              <Input
                value={rf.form.name as string}
                onChange={(e) => rf.setField('name', e.target.value)}
              />
            </FormField>

            <FormField label="Phone" error={rf.errors.phone}>
              <Input
                type="tel"
                value={rf.form.phone as string}
                onChange={(e) => rf.setField('phone', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            <FormField label="Email" error={rf.errors.email}>
              <Input
                type="email"
                value={rf.form.email as string}
                onChange={(e) => rf.setField('email', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            <FormField label="Relationship" error={rf.errors.relationship}>
              <Input
                value={rf.form.relationship as string}
                onChange={(e) => rf.setField('relationship', e.target.value)}
                placeholder="e.g., Friend, Colleague"
              />
            </FormField>

            <FormField label="Notes" error={rf.errors.notes}>
              <Textarea
                value={rf.form.notes as string}
                onChange={(e) => rf.setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            {editing && (
              <FormField label="Active" error={rf.errors.isActive}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rf.form.isActive as boolean}
                    onChange={(e) => rf.setField('isActive', e.target.checked)}
                  />
                  Person is active
                </label>
              </FormField>
            )}

            {rf.serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{rf.serverError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit" disabled={rf.saving}>{rf.saving ? 'Saving...' : editing ? 'Save Changes' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
