import {
  Camera,
  Landmark,
  MapPin,
  Mountain,
  Plus,
  ShoppingBag,
  Trash2,
  Utensils,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { usePageTitle } from '@/app/usePageTitle';
import { useResolvedTheme } from '@/app/useResolvedTheme';
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Card,
  CardText,
  CardTitle,
  Chip,
  IconButton,
  Modal,
  Sheet,
  Skeleton,
  SkeletonText,
  Slider,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  toast,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { useSettings } from '@/store/settings';

/**
 * Developer page: every token and component in one place, for checking the
 * system in light, dark and right-to-left. English only on purpose.
 */

const swatches = [
  { token: 'bg', label: 'Background', className: 'bg-bg' },
  { token: 'surface', label: 'Surface', className: 'bg-surface' },
  { token: 'surface-2', label: 'Surface 2', className: 'bg-surface-2' },
  { token: 'ink', label: 'Ink', className: 'bg-ink' },
  { token: 'muted', label: 'Muted', className: 'bg-muted' },
  { token: 'line', label: 'Line', className: 'bg-line' },
  { token: 'primary', label: 'Primary', className: 'bg-primary' },
  { token: 'primary-soft', label: 'Primary soft', className: 'bg-primary-soft' },
  { token: 'accent', label: 'Accent', className: 'bg-accent' },
  { token: 'accent-soft', label: 'Accent soft', className: 'bg-accent-soft' },
  { token: 'sky', label: 'Sky', className: 'bg-sky' },
  { token: 'sky-soft', label: 'Sky soft', className: 'bg-sky-soft' },
  { token: 'danger', label: 'Danger', className: 'bg-danger' },
  { token: 'danger-soft', label: 'Danger soft', className: 'bg-danger-soft' },
] as const;

const typeScale = [
  { name: '4xl · 64', className: 'font-display text-4xl' },
  { name: '3xl · 48', className: 'font-display text-3xl' },
  { name: '2xl · 32', className: 'font-display text-2xl' },
  { name: 'xl · 24', className: 'font-display text-xl' },
  { name: 'lg · 20', className: 'text-lg' },
  { name: 'base · 16', className: 'text-base' },
  { name: 'sm · 14', className: 'text-sm' },
  { name: 'xs · 12', className: 'text-xs' },
] as const;

const interests = [
  { label: 'Food', icon: <Utensils /> },
  { label: 'Nature', icon: <Mountain /> },
  { label: 'History', icon: <Landmark /> },
  { label: 'Shopping', icon: <ShoppingBag /> },
  { label: 'Photography', icon: <Camera /> },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `ds-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="border-t border-line py-10">
      <h2 id={id} className="font-display text-xl font-medium text-ink">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function DesignSystemPage() {
  usePageTitle('Design system');
  const resolvedTheme = useResolvedTheme();
  const currency = useSettings((state) => state.currency);
  const language = useSettings((state) => state.language);

  const [selected, setSelected] = useState<string[]>(['Food', 'History']);
  const [budget, setBudget] = useState(1200);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSide, setSheetSide] = useState<'bottom' | 'end'>('bottom');

  // Read the live token values so the swatches always show what is on screen.
  const hexValues = useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      swatches.map(({ token }) => [token, styles.getPropertyValue(`--${token}`).trim()]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed when the theme flips
  }, [resolvedTheme]);

  const money = useMemo(
    () =>
      new Intl.NumberFormat(language, { style: 'currency', currency, maximumFractionDigits: 0 }),
    [currency, language],
  );

  function toggleInterest(label: string, on: boolean) {
    setSelected((current) => (on ? [...current, label] : current.filter((item) => item !== label)));
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <Badge tone="info">Developer page</Badge>
      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
        Design system
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Tokens and components that every Voyara screen is built from. Flip the theme or switch to
        Arabic in the header to check dark mode and right-to-left.
      </p>

      <div className="mt-10">
        <Section title="Colour">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {swatches.map((swatch) => (
              <li key={swatch.token}>
                <div className={cn('h-16 rounded-md border border-line', swatch.className)} />
                <p className="mt-2 text-sm font-semibold text-ink">{swatch.label}</p>
                <p className="text-xs text-muted uppercase tabular-nums" dir="ltr">
                  {hexValues[swatch.token]}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Type">
          <ul className="space-y-4">
            {typeScale.map((step) => (
              <li
                key={step.name}
                className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <span className="w-24 shrink-0 text-xs text-muted tabular-nums">{step.name}</span>
                <span className={cn('min-w-0 truncate text-ink', step.className)}>
                  Two days in Kuala Lumpur
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Plan it</Button>
            <Button variant="secondary">Skip to plan</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger" iconStart={<Trash2 className="size-4" aria-hidden="true" />}>
              Delete trip
            </Button>
            <Button disabled>Disabled</Button>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                window.setTimeout(() => setLoading(false), 1600);
              }}
            >
              {loading ? 'Planning…' : 'Press to load'}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <IconButton label="Add a stop" variant="secondary">
              <Plus className="size-5" aria-hidden="true" />
            </IconButton>
          </div>
        </Section>

        <Section title="Chips">
          <div className="flex flex-wrap gap-2.5" role="group" aria-label="Interests">
            {interests.map((interest) => (
              <Chip
                key={interest.label}
                icon={interest.icon}
                selected={selected.includes(interest.label)}
                onSelectedChange={(on) => toggleInterest(interest.label, on)}
              >
                {interest.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap gap-2.5">
            <Badge tone="success" dot>
              Open
            </Badge>
            <Badge tone="warning" dot>
              Closes soon
            </Badge>
            <Badge tone="danger" dot>
              Closed
            </Badge>
            <Badge tone="info">Indoor</Badge>
            <Badge>2 h visit</Badge>
          </div>
        </Section>

        <Section title="Avatars">
          <div className="flex flex-wrap items-center gap-6">
            <Avatar name="Hasan" size="lg" />
            <Avatar name="Aisha Rahman" />
            <Avatar name="Wei Ling" emoji="🦊" />
            <Avatar name="Ravi" size="sm" />
            <AvatarGroup max={4} aria-label="6 people planning">
              <Avatar name="Hasan" />
              <Avatar name="Aisha Rahman" />
              <Avatar name="Wei Ling" emoji="🦊" />
              <Avatar name="Ravi Kumar" />
              <Avatar name="Sara" />
              <Avatar name="Omar" />
            </AvatarGroup>
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardTitle>Static card</CardTitle>
              <CardText>Surface, hairline border, soft shadow, 24px radius.</CardText>
            </Card>
            <Card interactive>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Interactive card</CardTitle>
                  <CardText>Lifts on hover. Used when the whole card is a target.</CardText>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                  <MapPin className="size-5" aria-hidden="true" />
                </span>
              </div>
            </Card>
          </div>
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="day-1">
            <TabList aria-label="Trip days">
              <Tab value="day-1">Day 1</Tab>
              <Tab value="day-2">Day 2</Tab>
              <Tab value="day-3">Day 3</Tab>
            </TabList>
            <TabPanel value="day-1" className="text-sm text-muted">
              Arrow keys move between tabs. Home and End jump to the first and last.
            </TabPanel>
            <TabPanel value="day-2" className="text-sm text-muted">
              The underline slides to the selected tab.
            </TabPanel>
            <TabPanel value="day-3" className="text-sm text-muted">
              In Arabic the arrow keys and the layout mirror.
            </TabPanel>
          </Tabs>
        </Section>

        <Section title="Slider">
          <Slider
            label="Budget"
            min={200}
            max={5000}
            step={50}
            value={budget}
            onValueChange={setBudget}
            formatValue={(value) => money.format(value)}
            className="max-w-md"
          />
        </Section>

        <Section title="Skeleton">
          <div className="flex max-w-md items-start gap-4" role="status">
            <span className="sr-only">Loading…</span>
            <Skeleton className="size-16 shrink-0 rounded-lg" />
            <SkeletonText className="flex-1 pt-1" />
          </div>
        </Section>

        <Section title="Toast, modal and sheet">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => toast({ title: 'Petronas Towers added', tone: 'success' })}
            >
              Success toast
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  title: 'Rain expected 3–5 PM',
                  description: 'An outdoor stop overlaps the forecast.',
                  tone: 'warning',
                  action: { label: 'Swap stop', onClick: () => toast({ title: 'Stop swapped' }) },
                })
              }
            >
              Warning with action
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast({ title: "Couldn't reach the server", tone: 'danger' })}
            >
              Error toast
            </Button>
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button
              onClick={() => {
                setSheetSide('bottom');
                setSheetOpen(true);
              }}
            >
              Bottom sheet
            </Button>
            <Button
              onClick={() => {
                setSheetSide('end');
                setSheetOpen(true);
              }}
            >
              Side sheet
            </Button>
          </div>
        </Section>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Delete this trip?"
        description="Focus is trapped here. Escape or a click outside closes it."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setModalOpen(false);
                toast({ title: 'Nothing was deleted — this is a demo', tone: 'neutral' });
              }}
            >
              Delete
            </Button>
          </>
        }
      />

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        side={sheetSide}
        title={sheetSide === 'end' ? 'Side sheet' : 'Bottom sheet'}
        description={
          sheetSide === 'end'
            ? 'Opens from the trailing edge: right in English, left in Arabic.'
            : 'Drag the handle down to dismiss, or press Escape.'
        }
      >
        <div className="space-y-3">
          <Chip selected>Relaxed</Chip>
          <SkeletonText lines={4} />
          <Button fullWidth onClick={() => setSheetOpen(false)}>
            Done
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
