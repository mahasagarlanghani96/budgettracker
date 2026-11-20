import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from '@/components/ui/password-input';

describe('FIN-QA-0610: PasswordInput component', () => {
  it('renders as password type by default', () => {
    render(<PasswordInput placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles to text type when show button is clicked', async () => {
    const user = userEvent.setup();
    render(<PasswordInput placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('toggles back to password type on second click', async () => {
    const user = userEvent.setup();
    render(<PasswordInput placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    const hideToggle = screen.getByRole('button', { name: 'Hide password' });
    await user.click(hideToggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('has aria-label "Show password" when hidden (FIN-BUG-0002 regression)', () => {
    render(<PasswordInput placeholder="Password" />);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('aria-label', 'Show password');
  });

  it('has aria-label "Hide password" when visible (FIN-BUG-0002 regression)', async () => {
    const user = userEvent.setup();
    render(<PasswordInput placeholder="Password" />);
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    const toggle = screen.getByRole('button', { name: 'Hide password' });
    expect(toggle).toHaveAttribute('aria-label', 'Hide password');
  });

  it('toggle button has tabIndex -1', () => {
    render(<PasswordInput placeholder="Password" />);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('tabIndex', '-1');
  });

  it('passes through additional props', () => {
    render(<PasswordInput placeholder="Password" id="pw-field" data-testid="pw" />);
    const input = screen.getByTestId('pw');
    expect(input).toHaveAttribute('id', 'pw-field');
  });

  it('applies custom className', () => {
    render(<PasswordInput placeholder="Password" className="my-class" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input.className).toContain('my-class');
  });
});
