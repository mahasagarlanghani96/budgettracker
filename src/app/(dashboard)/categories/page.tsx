'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
import { FormField } from '@/components/forms/FormField';
import { useResourceForm } from '@/hooks/useResourceForm';
import { categorySchema, categoryUpdateSchema } from '@/lib/validations/schemas';
import { Tags, Plus, Pencil, Trash2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  group: 'INCOME' | 'EXPENSE';
  icon?: string | null;
  isSystem: boolean;
  isActive: boolean;
}

const groupOptions = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
];

const emptyCreate = { name: '', group: 'EXPENSE', icon: '' };
const emptyEdit = { name: '', group: 'EXPENSE', icon: '', isActive: true };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCategories = useCallback(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((res) => setCategories(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  const createForm = useResourceForm({
    schema: categorySchema,
    initial: emptyCreate,
    onSubmit: (data) =>
      fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { closeForm(); fetchCategories(); },
  });

  const editFormHook = useResourceForm({
    schema: categoryUpdateSchema,
    initial: emptyEdit,
    onSubmit: (data) =>
      fetch(`/api/categories/${editing?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { closeForm(); fetchCategories(); },
  });

  const rf = editing ? editFormHook : createForm;

  function openCreate() {
    setEditing(null);
    createForm.reset(emptyCreate);
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    editFormHook.reset({ name: cat.name, group: cat.group, icon: cat.icon || '', isActive: cat.isActive });
    setShowForm(true);
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
    if (res.ok) { fetchCategories(); }
    else {
      try { const d = await res.json(); setDeleteError(d.error || 'Failed to delete category'); }
      catch { setDeleteError('Failed to delete category'); }
    }
  }

  if (loading) return <PageLoading />;

  const sections: Array<{ group: 'INCOME' | 'EXPENSE'; title: string }> = [
    { group: 'INCOME', title: 'Income' },
    { group: 'EXPENSE', title: 'Expense' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Category</Button>
      </div>

      {deleteError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{deleteError}</p>
      )}

      {categories.length === 0 ? (
        <EmptyState icon={<Tags className="h-12 w-12" />} title="No categories" description="Create categories to organise your income and expenses" action={<Button onClick={openCreate}>Add Category</Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map(({ group, title }) => {
            const items = categories.filter((c) => c.group === group);
            return (
              <Card key={group}>
                <CardHeader><CardTitle className="text-base">{title} ({items.length})</CardTitle></CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No {title.toLowerCase()} categories</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((cat) => (
                          <TableRow key={cat.id}>
                            <TableCell className="font-medium">
                              {cat.icon ? <span className="mr-1.5">{cat.icon}</span> : null}
                              {cat.name}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant={cat.group === 'INCOME' ? 'success' : 'warning'} className="text-xs">{cat.group === 'INCOME' ? 'Income' : 'Expense'}</Badge>
                                <Badge variant={cat.isActive ? 'success' : 'secondary'} className="text-xs">{cat.isActive ? 'Active' : 'Inactive'}</Badge>
                                {cat.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {!cat.isSystem && (
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(cat)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Category Modal */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle></DialogHeader>
          <form onSubmit={rf.handleSubmit} className="space-y-4">
            <FormField label="Name" required error={rf.errors.name}>
              <Input
                value={rf.form.name as string}
                onChange={(e) => rf.setField('name', e.target.value)}
                placeholder="e.g., Groceries"
              />
            </FormField>

            <FormField label="Group" required error={rf.errors.group}>
              <Select
                options={groupOptions}
                value={rf.form.group as string}
                onChange={(e) => rf.setField('group', e.target.value)}
              />
            </FormField>

            <FormField label="Icon" hint="Emoji or short icon text" error={rf.errors.icon}>
              <Input
                value={rf.form.icon as string}
                onChange={(e) => rf.setField('icon', e.target.value)}
                placeholder="Optional (e.g., an emoji)"
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
                  Category is active
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
