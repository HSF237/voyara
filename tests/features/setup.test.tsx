import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DestinationSearch } from '@/components/DestinationSearch';
import { CrewPicker } from '@/features/setup/CrewPicker';
import { DateRangeCalendar } from '@/features/setup/DateRangeCalendar';
import { MAX_TRAVELLERS } from '@/features/trip/model';
import type { Place } from '@/services/geocoding';
import { freshDraft, useTripDraft } from '@/store/tripDraft';
import { useTrips } from '@/store/trips';
import openMeteo from '../fixtures/open-meteo-geocoding.json';

function withQueries(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  useTripDraft.setState(freshDraft());
  useTrips.setState({ trips: [] });
});

describe('DestinationSearch', () => {
  it('searches as you type and selects with the keyboard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(openMeteo)))),
    );
    const user = userEvent.setup();
    const onSelect = vi.fn();
    function Example() {
      const [value, setValue] = useState<Place | null>(null);
      return (
        <DestinationSearch
          value={value}
          onSelect={(place) => {
            setValue(place);
            onSelect(place);
          }}
        />
      );
    }
    render(withQueries(<Example />));

    const input = screen.getByRole('combobox', { name: 'Where do you want to go?' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await user.type(input, 'Kochi');

    const options = await screen.findAllByRole('option', {}, { timeout: 3000 });
    expect(options.length).toBeGreaterThan(1);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(`Places found: ${options.length}`);

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[1]?.id);
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledTimes(1);
    const chosen = onSelect.mock.calls[0]?.[0] as Place;
    expect(chosen.name).toBe('Kochi');
    expect(chosen.countryCode).toMatch(/^[A-Z]{2}$/);
    await waitFor(() => expect(screen.queryByRole('option')).not.toBeInTheDocument());
    expect(input).toHaveValue(
      [chosen.name, chosen.region, chosen.country].filter(Boolean).join(', '),
    );
  });

  it('says so when the search service cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const user = userEvent.setup();
    render(withQueries(<DestinationSearch value={null} onSelect={vi.fn()} />));
    await user.type(screen.getByRole('combobox'), 'Kochi');
    await waitFor(
      () => expect(screen.getByRole('status')).toHaveTextContent("Search can't be reached"),
      { timeout: 4000 },
    );
  });
});

describe('DateRangeCalendar', () => {
  function Example({ maxNights = 13 }: { maxNights?: number }) {
    const [range, setRange] = useState({ startDate: '2027-01-10', endDate: '2027-01-12' });
    return (
      <>
        <DateRangeCalendar
          {...range}
          onChange={setRange}
          minDate={new Date(2027, 0, 5)}
          maxNights={maxNights}
        />
        <output data-testid="range">{`${range.startDate}..${range.endDate}`}</output>
      </>
    );
  }
  const day = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)!;

  it('sets the start on the first tap and the end on the second', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(day('2027-01-15'));
    expect(screen.getByTestId('range')).toHaveTextContent('2027-01-15..2027-01-15');
    expect(screen.getByText('Now tap the end date')).toBeInTheDocument();
    await user.click(day('2027-01-19'));
    expect(screen.getByTestId('range')).toHaveTextContent('2027-01-15..2027-01-19');
  });

  it('orders the two taps and caps the length of the stay', async () => {
    const user = userEvent.setup();
    render(<Example maxNights={3} />);
    await user.click(day('2027-01-20'));
    await user.click(day('2027-01-08'));
    // 8 → 20 is 12 nights; capped at 3.
    expect(screen.getByTestId('range')).toHaveTextContent('2027-01-08..2027-01-11');
  });

  it('ignores days before the minimum date', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(day('2027-01-02'));
    expect(screen.getByTestId('range')).toHaveTextContent('2027-01-10..2027-01-12');
  });

  it('moves with the arrow keys and selects with Enter', async () => {
    const user = userEvent.setup();
    render(<Example />);
    day('2027-01-10').focus();
    await user.keyboard('{ArrowRight}{ArrowDown}');
    expect(day('2027-01-18')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('range')).toHaveTextContent('2027-01-18..2027-01-18');
  });
});

describe('CrewPicker', () => {
  it('steps within its limits and names the group size', async () => {
    const user = userEvent.setup();
    function Example() {
      const [count, setCount] = useState(1);
      return <CrewPicker value={count} onChange={setCount} />;
    }
    render(<Example />);
    expect(screen.getByText('Solo trip')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove a traveller' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Add a traveller' }));
    expect(screen.getByText('Trip for two')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add a traveller' }));
    expect(screen.getByText('Small group')).toBeInTheDocument();
  });
});

describe('trip stores', () => {
  const place: Place = {
    id: 'cur:kl',
    source: 'curated',
    name: 'Kuala Lumpur',
    country: 'Malaysia',
    countryCode: 'MY',
    lat: 3.139,
    lng: 101.6869,
  };

  it('keeps traveller counts in range and toggles interests', () => {
    const draft = useTripDraft.getState();
    draft.setTravellers(0);
    expect(useTripDraft.getState().travellers).toBe(1);
    draft.setTravellers(999);
    expect(useTripDraft.getState().travellers).toBe(MAX_TRAVELLERS);
    draft.toggleInterest('food');
    draft.toggleInterest('history');
    draft.toggleInterest('food');
    expect(useTripDraft.getState().interests).toEqual(['history']);
  });

  it('saves, updates and deletes trips', () => {
    const details = {
      destination: place,
      startDate: '2027-01-16',
      endDate: '2027-01-18',
      travellers: 2,
      budget: 40000,
      budgetCurrency: 'INR',
      pace: 'balanced' as const,
      interests: [],
    };
    const saved = useTrips.getState().addTrip(details);
    expect(saved.code).toMatch(/^VY-/);
    expect(useTrips.getState().trips).toHaveLength(1);

    const updated = useTrips.getState().updateTrip(saved.id, { ...details, travellers: 4 });
    expect(updated).toMatchObject({ id: saved.id, code: saved.code, travellers: 4 });
    expect(useTrips.getState().updateTrip('missing', details)).toBeUndefined();

    useTripDraft.getState().loadTrip(saved);
    expect(useTripDraft.getState()).toMatchObject({ editingId: saved.id, destination: place });

    useTrips.getState().removeTrip(saved.id);
    expect(useTrips.getState().trips).toEqual([]);
  });
});
