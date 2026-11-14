import { ArrowRight } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { paths } from '@/app/paths';
import { usePageTitle } from '@/app/usePageTitle';
import { onIdle } from '@/lib/onIdle';
import { Hero } from './Hero';

const StorySection = lazy(() => import('./StorySection'));

export function LandingPage() {
  const { t } = useTranslation();
  usePageTitle();
  const sentinel = useRef<HTMLDivElement>(null);
  const [showStory, setShowStory] = useState(false);

  // The story is below the fold: fetch it once the browser is idle, or as soon
  // as someone scrolls towards it, whichever comes first.
  useEffect(() => {
    const show = () => setShowStory(true);
    const cancelIdle = onIdle(show, 2500);
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => entries.some((entry) => entry.isIntersecting) && show(),
            { rootMargin: '600px' },
          )
        : null;
    if (sentinel.current) observer?.observe(sentinel.current);
    return () => {
      cancelIdle();
      observer?.disconnect();
    };
  }, []);

  return (
    <>
      <Hero />
      <div ref={sentinel} />
      {showStory ? (
        <Suspense fallback={<div className="min-h-[40rem]" />}>
          <StorySection />
        </Suspense>
      ) : (
        <div className="min-h-[40rem]" />
      )}
      <section className="container-page pb-20 sm:pb-28">
        <div className="relative overflow-hidden rounded-xl bg-primary px-6 py-12 text-center text-on-primary sm:px-12 sm:py-16">
          <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
            {t('home.final.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-lg opacity-90">{t('home.final.body')}</p>
          <Link
            to={paths.setup}
            className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-full bg-surface px-7 text-base font-semibold text-ink shadow-md transition-transform hover:-translate-y-0.5 focus-visible:outline-on-primary"
          >
            {t('nav.plan')}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
