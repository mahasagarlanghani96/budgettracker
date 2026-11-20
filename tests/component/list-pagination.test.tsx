import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { slicePage } from '@/components/shared/list-pagination';

describe('FIN-QA-0670: slicePage utility', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('returns first page of items', () => {
    expect(slicePage(items, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('returns second page of items', () => {
    expect(slicePage(items, 2, 10)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('returns partial last page', () => {
    expect(slicePage(items, 3, 10)).toEqual([21, 22, 23, 24, 25]);
  });

  it('returns all items when pageSize is 0', () => {
    expect(slicePage(items, 1, 0)).toEqual(items);
  });

  it('returns empty array for out-of-range page', () => {
    expect(slicePage(items, 10, 10)).toEqual([]);
  });

  it('handles empty items array', () => {
    expect(slicePage([], 1, 10)).toEqual([]);
  });

  it('handles pageSize of 1', () => {
    expect(slicePage(items, 1, 1)).toEqual([1]);
    expect(slicePage(items, 25, 1)).toEqual([25]);
  });
});
