import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('FIN-QA-0600: Button component', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe('BUTTON');
  });

  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Button onClick={handler}>Submit</Button>);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is set', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Button disabled onClick={handler}>Disabled</Button>);
    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(handler).not.toHaveBeenCalled();
  });

  it('renders as child element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Link Button' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });

  it('applies variant classes for destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toContain('coral');
  });

  it('applies size classes for sm size', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button', { name: 'Small' });
    expect(btn.className).toContain('h-9');
  });

  it('applies size classes for lg size', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button', { name: 'Large' });
    expect(btn.className).toContain('h-11');
  });

  it('applies size classes for icon size', () => {
    render(<Button size="icon" aria-label="icon-btn">+</Button>);
    const btn = screen.getByRole('button', { name: 'icon-btn' });
    expect(btn.className).toContain('w-10');
  });

  it('merges custom className', () => {
    render(<Button className="custom-class">Styled</Button>);
    const btn = screen.getByRole('button', { name: 'Styled' });
    expect(btn.className).toContain('custom-class');
  });

  it('forwards ref to the button element', () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLElement));
  });
});
