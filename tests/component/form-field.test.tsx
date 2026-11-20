import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '@/components/forms/FormField';

describe('FIN-QA-0620: FormField component', () => {
  it('renders label and children', () => {
    render(
      <FormField label="Email">
        <input type="email" placeholder="email" />
      </FormField>
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('email')).toBeInTheDocument();
  });

  it('shows required asterisk when required is true', () => {
    render(
      <FormField label="Name" required>
        <input />
      </FormField>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show asterisk when required is false', () => {
    render(
      <FormField label="Name">
        <input />
      </FormField>
    );
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('shows error message with alert role', () => {
    render(
      <FormField label="Amount" error="Must be positive">
        <input />
      </FormField>
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Must be positive');
  });

  it('shows hint text when no error', () => {
    render(
      <FormField label="Amount" hint="Enter in PKR">
        <input />
      </FormField>
    );
    expect(screen.getByText('Enter in PKR')).toBeInTheDocument();
  });

  it('error takes priority over hint', () => {
    render(
      <FormField label="Amount" error="Invalid" hint="Enter in PKR">
        <input />
      </FormField>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid');
    expect(screen.queryByText('Enter in PKR')).not.toBeInTheDocument();
  });

  it('shows neither error nor hint when both are absent', () => {
    const { container } = render(
      <FormField label="Amount">
        <input />
      </FormField>
    );
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('applies custom className', () => {
    const { container } = render(
      <FormField label="Test" className="mt-4">
        <input />
      </FormField>
    );
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
