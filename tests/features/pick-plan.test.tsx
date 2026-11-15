import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { paths, pickPath, planPath } from '@/app/paths';
import { PickPage } from '@/features/pick/PickPage';
import { Itinerary } from '@/features/plan/Itinerary';
import type { Trip, TripDetails } from '@/features/trip/model';
import { buildPlan } from '@/planner/optimise';
import type { Category, PlaceCandidate } from '@/planner/types';
import { makePlan, planInputFor } from '@/services/planner';
import { useTrips } from '@/store/trips';

vi.mock('@/lib/env', () => ({
  env: { raw: {}, appUrl: 'http://localhost', features: { firebase: false, maps: false } },
}));

const spot = (
  id: string,
  name: string,
  category: Category,
  rating: number,
  lat: number,
): PlaceCandidate => ({
  id,
  name,
  lat,
  lng: 76.26,
  category,
  rating,
  durationMin: 60,
  summary: `${name} is worth a visit.`,
});
const places = [
  spot('otm:1', 'Fort Kochi Beach', 'nature', 2, 9.964),
  spot('otm:2', 'Dutch Palace', 'history', 3, 9.958),
  spot('otm:3', 'Paradesi Synagogue', 'religious', 3, 9.957),
  spot('otm:4', 'Lulu Mall', 'shopping', 1, 10.027),
];

const details: TripDetails = {
  destination: { id: 'cur:kochi', source: 'curated', name: 'Kochi', country: 'India', countryCode: 'IN', lat: 9.93, lng: 76.26 },
  startDate: '2026-11-21',
  endDate: '2026-11-22',
  travellers: 2,
  budget: 20000,
  budgetCurrency: 'INR',
  pace: 'balanced',
  interests: ['history'],
}; // prettier-ignore

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

let trip: Trip;
beforeEach(() => {
  useTrips.setState({ trips: [] });
  trip = useTrips.getState().addTrip(details);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: paths.pick, element: <PickPage /> },
      { path: paths.plan, element: <p>plan page</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('trips store: picks and plan', () => {
  it('drops the plan when picks change, and when dates or destination change', () => {
    const { savePicks, savePlan, updateTrip } = useTrips.getState();
    const current = () => useTrips.getState().trips[0]!;
    savePicks(trip.id, { places, mustIds: [] });
    savePlan(trip.id, buildPlan(planInputFor(current(), current().picks!)));
    expect(current().plan).toBeDefined();

    updateTrip(trip.id, { ...details, travellers: 4 });
    expect(current().plan).toBeDefined(); // nothing the plan depends on changed

    updateTrip(trip.id, { ...details, endDate: '2026-11-23' });
    expect(current().plan).toBeUndefined();
    expect(current().picks?.places).toHaveLength(4);

    updateTrip(trip.id, {
      ...details,
      destination: { ...details.destination, id: 'cur:goa', name: 'Goa' },
    });
    expect(current().picks).toBeUndefined();
  });
});

describe('makePlan', () => {
  const picks = { places, mustIds: ['otm:4'] };

  it('falls back to the built-in planner when the service is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    const plan = await makePlan(trip, picks, 'en');
    expect(plan.source).toBe('rules');
    expect(plan.days.flatMap((day) => day.stops)).toHaveLength(4);
  });

  it('refuses a plan that mentions a place it never sent', async () => {
    const forged = buildPlan(planInputFor(trip, picks));
    forged.source = 'ai';
    forged.days[0]!.stops[0]!.placeId = 'otm:999';
    fetchMock.mockResolvedValue(reply({ plan: forged }));
    expect((await makePlan(trip, picks, 'en')).source).toBe('rules');
  });

  it('accepts a valid plan from the service and sends only what the planner needs', async () => {
    const good = { ...buildPlan(planInputFor(trip, picks)), source: 'ai' as const, model: 'm' };
    fetchMock.mockResolvedValue(reply({ plan: good }));
    expect((await makePlan(trip, picks, 'ml')).source).toBe('ai');
    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({
      language: 'ml',
      mustIds: ['otm:4'],
      dates: ['2026-11-21', '2026-11-22'],
    });
    expect(JSON.stringify(sent)).not.toContain('worth a visit'); // descriptions stay on the device
  });
});

describe('PickPage', () => {
  it('shows real places best match first, keeps picks and hands them to the planner', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(reply({ places }));
    const router = renderAt(pickPath(trip.id));

    expect(screen.getByRole('status')).toHaveTextContent('Finding real places in Kochi');
    // A famous place that matches the trip's interest (history) leads the deck.
    expect(await screen.findByRole('article', { name: 'Dutch Palace' })).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/places?lat=9.9300&lng=76.2600');

    const build = screen.getByRole('button', { name: 'Build my plan' });
    expect(build).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Keep' }));
    await user.click(await screen.findByRole('button', { name: 'Must-do' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.getByText('Kept: 2 · Left: 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('Kept: 2 · Left: 2')).toBeInTheDocument();

    await user.click(build);
    await waitFor(() => expect(router.state.location.pathname).toBe(planPath(trip.id)));
    const saved = useTrips.getState().trips[0]!.picks!;
    expect(saved.places.map((place) => place.name)).toEqual(['Dutch Palace', 'Paradesi Synagogue']);
    expect(saved.mustIds).toEqual(['otm:3']);
  });

  it('offers a retry when places cannot be loaded', async () => {
    fetchMock.mockResolvedValue(reply({ error: {} }, 502));
    renderAt(pickPath(trip.id));
    expect(
      await screen.findByRole('button', { name: 'Try again' }, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});

describe('Itinerary', () => {
  it('shows the day timeline and re-times it when a stop is removed', async () => {
    const user = userEvent.setup();
    const picks = { places, mustIds: ['otm:2'] };
    useTrips.getState().savePicks(trip.id, picks);
    const plan = buildPlan(planInputFor(trip, picks));
    useTrips.getState().savePlan(trip.id, plan);

    function Live() {
      const current = useTrips((state) => state.trips[0]!);
      return <Itinerary trip={current} picks={current.picks!} plan={current.plan!} />;
    }
    const router = createMemoryRouter([{ path: '/', element: <Live /> }]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kochi');
    expect(screen.getByText('Planned by Voyara')).toBeInTheDocument();
    const list = screen.getByRole('list');
    const before = within(list)
      .getAllByRole('heading', { level: 3 })
      .map((node) => node.textContent);
    expect(before.length).toBeGreaterThan(1);

    await user.click(screen.getByRole('button', { name: `Remove from plan: ${before[0]}` }));
    await waitFor(() =>
      expect(within(screen.getByRole('list')).getAllByRole('heading', { level: 3 })).toHaveLength(
        before.length - 1,
      ),
    );
    const day = useTrips.getState().trips[0]!.plan!.days[0]!;
    expect(day.stops).toHaveLength(before.length - 1);
    expect(day.stops[0]?.start).toBe('09:30'); // the new first stop starts the day
  });
});
