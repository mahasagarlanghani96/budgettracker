'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoading } from '@/components/ui/loading';
import { formatCurrency } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

interface ReportData {
  type?: string;
  totalIncome?: string;
  totalExpense?: string;
  netSavings?: string;
  totalTransfers?: string;
  transactionCounts?: { income: number; expense: number; transfers: number };
  incomeByCategory?: Array<{ name: string; total: string }>;
  expenseByCategory?: Array<{ name: string; total: string }>;
  dailyData?: Array<{ date: string; income: string; expense: string; net: string }>;
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
    const params = new URLSearchParams({ type: reportType, from: startDate, to: endDate });
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
          {reportType === 'summary' && data.type === 'summary' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Total Income</p>
                    <p className="text-xl font-bold tabular-nums text-green-600">{formatCurrency(data.totalIncome || '0')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Total Expenses</p>
                    <p className="text-xl font-bold tabular-nums text-red-600">{formatCurrency(data.totalExpense || '0')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Net Savings</p>
                    <p className={`text-xl font-bold tabular-nums ${parseFloat(data.netSavings || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.netSavings || '0')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground">Transactions</p>
                    <p className="text-xl font-bold">{(data.transactionCounts?.income || 0) + (data.transactionCounts?.expense || 0) + (data.transactionCounts?.transfers || 0)}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Category Report */}
          {reportType === 'income-expense' && data.type === 'income-expense' && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Income by Category</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {(!data.incomeByCategory || data.incomeByCategory.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No income for selected period</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.incomeByCategory.map((cat, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell className="text-right tabular-nums text-green-600">{formatCurrency(cat.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Expenses by Category</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {(!data.expenseByCategory || data.expenseByCategory.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No expenses for selected period</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.expenseByCategory.map((cat, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell className="text-right tabular-nums text-red-600">{formatCurrency(cat.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Daily Report */}
          {reportType === 'daily' && data.type === 'daily' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Daily Breakdown</CardTitle></CardHeader>
              <CardContent className="p-0">
                {(!data.dailyData || data.dailyData.length === 0) ? (
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
                      {data.dailyData.map((day, i) => (
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
