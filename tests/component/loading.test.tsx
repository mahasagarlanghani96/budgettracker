import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, PageLoading, EmptyState } from '@/components/ui/loading';

describe('FIN-QA-0650: Loading components', () => {
  describe('Spinner', () => {
    it('renders a spinning div', () => {
      const { container } = render(<Spinner />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner.className).toContain('animate-spin');
    });

    it('applies custom className', () => {
      const { container } = render(<Spinner className="h-8 w-8" />);
      const spinner = container.firstChild as HTMLElement;
      expect(spinner.className).toContain('h-8');
    });
  });

  describe('PageLoading', () => {
    it('renders a centered spinner', () => {
      const { container } = render(<PageLoading />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex');
      expect(wrapper.className).toContain('items-center');
      expect(wrapper.className).toContain('justify-center');
      const spinner = wrapper.firstChild as HTMLElement;
      expect(spinner.className).toContain('animate-spin');
    });
  });

  describe('EmptyState', () => {
    it('renders title', () => {
      render(<EmptyState title="No transactions" />);
      expect(screen.getByText('No transactions')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      render(<EmptyState title="Empty" description="Add your first item" />);
      expect(screen.getByText('Add your first item')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
      const { container } = render(<EmptyState title="Empty" />);
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(0);
    });

    it('renders icon when provided', () => {
      render(<EmptyState title="Empty" icon={<span data-testid="icon">📦</span>} />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders action when provided', () => {
      render(<EmptyState title="Empty" action={<button>Add</button>} />);
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });
  });
});
