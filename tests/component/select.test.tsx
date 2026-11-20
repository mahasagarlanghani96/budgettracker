import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '@/components/ui/select';

const OPTIONS = [
  { value: 'savings', label: 'Savings' },
  { value: 'checking', label: 'Checking' },
  { value: 'cash', label: 'Cash' },
];

describe('FIN-QA-0660: Select component', () => {
  it('renders all options', () => {
    render(<Select options={OPTIONS} />);
    const select = screen.getByRole('combobox');
    expect(select.querySelectorAll('option')).toHaveLength(3);
  });

  it('renders placeholder when provided', () => {
    render(<Select options={OPTIONS} placeholder="Choose account" />);
    const opts = screen.getAllByRole('option');
    expect(opts[0]).toHaveTextContent('Choose account');
    expect(opts[0]).toHaveValue('');
  });

  it('calls onChange when selection changes', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Select options={OPTIONS} onChange={handler} />);
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'checking');
    expect(handler).toHaveBeenCalled();
  });

  it('shows selected value', () => {
    render(<Select options={OPTIONS} defaultValue="cash" />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('cash');
  });

  it('is disabled when disabled prop is set', () => {
    render(<Select options={OPTIONS} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Select options={OPTIONS} className="w-full" />);
    expect(screen.getByRole('combobox').className).toContain('w-full');
  });
});
