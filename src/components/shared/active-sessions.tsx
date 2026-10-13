'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/hooks/use-confirm';
import {
  Monitor, Smartphone, Tablet, Globe, Clock, MapPin, LogOut, ShieldAlert,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SessionInfo {
  id: string;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  token: string;
}

function DeviceIcon({ type }: { type: string | null }) {
  switch (type) {
    case 'mobile': return <Smartphone className="h-5 w-5 text-muted-foreground" />;
    case 'tablet': return <Tablet className="h-5 w-5 text-muted-foreground" />;
    default: return <Monitor className="h-5 w-5 text-muted-foreground" />;
  }
}

export function ActiveSessions() {
  const { data: session } = useSession();
  const { confirm, ConfirmDialog } = useConfirm();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const currentToken = (session as any)?.sessionToken;

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function revokeSession(sessionId: string) {
    const ok = await confirm('This will log out the selected device. Continue?', {
      title: 'Revoke Session',
      confirmLabel: 'Revoke',
      destructive: true,
    });
    if (!ok) return;

    setRevoking(sessionId);
    try {
      await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAllOthers() {
    const ok = await confirm('This will log out all other devices. Continue?', {
      title: 'Revoke All Other Sessions',
      confirmLabel: 'Revoke All',
      destructive: true,
    });
    if (!ok) return;

    setRevoking('all');
    try {
      await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeAll: true, currentSessionToken: currentToken }),
      });
      setSessions((prev) => prev.filter((s) => s.token === currentToken));
    } finally {
      setRevoking(null);
    }
  }

  const otherSessions = sessions.filter((s) => s.token !== currentToken);

  return (
    <>
      {ConfirmDialog}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Active Sessions
            </CardTitle>
            {otherSessions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={revokeAllOthers}
                disabled={revoking === 'all'}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                {revoking === 'all' ? 'Revoking...' : 'Revoke All Others'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions found.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => {
                const isCurrent = s.token === currentToken;
                return (
                  <div
                    key={s.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      isCurrent ? 'border-primary/30 bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="mt-0.5">
                      <DeviceIcon type={s.deviceType} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {s.browser || 'Unknown Browser'}
                        </span>
                        <span className="text-sm text-muted-foreground">on</span>
                        <span className="text-sm font-medium">
                          {s.os || 'Unknown OS'}
                        </span>
                        {isCurrent && (
                          <Badge variant="success" className="text-[10px] px-1.5 py-0">
                            This device
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {s.ipAddress || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Active {formatDistanceToNow(new Date(s.lastActiveAt), { addSuffix: true })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Signed in {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeSession(s.id)}
                        disabled={revoking === s.id}
                        className="text-destructive hover:text-destructive shrink-0"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
