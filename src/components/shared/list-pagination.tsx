'use client';

import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 per page' },
  { value: '20', label: '20 per page' },
  { value: '50', label: '50 per page' },
  { value: '100', label: '100 per page' },
  { value: '0', label: 'All' },
];

interface ListPaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function ListPagination({ page, pageSize, totalItems, onPageChange, onPageSizeChange }: ListPaginationProps) {
  const isAll = pageSize === 0;
  const effectiveSize = isAll ? totalItems : pageSize;
  const totalPages = isAll || effectiveSize === 0 ? 1 : Math.max(1, Math.ceil(totalItems / effectiveSize));
  const start = totalItems === 0 ? 0 : (page - 1) * effectiveSize + 1;
  const end = Math.min(page * effectiveSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
      <span className="text-sm text-[var(--text-secondary)] tabular-nums">
        {totalItems === 0 ? 'No items' : `Showing ${start}–${end} of ${totalItems}`}
      </span>
      <div className="flex items-center gap-3">
        <Select
          options={PAGE_SIZE_OPTIONS}
          value={String(pageSize)}
          onChange={(e) => {
            onPageSizeChange(parseInt(e.target.value, 10));
            onPageChange(1);
          }}
          className="w-[140px] h-8 text-xs"
        />
        {!isAll && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
              Previous
            </Button>
            <span className="text-xs text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  if (pageSize === 0) return items;
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
