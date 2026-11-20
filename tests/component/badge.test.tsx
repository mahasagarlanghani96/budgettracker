import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('FIN-QA-0640: Badge component', () => {
  it('renders with default variant', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders destructive variant with coral styling', () => {
    render(<Badge variant="destructive">Overdue</Badge>);
    const badge = screen.getByText('Overdue');
    expect(badge.className).toContain('coral');
  });

  it('renders success variant with emerald styling', () => {
    render(<Badge variant="success">Paid</Badge>);
    const badge = screen.getByText('Paid');
    expect(badge.className).toContain('emerald');
  });

  it('renders warning variant with amber styling', () => {
    render(<Badge variant="warning">Pending</Badge>);
    const badge = screen.getByText('Pending');
    expect(badge.className).toContain('amber');
  });

  it('renders outline variant with border', () => {
    render(<Badge variant="outline">Draft</Badge>);
    const badge = screen.getByText('Draft');
    expect(badge.className).toContain('border');
  });

  it('applies custom className', () => {
    render(<Badge className="ml-2">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge.className).toContain('ml-2');
  });
});
