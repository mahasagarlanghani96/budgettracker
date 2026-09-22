'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';

interface SearchResults {
  transactions: Array<{ id: string; description: string; amount: { toString(): string }; type: string; transactionDate: string }>;
  accounts: Array<{ id: string; name: string; accountType: string }>;
  persons: Array<{ id: string; name: string; relationship?: string }>;
  loans: Array<{ id: string; person: { name: string }; direction: string; amount: { toString(): string }; status: string }>;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback((q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((res) => setResults(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const hasResults = results && (results.transactions.length > 0 || results.accounts.length > 0 || results.persons.length > 0 || results.loans.length > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10 h-12 text-base"
          placeholder="Search transactions, accounts, persons, loans..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {loading && <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>}

      {query.length >= 2 && !loading && !hasResults && (
        <p className="text-sm text-muted-foreground text-center py-8">No results found for &ldquo;{query}&rdquo;</p>
      )}

      {results && results.accounts.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Accounts ({results.accounts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {results.accounts.map((a) => (
              <Link key={a.id} href={`/accounts/${a.id}`} className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors">
                <span className="font-medium">{a.name}</span>
                <Badge variant="secondary" className="text-xs">{a.accountType}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {results && results.persons.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">People ({results.persons.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {results.persons.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-md">
                <span className="font-medium">{p.name}</span>
                {p.relationship && <span className="text-xs text-muted-foreground">{p.relationship}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {results && results.transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Transactions ({results.transactions.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {results.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors">
                <div>
                  <p className="font-medium text-sm">{t.description || 'No description'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(t.transactionDate)} · {t.type}</p>
                </div>
                <span className="font-medium tabular-nums">{formatCurrency(t.amount.toString())}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {results && results.loans.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Loans ({results.loans.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {results.loans.map((l) => (
              <Link key={l.id} href={`/loans/${l.id}`} className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors">
                <div>
                  <p className="font-medium text-sm">{l.person.name}</p>
                  <p className="text-xs text-muted-foreground">{l.direction}</p>
                </div>
                <div className="text-right">
                  <span className="font-medium tabular-nums">{formatCurrency(l.amount.toString())}</span>
                  <Badge variant={l.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs ml-2">{l.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
