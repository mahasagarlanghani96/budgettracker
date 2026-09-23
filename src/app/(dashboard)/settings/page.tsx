'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoading } from '@/components/ui/loading';
import { User, Lock, Download, CheckCircle2 } from 'lucide-react';
import { usePwaInstall } from '@/hooks/use-pwa-install';

export default function SettingsPage() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall();
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [nameForm, setNameForm] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        setProfile(res.data);
        setNameForm(res.data?.name || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameForm }),
      });
      if (res.ok) {
        setMessage('Profile updated successfully');
        const data = await res.json();
        setProfile(data.data);
      } else {
        const data = await res.json();
        setMessage(data.error || 'Failed to update');
      }
    } finally { setSaving(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setMessage('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      if (res.ok) {
        setMessage('Password changed successfully');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        setMessage(data.error || 'Failed to change password');
      }
    } finally { setSaving(false); }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {message && (
        <div className={`p-3 rounded-md text-sm ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={profile?.email || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={nameForm} onChange={(e) => setNameForm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update Profile'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Password</label>
              <Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Changing...' : 'Change Password'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" /> App</CardTitle>
        </CardHeader>
        <CardContent>
          {isInstalled ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Budget Tracker is installed on this device.
            </p>
          ) : canInstall ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Install Budget Tracker for quick access and offline support.
              </p>
              <Button size="sm" onClick={() => promptInstall()}>Install App</Button>
            </div>
          ) : isIOS ? (
            <p className="text-sm text-muted-foreground">
              To install: tap the Share icon in Safari, then choose &ldquo;Add to Home Screen&rdquo;.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your browser doesn&rsquo;t support one-tap install. Check your browser&rsquo;s menu for an
              &ldquo;Install app&rdquo; or &ldquo;Add to Home Screen&rdquo; option.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
