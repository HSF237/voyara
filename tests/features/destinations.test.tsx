import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TripBar } from '@/components/TripBar';
import {
  BANNERS,
  DESTINATIONS,
  findDestination,
  photoAt,
  photoSrcSet,
  THEMES,
} from '@/features/destinations/catalog';
import { InterestTiles } from '@/features/destinations/InterestTiles';
import { TopDestinations } from '@/features/destinations/TopDestinations';
import { freshDraft, useTripDraft } from '@/store/tripDraft';

describe('destination catalogue', () => {
  it('gives every destination a credited, licensed Wikimedia photo', () => {
    const ids = new Set(DESTINATIONS.map((item) => item.id));
    expect(ids.size).toBe(DESTINATIONS.length);
    for (const item of DESTINATIONS) {
      expect(item.photo.url).toMatch(/^https:\/\/thumb\.wikimedia\.org\/.+\/500px-/);
      expect(item.photo.credit.length).toBeGreaterThan(0);
      expect(item.photo.license).toMatch(/^CC/);
      expect(item.photo.sourceUrl).toMatch(
        /^https:\/\/(commons\.wikimedia|en\.wikipedia)\.org\/wiki\/File:/,
      );
      expect(THEMES).toContain(item.theme);
      expect(item.timezone).toBeTruthy();
    }
  });

  it('has several photos to rotate in the banner, and each theme has destinations', () => {
    expect(BANNERS.length).toBeGreaterThanOrEqual(3);
    for (const theme of THEMES) {
      expect(DESTINATIONS.some((item) => item.theme === theme)).toBe(true);
    }
  });

  it('only asks Wikimedia for standard widths no larger than the original', () => {
    const kochi = DESTINATIONS.find((item) => item.id === 'cur:kochi')!;
    expect(kochi.photo.width).toBe(1200);
    expect(photoAt(kochi.photo, 500)).toContain('/500px-');
    expect(photoAt(kochi.photo, 700)).toContain('/960px-');
    // 1280 and 1920 would be upscales, so the largest allowed size is used.
    expect(photoAt(kochi.photo, 1920)).toContain('/960px-');
    expect(
      photoSrcSet(kochi.photo)
        .split(', ')
        .map((part) => part.split(' ')[1]),
    ).toEqual(['500w', '960w']);
  });

  it('matches a picked place to its featured photo by name and country', () => {
    expect(findDestination({ name: 'Tokyo', countryCode: 'JP' })?.id).toBe('cur:tokyo');
    expect(findDestination({ name: 'Tokyo', countryCode: 'US' })).toBeUndefined();
  });
});

describe('TopDestinations', () => {
  const now = new Date('2026-11-14T12:00:00Z');

  it('filters the photo cards by theme and reports the pick', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<TopDestinations title="Popular destinations" onPick={onPick} now={now} />);

    const cards = () => within(screen.getByRole('list')).getAllByRole('button');
    expect(cards()).toHaveLength(12);

    await user.click(screen.getByRole('button', { name: 'Hills' }));
    const hills = DESTINATIONS.filter((item) => item.theme === 'hills');
    expect(hills.length).toBeGreaterThanOrEqual(4);
    await waitFor(() => expect(cards()).toHaveLength(hills.length));

    await user.click(cards()[0]!);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: hills[0]!.id }));
  });

  it('credits each photo with a link to its Wikimedia file page', () => {
    render(<TopDestinations title="Popular destinations" onPick={vi.fn()} now={now} />);
    const credit = screen.getByRole('link', { name: /Renek78/ });
    expect(credit).toHaveAttribute('href', expect.stringContaining('wikimedia.org/wiki/File:'));
  });
});

describe('InterestTiles', () => {
  it('offers illustrated shortcuts that report the interest', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<InterestTiles title="Plan by interest" onPick={onPick} />);
    await user.click(screen.getByRole('button', { name: /Food/ }));
    expect(onPick).toHaveBeenCalledWith('food');
  });
});

describe('TripBar party tabs', () => {
  beforeEach(() => useTripDraft.setState(freshDraft()));

  it('sets the group size, and marks a family trip', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TripBar onSubmit={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: 'Couple' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Family' }));
    expect(useTripDraft.getState().travellers).toBe(4);
    expect(useTripDraft.getState().interests).toContain('family');
    expect(screen.getByRole('button', { name: 'Family' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Solo' }));
    expect(useTripDraft.getState().travellers).toBe(1);
    expect(useTripDraft.getState().interests).not.toContain('family');
  });
});
