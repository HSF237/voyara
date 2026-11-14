import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Avatar,
  AvatarGroup,
  Button,
  Chip,
  clearToasts,
  IconButton,
  Segmented,
  Slider,
  toast,
  Toaster,
} from '@/components/ui';
import { initialsOf } from '@/components/ui/avatar.utils';

describe('Button', () => {
  it('blocks clicks and reports busy while loading', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Plan it
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Plan it' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('gives icon-only buttons an accessible name', () => {
    render(<IconButton label="Add a stop">+</IconButton>);
    expect(screen.getByRole('button', { name: 'Add a stop' })).toBeInTheDocument();
  });
});

describe('Chip', () => {
  it('toggles and announces its pressed state', async () => {
    const user = userEvent.setup();
    function Example() {
      const [on, setOn] = useState(false);
      return (
        <Chip selected={on} onSelectedChange={setOn}>
          Food
        </Chip>
      );
    }
    render(<Example />);
    const chip = screen.getByRole('button', { name: 'Food' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    chip.focus();
    await user.keyboard(' ');
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Slider', () => {
  it('exposes the formatted value to assistive tech', () => {
    const onValueChange = vi.fn();
    render(
      <Slider
        label="Budget"
        min={0}
        max={1000}
        step={50}
        value={500}
        onValueChange={onValueChange}
        formatValue={(value) => `RM ${value}`}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Budget' });
    expect(slider).toHaveAttribute('aria-valuetext', 'RM 500');
    expect(slider.style.getPropertyValue('--fill')).toBe('50%');
    fireEvent.change(slider, { target: { value: '650' } });
    expect(onValueChange).toHaveBeenCalledWith(650);
  });
});

describe('Segmented', () => {
  it('behaves as a radio group', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Segmented
        label="Theme"
        value="light"
        onValueChange={onValueChange}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />,
    );
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(onValueChange).toHaveBeenCalledWith('dark');
  });
});

describe('Avatar', () => {
  it('falls back to initials and is named after the person', () => {
    expect(initialsOf('Aisha Rahman')).toBe('AR');
    expect(initialsOf('hasan')).toBe('H');
    expect(initialsOf('  ')).toBe('?');
    render(<Avatar name="Aisha Rahman" />);
    expect(screen.getByRole('img', { name: 'Aisha Rahman' })).toHaveTextContent('AR');
  });

  it('collapses extra people into a counter', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar name="A" />
        <Avatar name="B" />
        <Avatar name="C" />
        <Avatar name="D" />
      </AvatarGroup>,
    );
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});

describe('Toast', () => {
  afterEach(() => {
    act(() => clearToasts());
    vi.useRealTimers();
  });

  it('announces politely, and errors assertively', () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Petronas Towers added', tone: 'success' });
      toast({ title: 'Could not save', tone: 'danger' });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Petronas Towers added');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('can be dismissed by hand', async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Saved', duration: 0 });
    });
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.queryByText('Saved')).not.toBeInTheDocument());
  });

  it('disappears on its own after its duration', async () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Gone soon', duration: 1000 });
    });
    expect(screen.getByText('Gone soon')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    vi.useRealTimers();
    await waitFor(() => expect(screen.queryByText('Gone soon')).not.toBeInTheDocument());
  });
});
