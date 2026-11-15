import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Sparkles, Undo2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderMark } from '@/components/Loader';
import type { Trip, TripPicks } from '@/features/trip/model';
import { cn } from '@/lib/cn';
import { applyEdits } from '@/planner/edit';
import type { Plan } from '@/planner/types';
import { requestEdit } from '@/services/planner';
import { useTrips } from '@/store/trips';

const SUGGESTIONS = ['s1', 's2', 's3'] as const;

type AskVoyaraProps = {
  trip: Trip;
  picks: TripPicks;
  plan: Plan;
  /** 1-based number of the day on screen, so "this day" means something. */
  currentDay: number;
  rainChance: (date: string) => number | null | undefined;
};

/**
 * Change the plan in plain words. The AI proposes a few operations (move, add,
 * remove, swap days); the app checks and applies them, re-times the days, and
 * keeps the previous plan so one tap undoes it.
 */
export function AskVoyara({ trip, picks, plan, currentDay, rainChance }: AskVoyaraProps) {
  const { t, i18n } = useTranslation();
  const savePlan = useTrips((state) => state.savePlan);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{
    reply: string;
    changes: number;
    before?: Plan;
    failed?: boolean;
  }>();

  async function ask(request: string) {
    const wanted = request.trim();
    if (wanted.length < 2 || busy) return;
    setBusy(true);
    setAnswer(undefined);
    try {
      const { reply, ops } = await requestEdit(trip, picks, plan, {
        request: wanted,
        currentDay,
        language: i18n.language.slice(0, 2),
        rainChance,
      });
      const result = applyEdits(plan, ops, picks.places, trip.pace);
      if (result.applied > 0) savePlan(trip.id, result.plan);
      // The AI's words are shown only when its changes really went through: otherwise it
      // could say "moved X" about a change the app refused.
      setAnswer(
        result.applied > 0
          ? { reply, changes: result.applied, before: plan }
          : { reply: t('ask.nothing'), changes: 0 },
      );
      setText('');
    } catch {
      setAnswer({ reply: t('ask.failed'), changes: 0, failed: true });
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(text);
  }

  return (
    <section
      aria-labelledby="ask-title"
      className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5"
    >
      <h2 id="ask-title" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-primary-ink">
          <Sparkles className="size-3.5" aria-hidden="true" />
        </span>
        {t('ask.title')}
      </h2>

      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <label htmlFor="ask-input" className="sr-only">
          {t('ask.placeholder')}
        </label>
        <input
          id="ask-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('ask.placeholder')}
          maxLength={300}
          autoComplete="off"
          enterKeyHint="send"
          disabled={busy}
          className="h-12 min-w-0 flex-1 rounded-full border border-line-strong bg-bg px-5 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label={t('ask.send')}
          disabled={busy || text.trim().length < 2}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-on-primary transition-opacity disabled:opacity-40"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            onClick={() => void ask(t(`ask.${key}`))}
            className="inline-flex min-h-9 items-center rounded-full border border-line bg-bg px-3.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {t(`ask.${key}`)}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        <AnimatePresence mode="wait">
          {busy && (
            <motion.p
              key="busy"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-3 text-sm text-muted"
            >
              <LoaderMark className="size-6" />
              {t('ask.thinking')}
            </motion.p>
          )}
          {!busy && answer && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'mt-4 flex items-start gap-3 rounded-lg px-4 py-3 text-sm text-ink',
                answer.failed ? 'bg-danger-soft' : 'bg-primary-soft',
              )}
            >
              <p className="min-w-0 flex-1">
                {answer.reply}
                {answer.changes > 0 && (
                  <span className="ms-2 font-semibold whitespace-nowrap text-primary-ink">
                    {t('ask.changed', { count: answer.changes })}
                  </span>
                )}
              </p>
              {answer.before && (
                <button
                  type="button"
                  onClick={() => {
                    if (answer.before) savePlan(trip.id, answer.before);
                    setAnswer(undefined);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink shadow-sm"
                >
                  <Undo2 className="size-3.5" aria-hidden="true" />
                  {t('ask.undo')}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
