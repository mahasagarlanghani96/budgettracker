'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/ui/loading';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, Download } from 'lucide-react';

interface ReportData {
  summary?: { totalIncome: string; totalExpense: string; netSavings: string; transactionCount: number };
  categories?: Array<{ category: string; type: string; total: string; count: number; percentage: number }>;
  daily?: Array<{ date: string; income: string; expense: string; net: string }>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData>({});
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('summary');
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);

  function fetchReport() {
    setLoading(true);
    const params = new URLSearchParams({ type: reportType, startDate, endDate });
    fetch(`/api/reports?${params}`)
      .then((r) => r.json())
      .then((res) => setData(res.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchReport(); }, [reportType, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Report Type</label>
              <Select
                options={[
                  { value: 'summary', label: 'Summary' },
                  { value: 'income-expense', label: 'By Category' },
                  { value: 'daily', label: 'Daily Breakdown' },
                ]}
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button variant="outline" onClick={fetchReport}>Refresh</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <PageLoading />
      ) : (
        <>
          {/* Summary Report */}
          {reportType === 'summary' && data.summary && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Total Income</p>
                    <p className="text-xl font-bold tabular-nums text-green-600">{formatCurrency(data.summary.totalIncome)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Total Expenses</p>
                    <p className="text-xl font-bold tabular-nums text-red-600">{formatCurrency(data.summary.totalExpense)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Net Savings</p>
                    <p className={`text-xl font-bold tabular-nums ${parseFloat(data.summary.netSavings) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.summary.netSavings)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Transactions</p>
                    <p className="text-xl font-bold">{data.summary.transactionCount}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Category Report */}
          {reportType === 'income-expense' && data.categories && (
            <Card>
              <CardHeader><CardTitle className="text-base">Income & Expense by Category</CardTitle></CardHeader>
              <CardContent className="p-0">
                {data.categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data for selected period</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.categories.map((cat, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{cat.category}</TableCell>
                          <TableCell>{cat.type}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(cat.total)}</TableCell>
                          <TableCell className="text-right">{cat.count}</TableCell>
                          <TableCell className="text-right">{cat.percentage.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Daily Report */}
          {reportType === 'daily' && data.daily && (
            <Card>
              <CardHeader><CardTitle className="text-base">Daily Breakdown</CardTitle></CardHeader>
              <CardContent className="p-0">
                {data.daily.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data for selected period</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Income</TableHead>
                        <TableHead className="text-right">Expense</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.daily.map((day, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{new Date(day.date).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}</TableCell>
                          <TableCell className="text-right tabular-nums text-green-600">{formatCurrency(day.income)}</TableCell>
                          <TableCell className="text-right tabular-nums text-red-600">{formatCurrency(day.expense)}</TableCell>
                          <TableCell className={`text-right tabular-nums font-medium ${parseFloat(day.net) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(day.net)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
