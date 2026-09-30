'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Trash2 } from 'lucide-react';

interface SharedUser {
  id: string;
  name: string;
  email: string;
}

interface Share {
  id: string;
  accessLevel: 'VIEW' | 'EDIT' | 'ADMIN';
  sharedWith: SharedUser;
  createdAt: string;
}

const accessOptions = [
  { value: 'VIEW', label: 'View' },
  { value: 'EDIT', label: 'Edit' },
  { value: 'ADMIN', label: 'Admin' },
];

const accessBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  VIEW: 'secondary',
  EDIT: 'default',
  ADMIN: 'destructive',
};

interface SharedAccessSectionProps {
  resourceType: string;
  resourceId: string;
}

export function SharedAccessSection({ resourceType, resourceId }: SharedAccessSectionProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState('VIEW');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/shared-access?resourceType=${resourceType}&resourceId=${resourceId}`)
      .then((r) => r.json())
      .then((res) => setShares(res.data || []))
      .catch(() => setError('Failed to load shared access'));
  }, [resourceType, resourceId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setInviting(true);
    setError(null);

    try {
      const res = await fetch('/api/shared-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), resourceType, resourceId, accessLevel }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to invite');
      } else {
        setShares((prev) => {
          const existing = prev.findIndex((s) => s.sharedWith.id === json.data.sharedWith.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = json.data;
            return updated;
          }
          return [json.data, ...prev];
        });
        setEmail('');
      }
    } catch {
      setError('Failed to invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeAccess(shareId: string, newLevel: string) {
    try {
      const res = await fetch(`/api/shared-access/${shareId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessLevel: newLevel }),
      });
      const json = await res.json();
      if (res.ok) {
        setShares((prev) => prev.map((s) => (s.id === shareId ? json.data : s)));
      }
    } catch {
      setError('Failed to update access');
    }
  }

  async function handleRevoke(shareId: string) {
    try {
      const res = await fetch(`/api/shared-access/${shareId}`, { method: 'DELETE' });
      if (res.ok) {
        setShares((prev) => prev.filter((s) => s.id !== shareId));
      }
    } catch {
      setError('Failed to revoke access');
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Shared Access
          {shares.length > 0 && (
            <span className="text-xs text-muted-foreground">({shares.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
        )}

        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter email to invite"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Select
            options={accessOptions}
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value)}
            className="w-28"
          />
          <Button type="submit" size="sm" disabled={inviting || !email.trim()}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            {inviting ? 'Inviting...' : 'Invite'}
          </Button>
        </form>

        {shares.length === 0 ? (
          <p className="text-sm text-muted-foreground py-1">Not shared with anyone yet.</p>
        ) : (
          <ul className="divide-y">
            {shares.map((share) => (
              <li key={share.id} className="flex items-center gap-3 py-2.5 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{share.sharedWith.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{share.sharedWith.email}</p>
                </div>
                <Select
                  options={accessOptions}
                  value={share.accessLevel}
                  onChange={(e) => handleChangeAccess(share.id, e.target.value)}
                  className="w-24 h-8 text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRevoke(share.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
