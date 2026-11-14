import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tab, TabList, TabPanel, Tabs } from '@/components/ui';

function Example({
  rtl = false,
  onValueChange,
}: {
  rtl?: boolean;
  onValueChange?: (v: string) => void;
}) {
  return (
    <Tabs defaultValue="one" onValueChange={onValueChange}>
      <TabList aria-label="Trip days" style={rtl ? { direction: 'rtl' } : undefined}>
        <Tab value="one">Day 1</Tab>
        <Tab value="two">Day 2</Tab>
        <Tab value="three">Day 3</Tab>
      </TabList>
      <TabPanel value="one">Panel one</TabPanel>
      <TabPanel value="two">Panel two</TabPanel>
      <TabPanel value="three">Panel three</TabPanel>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('links tabs and panels for screen readers', () => {
    render(<Example />);
    const tab = screen.getByRole('tab', { name: 'Day 1' });
    const panel = screen.getByRole('tabpanel');
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(tab).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    expect(panel).toHaveTextContent('Panel one');
  });

  it('keeps only the selected tab in the Tab order', () => {
    render(<Example />);
    expect(screen.getByRole('tab', { name: 'Day 1' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Day 2' })).toHaveAttribute('tabindex', '-1');
  });

  it('moves with arrow keys, Home and End, wrapping at the ends', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);

    await user.tab();
    expect(screen.getByRole('tab', { name: 'Day 1' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Day 2' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel two');

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Day 3' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Day 1' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Day 3' })).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Day 1' })).toHaveAttribute('aria-selected', 'true');
    expect(onValueChange).toHaveBeenLastCalledWith('one');
  });

  it('mirrors the arrow keys in right-to-left layouts', async () => {
    const user = userEvent.setup();
    render(<Example rtl />);
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Day 2' })).toHaveAttribute('aria-selected', 'true');
  });
});
