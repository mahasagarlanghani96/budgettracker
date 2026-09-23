'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/forms/FormField';
import { AdvancedSection } from '@/components/forms/AdvancedSection';
import { useResourceForm } from '@/hooks/useResourceForm';
import { committeeSchema } from '@/lib/validations/schemas';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const today = new Date().toISOString().split('T')[0];

const initialForm = {
  name: '',
  type: 'NORMAL',
  memberCount: 0,
  monthlyContribution: 0,
  totalAmount: null as number | null,
  startDate: today,
  endDate: null as string | null,
  userSlots: 1,
  notes: '',
  isPrivate: true,
};

export default function NewCommitteePage() {
  const router = useRouter();
  const createdIdRef = useRef<string | null>(null);

  const { form, errors, serverError, saving, setField, handleSubmit } = useResourceForm({
    schema: committeeSchema,
    initial: initialForm,
    onSubmit: async (data) => {
      const res = await fetch('/api/committees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const body = await res.json();
        createdIdRef.current = body.data?.id ?? null;
        // Return a synthetic ok Response so the hook sees success
        return new Response(JSON.stringify(body), { status: 200 });
      }
      return res;
    },
    onSuccess: () => {
      if (createdIdRef.current) {
        router.push(`/committees/${createdIdRef.current}`);
      }
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/committees"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-2xl font-bold">New Committee</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Name" required error={errors.name}>
              <Input
                value={form.name as string}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g., Office Committee 2024"
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Type" required error={errors.type}>
                <Select
                  options={[{ value: 'NORMAL', label: 'Normal' }, { value: 'WAIYK', label: 'Waiyk (Bidding)' }]}
                  value={form.type as string}
                  onChange={(e) => setField('type', e.target.value)}
                />
              </FormField>
              <FormField label="Total Members (Slots)" required error={errors.memberCount}>
                <Input
                  type="number"
                  min="2"
                  value={form.memberCount as number || ''}
                  onChange={(e) => setField('memberCount', parseInt(e.target.value) || 0)}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Monthly Contribution" required error={errors.monthlyContribution}>
                <Input
                  type="number"
                  step="0.01"
                  value={form.monthlyContribution as number || ''}
                  onChange={(e) => setField('monthlyContribution', parseFloat(e.target.value) || 0)}
                />
              </FormField>
              {form.type === 'WAIYK' && (
                <FormField label="Total Amount" error={errors.totalAmount} hint="Opening amount for Waiyk committee">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.totalAmount != null ? (form.totalAmount as number) : ''}
                    onChange={(e) => setField('totalAmount', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </FormField>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Start Date" required error={errors.startDate}>
                <Input
                  type="date"
                  value={form.startDate as string}
                  onChange={(e) => setField('startDate', e.target.value)}
                />
              </FormField>
              <FormField label="End Date" error={errors.endDate}>
                <Input
                  type="date"
                  value={(form.endDate as string) || ''}
                  onChange={(e) => setField('endDate', e.target.value || null)}
                />
              </FormField>
            </div>

            <FormField label="Your Slots" error={errors.userSlots} hint="Number of slots you hold in this committee">
              <Input
                type="number"
                min="1"
                value={form.userSlots as number}
                onChange={(e) => setField('userSlots', parseInt(e.target.value) || 1)}
              />
            </FormField>

            <FormField label="Notes" error={errors.notes}>
              <Textarea
                value={(form.notes as string) || ''}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Optional"
              />
            </FormField>

            <AdvancedSection>
              <FormField label="Private">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isPrivate as boolean}
                    onChange={(e) => setField('isPrivate', e.target.checked)}
                  />
                  Keep this committee private
                </label>
              </FormField>
            </AdvancedSection>

            {serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{serverError}</p>
            )}
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
