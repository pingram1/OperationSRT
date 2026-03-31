import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookingProgressTracker from './BookingProgressTracker';

describe('BookingProgressTracker (booking smoke)', () => {
  it('renders default step labels', () => {
    render(<BookingProgressTracker currentStep={1} totalSteps={5} />);

    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('marks Service completed and Details active when currentStep is 2', () => {
    render(<BookingProgressTracker currentStep={2} totalSteps={5} />);

    expect(screen.getByText('Service')).toHaveClass('text-blue-600');
    expect(screen.getByText('Details')).toHaveClass('text-blue-600');
    expect(screen.getByText('Schedule')).toHaveClass('text-gray-500');
  });
});
