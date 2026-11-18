'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/ui/loading';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart3, X, Filter, ChevronDown, ChevronUp,
  Calendar, Wallet, Tag, Users, ArrowUpDown,
  TrendingUp, TrendingDown,
} from 'lucide-react';

// ── Date Presets ─────────────────────────────────────────────────

type DatePreset =
  | 'current_week'
  | 'previous_week'
  | 'current_month'
  | 'previous_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'current_year'
  | 'previous_year'
  | 'all_time'
  | 'custom';

const DATE_PRESET_OPTIONS = [
  { value: 'current_week', label: 'Current Week' },
  { value: 'previous_week', label: 'Previous Week' },
  { value: 'current_month', label: 'Current Month' },
  { value: 'previous_month', label: 'Previous Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'current_year', label: 'Current Year' },
  { value: 'previous_year', label: 'Previous Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

function getPresetDates(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  switch (preset) {
    case 'current_week': {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: fmt(monday), to: fmt(sunday) };
    }
    case 'previous_week': {
      const day = now.getDay();
      const thisMonday = new Date(now);
      thisMonday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1));
      const prevMonday = new Date(thisMonday);
      prevMonday.setDate(thisMonday.getDate() - 7);
      const prevSunday = new Date(prevMonday);
      prevSunday.setDate(prevMonday.getDate() + 6);
      return { from: fmt(prevMonday), to: fmt(prevSunday) };
    }
    case 'current_month':
      return {
        from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: fmt(now),
      };
    case 'previous_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(first), to: fmt(last) };
    }
    case 'last_3_months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { from: fmt(start), to: fmt(now) };
    }
    case 'last_6_months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { from: fmt(start), to: fmt(now) };
    }
    case 'current_year':
      return {
        from: fmt(new Date(now.getFullYear(), 0, 1)),
        to: fmt(now),
      };
    case 'previous_year': {
      const first = new Date(now.getFullYear() - 1, 0, 1);
      const last = new Date(now.getFullYear() - 1, 11, 31);
      return { from: fmt(first), to: fmt(last) };
    }
    case 'all_time':
      return { from: '2000-01-01', to: fmt(now) };
    default:
      return {
        from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: fmt(now),
      };
  }
}

// ── Report Types ─────────────────────────────────────────────────

const REPORT_TYPE_OPTIONS = [
  { value: 'summary', label: 'Summary' },
  { value: 'income-expense', label: 'By Category' },
  { value: 'daily', label: 'Daily Breakdown' },
  { value: 'by-account', label: 'By Account' },
  { value: 'by-person', label: 'By Person' },
  { value: 'by-type', label: 'By Transaction Type' },
];

// ── Transaction Type Options ─────────────────────────────────────

const TRANSACTION_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'LOAN_GIVEN', label: 'Loan Given' },
  { value: 'LOAN_TAKEN', label: 'Loan Taken' },
  { value: 'LOAN_REPAYMENT_RECEIVED', label: 'Repayment Received' },
  { value: 'LOAN_REPAYMENT_MADE', label: 'Repayment Made' },
  { value: 'SAVINGS_DEPOSIT', label: 'Savings Deposit' },
  { value: 'SAVINGS_WITHDRAWAL', label: 'Savings Withdrawal' },
  { value: 'INVESTMENT', label: 'Investment' },
  { value: 'INVESTMENT_RETURN', label: 'Investment Return' },
  { value: 'COMMITTEE_CONTRIBUTION', label: 'Committee Contribution' },
  { value: 'COMMITTEE_RECEIVING', label: 'Committee Receiving' },
  { value: 'PLOT_PAYMENT', label: 'Plot Payment' },
  { value: 'SPORTS_FEE_RECEIVED', label: 'Sports Fee Received' },
  { value: 'SPORTS_EXPENSE', label: 'Sports Expense' },
  { value: 'OTHER', label: 'Other' },
];

// ── Report Data Types ────────────────────────────────────────────

interface ReportData {
  type?: string;
  totalIncome?: string;
  totalExpense?: string;
  netSavings?: string;
  totalTransfers?: string;
  transactionCounts?: { income: number; expense: number; transfers: number };
  incomeByCategory?: Array<{ name: string; total: string; count: number }>;
  expenseByCategory?: Array<{ name: string; total: string; count: number }>;
  dailyData?: Array<{ date: string; income: string; expense: string; net: string; count: number }>;
  accountData?: Array<{ id: string; name: string; inflow: string; outflow: string; net: string; count: number }>;
  personData?: Array<{ id: string; name: string; inflow: string; outflow: string; net: string; count: number }>;
  typeData?: Array<{ type: string; label: string; total: string; count: number; flow: string }>;
}

interface Filters {
  datePreset: DatePreset;
  from: string;
  to: string;
  reportType: string;
  accountId: string;
  categoryId: string;
  personId: string;
  transactionType: string;
}

// ── Page ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const defaultPreset: DatePreset = 'current_month';
  const defaults = getPresetDates(defaultPreset);

  const [filters, setFilters] = useState<Filters>({
    datePreset: defaultPreset,
    from: defaults.from,
    to: defaults.to,
    reportType: 'summary',
    accountId: '',
    categoryId: '',
    personId: '',
    transactionType: '',
  });

  const [data, setData] = useState<ReportData>({});
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Lookup data for filter dropdowns
  const [accounts, setAccounts] = useState<Array<{ value: string; label: string }>>([]);
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([]);
  const [persons, setPersons] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/persons').then((r) => r.json()),
    ]).then(([accRes, catRes, perRes]) => {
      setAccounts(
        (accRes.data || []).map((a: { id: string; name: string }) => ({ value: a.id, label: a.name }))
      );
      setCategories(
        (catRes.data || []).map((c: { id: string; name: string }) => ({ value: c.id, label: c.name }))
      );
      setPersons(
        (perRes.data || []).map((p: { id: string; name: string }) => ({ value: p.id, label: p.name }))
      );
    }).catch(console.error);
  }, []);

  const fetchReport = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      type: filters.reportType,
      from: filters.from,
      to: filters.to,
    });
    if (filters.accountId) params.set('accountId', filters.accountId);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.personId) params.set('personId', filters.personId);
    if (filters.transactionType) params.set('transactionType', filters.transactionType);

    fetch(`/api/reports?${params}`)
      .then((r) => r.json())
      .then((res) => setData(res.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'datePreset' && value !== 'custom') {
        const dates = getPresetDates(value as DatePreset);
        next.from = dates.from;
        next.to = dates.to;
      }
      return next;
    });
  }

  function resetFilters() {
    const dates = getPresetDates(defaultPreset);
    setFilters({
      datePreset: defaultPreset,
      from: dates.from,
      to: dates.to,
      reportType: 'summary',
      accountId: '',
      categoryId: '',
      personId: '',
      transactionType: '',
    });
  }

  const activeFilterCount = [
    filters.accountId,
    filters.categoryId,
    filters.personId,
    filters.transactionType,
  ].filter(Boolean).length;

  const hasNonDefaultFilters =
    filters.datePreset !== defaultPreset ||
    filters.reportType !== 'summary' ||
    activeFilterCount > 0;

  // Label helpers for active filter badges
  function getFilterLabel(key: string, value: string): string {
    switch (key) {
      case 'accountId':
        return accounts.find((a) => a.value === value)?.label || value;
      case 'categoryId':
        return categories.find((c) => c.value === value)?.label || value;
      case 'personId':
        return persons.find((p) => p.value === value)?.label || value;
      case 'transactionType':
        return TRANSACTION_TYPE_OPTIONS.find((t) => t.value === value)?.label || value;
      default:
        return value;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">Reports</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--emerald)] text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
          </Button>
          {hasNonDefaultFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <X className="h-3.5 w-3.5 mr-1" /> Reset All
            </Button>
          )}
        </div>
      </div>

      {/* Primary Filters - Always visible */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Report Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" /> Report Type
              </label>
              <Select
                options={REPORT_TYPE_OPTIONS}
                value={filters.reportType}
                onChange={(e) => updateFilter('reportType', e.target.value)}
              />
            </div>

            {/* Date Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Period
              </label>
              <Select
                options={DATE_PRESET_OPTIONS}
                value={filters.datePreset}
                onChange={(e) => updateFilter('datePreset', e.target.value)}
              />
            </div>

            {/* Custom Date Range */}
            {filters.datePreset === 'custom' ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">From</label>
                  <Input
                    type="date"
                    value={filters.from}
                    onChange={(e) => updateFilter('from', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">To</label>
                  <Input
                    type="date"
                    value={filters.to}
                    onChange={(e) => updateFilter('to', e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2 flex items-end">
                <p className="text-sm text-[var(--text-secondary)] pb-2">
                  {new Date(filters.from).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' — '}
                  {new Date(filters.to).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Account */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" /> Account
                  </label>
                  <Select
                    options={[{ value: '', label: 'All Accounts' }, ...accounts]}
                    value={filters.accountId}
                    onChange={(e) => updateFilter('accountId', e.target.value)}
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Category
                  </label>
                  <Select
                    options={[{ value: '', label: 'All Categories' }, ...categories]}
                    value={filters.categoryId}
                    onChange={(e) => updateFilter('categoryId', e.target.value)}
                  />
                </div>

                {/* Person */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Person
                  </label>
                  <Select
                    options={[{ value: '', label: 'All Persons' }, ...persons]}
                    value={filters.personId}
                    onChange={(e) => updateFilter('personId', e.target.value)}
                  />
                </div>

                {/* Transaction Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5" /> Transaction Type
                  </label>
                  <Select
                    options={TRANSACTION_TYPE_OPTIONS}
                    value={filters.transactionType}
                    onChange={(e) => updateFilter('transactionType', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Badges */}
          {activeFilterCount > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--glass-border)] flex flex-wrap gap-2 items-center">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Active:</span>
              {filters.accountId && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Account: {getFilterLabel('accountId', filters.accountId)}
                  <button
                    onClick={() => updateFilter('accountId', '')}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--glass-bg-hover)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.categoryId && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Category: {getFilterLabel('categoryId', filters.categoryId)}
                  <button
                    onClick={() => updateFilter('categoryId', '')}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--glass-bg-hover)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.personId && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Person: {getFilterLabel('personId', filters.personId)}
                  <button
                    onClick={() => updateFilter('personId', '')}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--glass-bg-hover)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.transactionType && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Type: {getFilterLabel('transactionType', filters.transactionType)}
                  <button
                    onClick={() => updateFilter('transactionType', '')}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--glass-bg-hover)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Content */}
      {loading ? (
        <PageLoading />
      ) : (
        <>
          {/* ── Summary ──────────────────────────────────── */}
          {filters.reportType === 'summary' && data.type === 'summary' && (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <SummaryCard label="Total Income" value={data.totalIncome || '0'} color="emerald" count={data.transactionCounts?.income} />
                <SummaryCard label="Total Expenses" value={data.totalExpense || '0'} color="coral" count={data.transactionCounts?.expense} />
                <SummaryCard
                  label="Net Savings"
                  value={data.netSavings || '0'}
                  color={parseFloat(data.netSavings || '0') >= 0 ? 'emerald' : 'coral'}
                />
                <SummaryCard label="Transfers" value={data.totalTransfers || '0'} color="secondary" count={data.transactionCounts?.transfers} />
              </div>
            </div>
          )}

          {/* ── By Category ──────────────────────────────── */}
          {filters.reportType === 'income-expense' && data.type === 'income-expense' && (
            <div className="space-y-4">
              <CategoryTable title="Income by Category" data={data.incomeByCategory} color="emerald" emptyMsg="No income for selected period" />
              <CategoryTable title="Expenses by Category" data={data.expenseByCategory} color="coral" emptyMsg="No expenses for selected period" />
            </div>
          )}

          {/* ── Daily Breakdown ───────────────────────────── */}
          {filters.reportType === 'daily' && data.type === 'daily' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Daily Breakdown</CardTitle></CardHeader>
              <CardContent className="p-0">
                {(!data.dailyData || data.dailyData.length === 0) ? (
                  <EmptyMsg text="No data for selected period" />
                ) : (
                  <>
                    {/* Mobile */}
                    <div className="divide-y md:hidden">
                      {data.dailyData.map((day, i) => {
                        const net = parseFloat(day.net);
                        return (
                          <div key={i} className="p-4 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">
                                {new Date(day.date).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </span>
                              <span className="text-xs text-[var(--text-secondary)]">{day.count} txn{day.count !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--emerald)] tabular-nums">{formatCurrency(day.income)}</span>
                              <span className="text-[var(--coral)] tabular-nums">{formatCurrency(day.expense)}</span>
                              <span className={`font-medium tabular-nums ${net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
                                {formatCurrency(day.net)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Desktop */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Income</TableHead>
                            <TableHead className="text-right">Expense</TableHead>
                            <TableHead className="text-right">Net</TableHead>
                            <TableHead className="text-right">Txns</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.dailyData.map((day, i) => {
                            const net = parseFloat(day.net);
                            return (
                              <TableRow key={i}>
                                <TableCell className="font-medium">
                                  {new Date(day.date).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-[var(--emerald)]">{formatCurrency(day.income)}</TableCell>
                                <TableCell className="text-right tabular-nums text-[var(--coral)]">{formatCurrency(day.expense)}</TableCell>
                                <TableCell className={`text-right tabular-nums font-medium ${net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
                                  {formatCurrency(day.net)}
                                </TableCell>
                                <TableCell className="text-right text-[var(--text-secondary)]">{day.count}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <DailyTotalsFooter data={data.dailyData} />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── By Account ───────────────────────────────── */}
          {filters.reportType === 'by-account' && data.type === 'by-account' && (
            <Card>
              <CardHeader><CardTitle className="text-base">By Account</CardTitle></CardHeader>
              <CardContent className="p-0">
                {(!data.accountData || data.accountData.length === 0) ? (
                  <EmptyMsg text="No data for selected period" />
                ) : (
                  <>
                    {/* Mobile */}
                    <div className="divide-y md:hidden">
                      {data.accountData.map((acc) => {
                        const net = parseFloat(acc.net);
                        return (
                          <div key={acc.id} className="p-4 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{acc.name}</span>
                              <span className="text-xs text-[var(--text-secondary)]">{acc.count} txns</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--emerald)] tabular-nums flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> {formatCurrency(acc.inflow)}
                              </span>
                              <span className="text-[var(--coral)] tabular-nums flex items-center gap-1">
                                <TrendingDown className="h-3 w-3" /> {formatCurrency(acc.outflow)}
                              </span>
                            </div>
                            <div className="flex justify-end">
                              <span className={`text-sm font-medium tabular-nums ${net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
                                Net: {formatCurrency(acc.net)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Desktop */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account</TableHead>
                            <TableHead className="text-right">Inflow</TableHead>
                            <TableHead className="text-right">Outflow</TableHead>
                            <TableHead className="text-right">Net</TableHead>
                            <TableHead className="text-right">Txns</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.accountData.map((acc) => {
                            const net = parseFloat(acc.net);
                            return (
                              <TableRow key={acc.id}>
                                <TableCell className="font-medium">{acc.name}</TableCell>
                                <TableCell className="text-right tabular-nums text-[var(--emerald)]">{formatCurrency(acc.inflow)}</TableCell>
                                <TableCell className="text-right tabular-nums text-[var(--coral)]">{formatCurrency(acc.outflow)}</TableCell>
                                <TableCell className={`text-right tabular-nums font-medium ${net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
                                  {formatCurrency(acc.net)}
                                </TableCell>
                                <TableCell className="text-right text-[var(--text-secondary)]">{acc.count}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── By Person ────────────────────────────────── */}
          {filters.reportType === 'by-person' && data.type === 'by-person' && (
            <Card>
              <CardHeader><CardTitle className="text-base">By Person</CardTitle></CardHeader>
              <CardContent className="p-0">
                {(!data.personData || data.personData.length === 0) ? (
                  <EmptyMsg text="No person-linked transactions for selected period" />
                ) : (
                  <>
                    {/* Mobile */}
                    <div className="divide-y md:hidden">
                      {data.personData.map((p) => {
                        const net = parseFloat(p.net);
                        return (
                          <div key={p.id} className="p-4 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{p.name}</span>
                              <span className="text-xs text-[var(--text-secondary)]">{p.count} txns</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--emerald)] tabular-nums flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> {formatCurrency(p.inflow)}
                              </span>
                              <span className="text-[var(--coral)] tabular-nums flex items-center gap-1">
                                <TrendingDown className="h-3 w-3" /> {formatCurrency(p.outflow)}
                              </span>
                            </div>
                            <div className="flex justify-end">
                              <span className={`text-sm font-medium tabular-nums ${net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
                                Net: {formatCurrency(p.net)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Desktop */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Person</TableHead>
                            <TableHead className="text-right">Received</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Net</TableHead>
                            <TableHead className="text-right">Txns</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.personData.map((p) => {
                            const net = parseFloat(p.net);
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell className="text-right tabular-nums text-[var(--emerald)]">{formatCurrency(p.inflow)}</TableCell>
                                <TableCell className="text-right tabular-nums text-[var(--coral)]">{formatCurrency(p.outflow)}</TableCell>
                                <TableCell className={`text-right tabular-nums font-medium ${net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
                                  {formatCurrency(p.net)}
                                </TableCell>
                                <TableCell className="text-right text-[var(--text-secondary)]">{p.count}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── By Transaction Type ──────────────────────── */}
          {filters.reportType === 'by-type' && data.type === 'by-type' && (
            <Card>
              <CardHeader><CardTitle className="text-base">By Transaction Type</CardTitle></CardHeader>
              <CardContent className="p-0">
                {(!data.typeData || data.typeData.length === 0) ? (
                  <EmptyMsg text="No data for selected period" />
                ) : (
                  <>
                    {/* Mobile */}
                    <div className="divide-y md:hidden">
                      {data.typeData.map((t) => (
                        <div key={t.type} className="p-4 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{t.label}</span>
                              <Badge variant={t.flow === 'inflow' ? 'success' : 'destructive'} className="text-[10px] px-1.5 py-0">
                                {t.flow === 'inflow' ? 'IN' : 'OUT'}
                              </Badge>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)]">{t.count} transaction{t.count !== 1 ? 's' : ''}</p>
                          </div>
                          <span className={`text-sm font-medium tabular-nums ${t.flow === 'inflow' ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
                            {formatCurrency(t.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Desktop */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Flow</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Transactions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.typeData.map((t) => (
                            <TableRow key={t.type}>
                              <TableCell className="font-medium">{t.label}</TableCell>
                              <TableCell>
                                <Badge variant={t.flow === 'inflow' ? 'success' : 'destructive'} className="text-xs">
                                  {t.flow === 'inflow' ? 'Inflow' : 'Outflow'}
                                </Badge>
                              </TableCell>
                              <TableCell className={`text-right tabular-nums font-medium ${t.flow === 'inflow' ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
                                {formatCurrency(t.total)}
                              </TableCell>
                              <TableCell className="text-right text-[var(--text-secondary)]">{t.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <TypeTotalsFooter data={data.typeData} />
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function SummaryCard({ label, value, color, count }: { label: string; value: string; color: string; count?: number }) {
  const colorClass =
    color === 'emerald' ? 'text-[var(--emerald)]' :
    color === 'coral' ? 'text-[var(--coral)]' :
    'text-[var(--text-primary)]';

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${colorClass}`}>{formatCurrency(value)}</p>
        {count !== undefined && (
          <p className="text-xs text-[var(--text-secondary)] mt-1">{count} transaction{count !== 1 ? 's' : ''}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryTable({
  title,
  data,
  color,
  emptyMsg,
}: {
  title: string;
  data?: Array<{ name: string; total: string; count: number }>;
  color: 'emerald' | 'coral';
  emptyMsg: string;
}) {
  const colorClass = color === 'emerald' ? 'text-[var(--emerald)]' : 'text-[var(--coral)]';
  const grandTotal = (data || []).reduce((sum, c) => sum + parseFloat(c.total), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {data && data.length > 0 && (
            <span className={`text-sm font-bold tabular-nums ${colorClass}`}>{formatCurrency(grandTotal.toString())}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {(!data || data.length === 0) ? (
          <EmptyMsg text={emptyMsg} />
        ) : (
          <>
            {/* Mobile */}
            <div className="divide-y md:hidden">
              {data.map((cat, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{cat.count} txn{cat.count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium tabular-nums ${colorClass}`}>{formatCurrency(cat.total)}</p>
                    {grandTotal > 0 && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        {((parseFloat(cat.total) / grandTotal) * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                    <TableHead className="text-right">Txns</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((cat, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className={`text-right tabular-nums ${colorClass}`}>{formatCurrency(cat.total)}</TableCell>
                      <TableCell className="text-right text-[var(--text-secondary)]">
                        {grandTotal > 0 ? ((parseFloat(cat.total) / grandTotal) * 100).toFixed(1) : '0.0'}%
                      </TableCell>
                      <TableCell className="text-right text-[var(--text-secondary)]">{cat.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DailyTotalsFooter({ data }: { data: Array<{ income: string; expense: string; net: string }> }) {
  const totals = data.reduce(
    (acc, d) => ({
      income: acc.income + parseFloat(d.income),
      expense: acc.expense + parseFloat(d.expense),
      net: acc.net + parseFloat(d.net),
    }),
    { income: 0, expense: 0, net: 0 }
  );

  return (
    <div className="border-t border-[var(--glass-border)] px-4 py-3 flex flex-wrap gap-4 justify-end text-sm">
      <span className="text-[var(--text-secondary)]">Totals:</span>
      <span className="text-[var(--emerald)] tabular-nums font-medium">{formatCurrency(totals.income.toString())}</span>
      <span className="text-[var(--coral)] tabular-nums font-medium">{formatCurrency(totals.expense.toString())}</span>
      <span className={`tabular-nums font-bold ${totals.net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
        Net: {formatCurrency(totals.net.toString())}
      </span>
    </div>
  );
}

function TypeTotalsFooter({ data }: { data: Array<{ total: string; flow: string }> }) {
  const totals = data.reduce(
    (acc, t) => {
      const amount = parseFloat(t.total);
      return t.flow === 'inflow'
        ? { ...acc, inflow: acc.inflow + amount }
        : { ...acc, outflow: acc.outflow + amount };
    },
    { inflow: 0, outflow: 0 }
  );
  const net = totals.inflow - totals.outflow;

  return (
    <div className="border-t border-[var(--glass-border)] px-4 py-3 flex flex-wrap gap-4 justify-end text-sm">
      <span className="text-[var(--text-secondary)]">Totals:</span>
      <span className="text-[var(--emerald)] tabular-nums font-medium">In: {formatCurrency(totals.inflow.toString())}</span>
      <span className="text-[var(--coral)] tabular-nums font-medium">Out: {formatCurrency(totals.outflow.toString())}</span>
      <span className={`tabular-nums font-bold ${net >= 0 ? 'text-[var(--emerald)]' : 'text-[var(--coral)]'}`}>
        Net: {formatCurrency(net.toString())}
      </span>
    </div>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return <p className="text-sm text-[var(--text-secondary)] text-center py-8">{text}</p>;
}
