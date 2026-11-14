import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { paths, safeNext } from '@/app/paths';
import { RequireAuth } from '@/app/RequireAuth';
import { TripBar } from '@/components/TripBar';
import { Toaster } from '@/components/ui';
import { LoginPage } from '@/features/auth/LoginPage';
import {
  dayPart,
  daysUntil,
  pastTrips,
  tripStats,
  upcomingTrips,
} from '@/features/dashboard/model';
import type { Trip } from '@/features/trip/model';
import { authProblem } from '@/services/firebase';
import { getPhotosByTitle, plainText } from '@/services/wiki';
import { firstName, makeGuest, useAuth } from '@/store/auth';
import { freshDraft, useTripDraft } from '@/store/tripDraft';

// Tests never talk to Firebase; this copy of the app has no Firebase config.
vi.mock('@/lib/env', () => ({
  env: { raw: {}, appUrl: 'http://localhost', features: { firebase: false, maps: false } },
}));

const trip = (id: string, startDate: string, endDate: string, countryCode = 'MY'): Trip => ({
  id,
  code: `VY-${id}`,
  createdAt: '2026-11-01T00:00:00Z',
  destination: { id, source: 'curated', name: id, country: 'X', countryCode, lat: 0, lng: 0 },
  startDate,
  endDate,
  travellers: 2,
  budget: 1000,
  budgetCurrency: 'INR',
  pace: 'balanced',
  interests: [],
});

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: paths.login, element: <LoginPage /> },
      {
        path: paths.dashboard,
        element: (
          <RequireAuth>
            <h1>Dashboard</h1>
          </RequireAuth>
        ),
      },
      {
        path: paths.setup,
        element: (
          <RequireAuth>
            <h1>Setup</h1>
          </RequireAuth>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  useAuth.setState({ user: null });
  useTripDraft.setState(freshDraft());
});

describe('sign-in', () => {
  it('sends visitors without a profile to sign-in and back again as a guest', async () => {
    const user = userEvent.setup();
    const router = renderAt(paths.setup);
    expect(await screen.findByRole('heading', { name: 'Welcome to Voyara' })).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent(paths.setup)}`);

    await user.type(screen.getByLabelText('Your name'), 'Hasan');
    await user.click(screen.getByRole('radio', { name: '🌴' }));
    await user.click(screen.getByRole('button', { name: 'Start planning' }));

    expect(await screen.findByRole('heading', { name: 'Setup' })).toBeInTheDocument();
    expect(useAuth.getState().user).toMatchObject({
      name: 'Hasan',
      emoji: '🌴',
      provider: 'guest',
    });
  });

  it('explains when Google sign-in is not available, and keeps the guest route open', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderAt(paths.login);
    await user.click(await screen.findByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("isn't set up on this copy");
    expect(screen.getByRole('button', { name: 'Start planning' })).toBeEnabled();
    expect(useAuth.getState().user).toBeNull();
  });

  it('skips sign-in for someone already signed in', async () => {
    useAuth.setState({ user: makeGuest('Aisha', '🧭') });
    renderAt(paths.login);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('only redirects to in-app paths after sign-in', () => {
    expect(safeNext('/plan/new')).toBe('/plan/new');
    expect(safeNext('https://evil.example')).toBe(paths.dashboard);
    expect(safeNext('//evil.example')).toBe(paths.dashboard);
    expect(safeNext(null)).toBe(paths.dashboard);
  });

  it('maps Firebase error codes to messages people can act on', () => {
    expect(authProblem({ code: 'auth/popup-closed-by-user' })).toBe('popupClosed');
    expect(authProblem({ code: 'auth/popup-blocked' })).toBe('popupBlocked');
    expect(authProblem({ code: 'auth/configuration-not-found' })).toBe('notEnabled');
    expect(authProblem({ code: 'auth/operation-not-allowed' })).toBe('notEnabled');
    expect(authProblem({ code: 'auth/unauthorized-domain' })).toBe('domain');
    expect(authProblem(new Error('boom'))).toBe('unknown');
  });

  it('greets by first name', () => {
    expect(firstName(makeGuest('Muhammad Hasan', '🧭'))).toBe('Muhammad');
    expect(firstName(null)).toBe('');
  });
});

describe('dashboard maths', () => {
  const today = '2026-11-14';
  const trips = [
    trip('past', '2026-10-01', '2026-10-04', 'IN'),
    trip('later', '2026-12-20', '2026-12-25', 'JP'),
    trip('now', '2026-11-13', '2026-11-15', 'MY'),
    trip('soon', '2026-11-21', '2026-11-23', 'MY'),
  ];

  it('orders upcoming trips soonest first and past trips most recent first', () => {
    expect(upcomingTrips(trips, today).map((t) => t.id)).toEqual(['now', 'soon', 'later']);
    expect(pastTrips(trips, today).map((t) => t.id)).toEqual(['past']);
  });

  it('counts down to a trip', () => {
    expect(daysUntil(trips[3]!, today)).toBe(7);
    expect(daysUntil(trips[2]!, today)).toBe(-1);
  });

  it('totals trips, countries and nights', () => {
    expect(tripStats(trips)).toEqual({ trips: 4, countries: 3, nights: 3 + 5 + 2 + 2 });
    expect(tripStats([])).toEqual({ trips: 0, countries: 0, nights: 0 });
  });

  it('picks a greeting for the time of day', () => {
    expect([6, 13, 19, 23, 2].map(dayPart)).toEqual([
      'morning',
      'afternoon',
      'evening',
      'night',
      'night',
    ]);
  });
});

describe('TripBar', () => {
  it('asks for a destination before going on, then submits', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <TripBar onSubmit={onSubmit} />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole('button', { name: /Plan it/ }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveFocus();

    useTripDraft.getState().setDestination({
      id: 'cur:kl', source: 'curated', name: 'Kuala Lumpur', country: 'Malaysia', countryCode: 'MY', lat: 3.1, lng: 101.7,
    }); // prettier-ignore
    await user.click(screen.getByRole('button', { name: /Plan it/ }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('opens the travellers panel, changes the count and closes on Escape', async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <TripBar onSubmit={vi.fn()} />
      </QueryClientProvider>,
    );
    const trigger = screen.getByRole('button', { name: /Travellers/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Travellers' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add a traveller' }));
    expect(useTripDraft.getState().travellers).toBe(3);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('destination photos', () => {
  // Hand-written to the shape MediaWiki documents for prop=pageimages and
  // prop=imageinfo with formatversion=2 (the live API could not be recorded).
  const pages = {
    query: {
      normalized: [{ from: 'kuala lumpur', to: 'Kuala lumpur' }],
      redirects: [{ from: 'Kuala lumpur', to: 'Kuala Lumpur' }],
      pages: [
        {
          pageid: 1,
          title: 'Kuala Lumpur',
          pageimage: 'KL_skyline.jpg',
          thumbnail: {
            source: 'https://upload.wikimedia.org/thumb/KL_skyline.jpg',
            width: 640,
            height: 427,
          },
        },
        { pageid: 2, title: 'Nowhere' },
      ],
    },
  };
  const info = {
    query: {
      normalized: [{ from: 'File:KL_skyline.jpg', to: 'File:KL skyline.jpg' }],
      pages: [
        {
          title: 'File:KL skyline.jpg',
          imageinfo: [
            {
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:KL_skyline.jpg',
              extmetadata: {
                Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:X">Jane  Doe</a>' },
                LicenseShortName: { value: 'CC BY-SA 4.0' },
              },
            },
          ],
        },
      ],
    },
  };

  it('returns a photo with author and licence, keyed by the title that was asked for', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(new Response(JSON.stringify(url.includes('imageinfo') ? info : pages))),
    );
    vi.stubGlobal('fetch', fetchMock);

    const photos = await getPhotosByTitle(['kuala lumpur', 'Nowhere']);
    expect(photos).toEqual({
      'kuala lumpur': {
        url: 'https://upload.wikimedia.org/thumb/KL_skyline.jpg',
        width: 640,
        height: 427,
        credit: 'Jane Doe',
        license: 'CC BY-SA 4.0',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:KL_skyline.jpg',
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('leaves out a photo that has no licence on record', async () => {
    const noLicence = structuredClone(info);
    delete (noLicence.query.pages[0]!.imageinfo[0]!.extmetadata as Record<string, unknown>)
      .LicenseShortName;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          new Response(JSON.stringify(url.includes('imageinfo') ? noLicence : pages)),
        ),
      ),
    );
    await expect(getPhotosByTitle(['Kuala Lumpur'])).resolves.toEqual({});
  });

  it('strips markup from author names', () => {
    expect(plainText('<span><b>A.</b>  Photographer</span>')).toBe('A. Photographer');
  });
});
