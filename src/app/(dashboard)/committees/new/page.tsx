'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewCommitteePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'NORMAL', memberCount: '', monthlyContribution: '', totalAmount: '', startDate: new Date().toISOString().split('T')[0], notes: '', isPrivate: true, userSlots: 1,
  });

  // Auto-calculate total
  const calculatedTotal = form.memberCount && form.monthlyContribution
    ? (parseInt(form.memberCount) * parseFloat(form.monthlyContribution)).toString()
    : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/committees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          memberCount: parseInt(form.memberCount),
          monthlyContribution: parseFloat(form.monthlyContribution),
          totalAmount: parseFloat(form.totalAmount || calculatedTotal),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/committees/${data.data.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/committees"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">New Committee</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Office Committee 2024" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type *</label>
                <Select options={[{ value: 'NORMAL', label: 'Normal' }, { value: 'WAIYK', label: 'Waiyk (Bidding)' }]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Members (Slots) *</label>
                <Input type="number" min="2" value={form.memberCount} onChange={(e) => setForm({ ...form, memberCount: e.target.value })} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Monthly Amount *</label>
                <Input type="number" step="0.01" value={form.monthlyContribution} onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Amount</label>
                <Input type="number" step="0.01" value={form.totalAmount || calculatedTotal} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} placeholder="Auto-calculated" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Link href="/committees"><Button type="button" variant="outline">Cancel</Button></Link>
              <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Committee'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
