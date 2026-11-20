import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

describe('FIN-QA-0630: Card component', () => {
  it('renders a full card with all subcomponents', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Balance</CardTitle>
          <CardDescription>Your total balance</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Rs. 50,000</p>
        </CardContent>
        <CardFooter>
          <span>Updated today</span>
        </CardFooter>
      </Card>
    );
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Your total balance')).toBeInTheDocument();
    expect(screen.getByText('Rs. 50,000')).toBeInTheDocument();
    expect(screen.getByText('Updated today')).toBeInTheDocument();
  });

  it('CardTitle renders as h3', () => {
    render(<CardTitle>Title</CardTitle>);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Title');
  });

  it('CardDescription renders as p', () => {
    render(<CardDescription>Desc</CardDescription>);
    const p = screen.getByText('Desc');
    expect(p.tagName).toBe('P');
  });

  it('applies custom className to Card', () => {
    render(<Card className="custom-card" data-testid="c">content</Card>);
    expect(screen.getByTestId('c').className).toContain('custom-card');
  });

  it('forwards ref on Card', () => {
    let ref: HTMLDivElement | null = null;
    render(<Card ref={(el) => { ref = el; }}>test</Card>);
    expect(ref).toBeInstanceOf(HTMLDivElement);
  });
});
