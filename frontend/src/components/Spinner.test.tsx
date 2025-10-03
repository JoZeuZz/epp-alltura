import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import Spinner from './Spinner';

describe('Spinner', () => {
  test('renders with default size', () => {
    render(<Spinner />);
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toBeInTheDocument();
    expect(spinnerElement).toHaveClass('h-8 w-8');
  });

  test('renders with custom size', () => {
    render(<Spinner size="h-12 w-12" />);
    const spinnerElement = screen.getByRole('status');
    expect(spinnerElement).toBeInTheDocument();
    expect(spinnerElement).toHaveClass('h-12 w-12');
  });
});
