'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLoading, EmptyState } from '@/components/ui/loading';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Users, Plus } from 'lucide-react';
import Link from 'next/link';

interface Committee {
  id: string;
  name: string;
  type: 'NORMAL' | 'WAIYK';
  status: string;
  memberCount: number;
  monthlyContribution: { toString(): string };
  totalAmount: { toString(): string };
  startDate: string;
  _count: { members: number; rounds: number };
}

export default function CommitteesPage() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/committees')
      .then((r) => r.json())
      .then((res) => setCommittees(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Committees</h1>
        <Link href="/committees/new">
          <Button><Plus className="h-4 w-4 mr-2" /> New Committee</Button>
        </Link>
      </div>

      {committees.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No committees yet"
          description="Create and manage your committee (BC) records"
          action={<Link href="/committees/new"><Button>Create Committee</Button></Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {committees.map((c) => (
            <Link key={c.id} href={`/committees/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <div className="flex gap-1">
                      <Badge variant={c.type === 'WAIYK' ? 'warning' : 'secondary'} className="text-xs">{c.type}</Badge>
                      <Badge variant={c.status === 'ACTIVE' ? 'success' : 'outline'} className="text-xs">{c.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly</span>
                    <span className="font-medium tabular-nums">{formatCurrency(c.monthlyContribution.toString())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Pool</span>
                    <span className="font-medium tabular-nums">{formatCurrency(c.totalAmount.toString())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members</span>
                    <span>{c._count.members} / {c.memberCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rounds</span>
                    <span>{c._count.rounds} / {c.memberCount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">Started {formatDate(c.startDate)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
