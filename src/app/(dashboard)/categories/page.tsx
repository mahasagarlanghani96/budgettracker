'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/modal';
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

const emptyForm = { name: '', group: 'EXPENSE', icon: '', isActive: true };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function fetchCategories() {
    fetch('/api/categories').then((r) => r.json()).then((res) => setCategories(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }

  useEffect(() => { fetchCategories(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({ name: cat.name, group: cat.group, icon: cat.icon || '', isActive: cat.isActive });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/categories/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name, group: form.group, icon: form.icon || undefined, isActive: form.isActive }),
          })
        : await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name, group: form.group, icon: form.icon || undefined }),
          });
      if (res.ok) { closeForm(); fetchCategories(); }
      else { const d = await res.json(); alert(d.error || (editing ? 'Failed to update category' : 'Failed to create category')); }
    } finally { setSaving(false); }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
    if (res.ok) { fetchCategories(); }
    else { const d = await res.json(); alert(d.error || 'Failed to delete category'); }
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., Groceries" /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Group *</label><Select options={groupOptions} value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Icon</label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Optional (e.g., an emoji)" /></div>
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
