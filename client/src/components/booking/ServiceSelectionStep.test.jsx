import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServiceSelectionStep from './ServiceSelectionStep';

function ServiceSelectionHarness({ onNext }) {
  const [bookingDetails, setBookingDetails] = useState({});
  return (
    <ServiceSelectionStep
      bookingDetails={bookingDetails}
      onSelect={(field, value) => setBookingDetails((d) => ({ ...d, [field]: value }))}
      onNext={onNext}
    />
  );
}

describe('ServiceSelectionStep (booking smoke)', () => {
  it('renders the service selection step', () => {
    render(
      <ServiceSelectionStep
        onSelect={vi.fn()}
        onNext={vi.fn()}
        bookingDetails={{}}
      />
    );

    expect(
      screen.getByRole('heading', { name: /1\. select your service/i })
    ).toBeInTheDocument();
  });

  it('enables Next after selecting a service', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();

    render(<ServiceSelectionHarness onNext={onNext} />);

    const next = screen.getByRole('button', { name: /next/i });
    expect(next).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /solo session/i }));

    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onNext).toHaveBeenCalled();
  });
});
